/**
 * Pitch detection by the McLeod pitch method (P. McLeod and G. Wyvill, "A smarter way to
 * find pitch", ICMC 2005): the normalised square difference function of a ~40 ms window,
 * then the first of its key maxima that comes close to the highest one, refined by a
 * parabola, unless that was a harmonic (`HARMONIC_LEAD`). The autocorrelation goes through
 * an FFT, so a window costs a few hundred thousand operations. Pure (no DOM), so it is tested
 * in Node with synthetic voices.
 */
import { fft, type FFT } from './fft';

export interface PitchReading {
  /** The pitch, or 0 when there is none: silence, noise or an unclear sound. */
  hz: number;
  /** How periodic the window is, 0–1 (the NSDF peak). */
  clarity: number;
  /** Loudness of the window (root mean square, full scale = 1). */
  rms: number;
}

export interface DetectorOptions {
  /** The lowest and highest pitches looked for, Hz. */
  minHz: number;
  maxHz: number;
  /** McLeod's k: the first key maximum reaching k × the highest one is the period. */
  k: number;
  /** Quieter windows count as silence. */
  minRms: number;
  /** Less periodic windows count as unclear. */
  minClarity: number;
}

/** Singing range with room to spare: a low male mandra Sa (C2, 65 Hz) to a high soprano. */
export const DETECTOR_DEFAULTS: DetectorOptions = { minHz: 60, maxHz: 1500, k: 0.9, minRms: 0.002, minClarity: 0.75 };

/**
 * A key maximum at 2, 3 or 4 times the period chosen that is this much higher than it is the
 * period: the one chosen was a harmonic (Rinat, 2026-10-21: "the voice line still jumps, but not
 * as much"). A low voice sung loud can have its 2nd or 3rd harmonic 20 to 30 dB above the
 * fundamental (Rinat's takes: 33 dB at 231 Hz; 24 dB at 158 Hz, on "o"), so the window is nearly
 * periodic at a half or a third of its period too, and McLeod's rule took that for up to 1.4 s.
 * At the true period a voice's higher multiples are no higher than it, give or take 0.006 in
 * those takes. Played through the detector, the two takes' readings more than 600 cents from
 * their notes went from 181 and 270 to 22 and 85.
 */
export const HARMONIC_LEAD = 0.02;
/** How far from an exact multiple of the period chosen a key maximum may be, as a share of it. */
const HARMONIC_NEAR = 0.04;

/** The analysis window for a sample rate: about 40 ms, a power of two (2048 at 44.1 and 48 kHz). */
export function windowSize(sampleRate: number): number {
  let n = 256;
  while (n < sampleRate * 0.04) n <<= 1;
  return n;
}

export class PitchDetector {
  private readonly plan: FFT;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly x: Float64Array;
  private readonly nsdf: Float64Array;
  private readonly minLag: number;
  private readonly maxLag: number;

  constructor(
    readonly size: number,
    readonly sampleRate: number,
    readonly opts: DetectorOptions = DETECTOR_DEFAULTS,
  ) {
    this.minLag = Math.max(2, Math.floor(sampleRate / opts.maxHz));
    this.maxLag = Math.min(size - 2, Math.ceil(sampleRate / opts.minHz));
    let m = 2;
    while (m < size + this.maxLag + 1) m <<= 1;
    this.plan = fft(m);
    this.re = new Float64Array(m);
    this.im = new Float64Array(m);
    this.x = new Float64Array(size);
    this.nsdf = new Float64Array(this.maxLag + 2);
  }

  /** The pitch of one window of `size` samples. */
  detect(frame: ArrayLike<number>): PitchReading {
    const { size: N, re, im, x, nsdf, maxLag, minLag } = this;
    let mean = 0;
    for (let i = 0; i < N; i++) mean += frame[i]!;
    mean /= N;
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const v = frame[i]! - mean;
      x[i] = v;
      energy += v * v;
    }
    const rms = Math.sqrt(energy / N);
    if (!(rms >= this.opts.minRms)) return { hz: 0, clarity: 0, rms };

    // Autocorrelation r(τ) = IFFT(|FFT(x)|²), zero-padded so lags up to maxLag do not wrap.
    re.fill(0);
    im.fill(0);
    re.set(x);
    this.plan.transform(re, im);
    for (let i = 0; i < re.length; i++) {
      re[i] = re[i]! * re[i]! + im[i]! * im[i]!;
      im[i] = 0;
    }
    this.plan.transform(re, im, true);

    // NSDF n(τ) = 2 r(τ) / m(τ), with m(τ) = Σ x_j² + x_{j+τ}² over the overlap.
    let m = 2 * energy;
    for (let t = 0; t <= maxLag + 1; t++) {
      if (t > 0) m -= x[t - 1]! * x[t - 1]! + x[N - t]! * x[N - t]!;
      nsdf[t] = m > 1e-12 ? (2 * re[t]!) / m : 0;
    }

    // Key maxima: the highest point of each positive lobe after the first zero crossing.
    const keys: number[] = [];
    let t = 1;
    while (t <= maxLag && nsdf[t]! > 0) t++;
    while (t <= maxLag) {
      while (t <= maxLag && nsdf[t]! <= 0) t++;
      if (t > maxLag) break;
      let best = t;
      while (t <= maxLag && nsdf[t]! > 0) {
        if (nsdf[t]! > nsdf[best]!) best = t;
        t++;
      }
      // A lobe cut off at the end of the range only counts if its top is inside it.
      if (best >= minLag && best < maxLag && nsdf[best + 1]! < nsdf[best]!) keys.push(best);
    }
    if (!keys.length) return { hz: 0, clarity: 0, rms };
    let top = 0;
    for (const k of keys) top = Math.max(top, nsdf[k]!);
    let pick = this.peak(keys.find((k) => nsdf[k]! >= this.opts.k * top)!);
    // A clearly higher key maximum at a multiple of it: that was a harmonic. Checked again from
    // there, so a 4th harmonic goes to the 2nd, then to the voice.
    for (let found = true; found;) {
      found = false;
      for (let m = 2; m <= 4 && !found; m++) {
        for (const k of keys) {
          const q = this.peak(k);
          if (Math.abs(q.lag - m * pick.lag) <= HARMONIC_NEAR * m * pick.lag && q.v > pick.v + HARMONIC_LEAD) {
            pick = q;
            found = true;
            break;
          }
        }
      }
    }
    const clarity = pick.v;
    const hz = this.sampleRate / pick.lag;
    if (clarity < this.opts.minClarity || hz < this.opts.minHz || hz > this.opts.maxHz) return { hz: 0, clarity, rms };
    return { hz, clarity, rms };
  }

  /** A key maximum's period between samples and its height: a parabola through the peak and
   * its neighbours. */
  private peak(t: number): { lag: number; v: number } {
    const a = this.nsdf[t - 1]!;
    const b = this.nsdf[t]!;
    const c = this.nsdf[t + 1]!;
    const den = a - 2 * b + c;
    const shift = den < 0 ? (0.5 * (a - c)) / den : 0;
    return { lag: t + shift, v: Math.min(1, den < 0 ? b - 0.25 * (a - c) * shift : b) };
  }
}

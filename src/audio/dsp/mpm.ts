/**
 * Pitch detection by the McLeod pitch method (P. McLeod and G. Wyvill, "A smarter way to
 * find pitch", ICMC 2005): the normalised square difference function of a ~40 ms window,
 * then the first of its key maxima that comes close to the highest one, refined by a
 * parabola. The autocorrelation goes through an FFT, so a window costs a few hundred
 * thousand operations. Pure (no DOM), so it is tested in Node with synthetic voices.
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
    const pick = keys.find((k) => nsdf[k]! >= this.opts.k * top)!;

    // A parabola through the peak and its neighbours gives the period between samples.
    const a = nsdf[pick - 1]!;
    const b = nsdf[pick]!;
    const c = nsdf[pick + 1]!;
    const den = a - 2 * b + c;
    const shift = den < 0 ? (0.5 * (a - c)) / den : 0;
    const clarity = Math.min(1, den < 0 ? b - 0.25 * (a - c) * shift : b);
    const hz = this.sampleRate / (pick + shift);
    if (clarity < this.opts.minClarity || hz < this.opts.minHz || hz > this.opts.maxHz) return { hz: 0, clarity, rms };
    return { hz, clarity, rms };
  }
}

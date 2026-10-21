// The pitch detector on synthetic voices: within a few cents across the singing range.
import { describe, expect, it } from 'vitest';
import { fft } from '../../src/audio/dsp/fft';
import { PitchDetector, windowSize } from '../../src/audio/dsp/mpm';
import { seeded } from '../helpers';

const cents = (f: number, ref: number) => 1200 * Math.log2(f / ref);

/** A sung-like tone: harmonics with given strengths, a vowel-ish emphasis around 700 Hz,
 * optional vibrato (depth in cents, rate in Hz) and white noise at a signal-to-noise ratio. */
function tone(f: number, sr: number, n: number, o: { harmonics?: number[]; vibrato?: [number, number]; snrDb?: number; seed?: number; phase?: number } = {}): Float32Array {
  const rand = seeded(o.seed ?? 1);
  const hs = o.harmonics ?? Array.from({ length: 24 }, (_, i) => (1 / (i + 1)) * (1 + 1.5 * Math.exp(-(((i + 1) * f - 700) ** 2) / (2 * 250 ** 2))));
  const out = new Float32Array(n);
  let phase = o.phase ?? 0;
  for (let i = 0; i < n; i++) {
    const vib = o.vibrato ? Math.pow(2, (o.vibrato[0] * Math.sin((2 * Math.PI * o.vibrato[1] * i) / sr)) / 1200) : 1;
    phase += (2 * Math.PI * f * vib) / sr;
    let v = 0;
    hs.forEach((a, h) => {
      if ((h + 1) * f < sr / 2) v += a * Math.sin((h + 1) * phase);
    });
    out[i] = v;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  let power = 0;
  for (let i = 0; i < n; i++) {
    out[i] = (out[i]! / peak) * 0.3;
    power += out[i]! ** 2;
  }
  if (o.snrDb != null) {
    const noise = Math.sqrt(power / n / 10 ** (o.snrDb / 10)) * Math.sqrt(3);
    for (let i = 0; i < n; i++) out[i] = out[i]! + (rand() * 2 - 1) * noise;
  }
  return out;
}

// Sa in each octave a singer might use, and the notes around them: C2 (a low male mandra Sa) to C6.
const FREQS = [65.41, 73.42, 82.41, 98, 110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.26, 783.99, 880, 1046.5];

describe('FFT', () => {
  it('matches a plain DFT, forwards and back', () => {
    const rand = seeded(4);
    for (const n of [8, 64, 1024]) {
      const re = Float64Array.from({ length: n }, () => rand() * 2 - 1);
      const im = Float64Array.from({ length: n }, () => rand() * 2 - 1);
      const [r0, i0] = [re.slice(), im.slice()];
      fft(n).transform(re, im);
      let worst = 0;
      for (const k of [0, 1, n / 2 - 1, n / 2, n - 1]) {
        let sr = 0;
        let si = 0;
        for (let j = 0; j < n; j++) {
          const w = (-2 * Math.PI * j * k) / n;
          sr += r0[j]! * Math.cos(w) - i0[j]! * Math.sin(w);
          si += r0[j]! * Math.sin(w) + i0[j]! * Math.cos(w);
        }
        worst = Math.max(worst, Math.abs(sr - re[k]!), Math.abs(si - im[k]!));
      }
      expect(worst).toBeLessThan(1e-9);
      fft(n).transform(re, im, true);
      for (let j = 0; j < n; j++) expect(Math.abs(re[j]! - r0[j]!) + Math.abs(im[j]! - i0[j]!)).toBeLessThan(1e-12);
    }
    expect(() => fft(100)).toThrow();
  });
});

describe('pitch detector (McLeod)', () => {
  it('uses a window of about 40 ms', () => {
    expect([16000, 44100, 48000, 96000].map(windowSize)).toEqual([1024, 2048, 2048, 4096]);
  });

  for (const sr of [44100, 48000]) {
    it('reads pure tones within 1 cent and sung-like tones within 2, C2 to C6, at ' + sr + ' Hz', () => {
      const N = windowSize(sr);
      const d = new PitchDetector(N, sr);
      let worstSine = 0;
      let worstVoice = 0;
      for (const f of FREQS) {
        for (const phase of [0, 1.3]) {
          const sine = d.detect(tone(f, sr, N, { harmonics: [1], phase }));
          const voice = d.detect(tone(f, sr, N, { phase }));
          worstSine = Math.max(worstSine, Math.abs(cents(sine.hz, f)));
          worstVoice = Math.max(worstVoice, Math.abs(cents(voice.hz, f)));
          expect(voice.clarity).toBeGreaterThan(0.9);
        }
      }
      expect(worstSine).toBeLessThan(1);
      expect(worstVoice).toBeLessThan(2);
    });
  }

  it('is not fooled into the octave above when the fundamental is weak', () => {
    const sr = 48000;
    const d = new PitchDetector(2048, sr);
    for (const f of [98, 130.81, 196, 261.63, 392]) {
      const r = d.detect(tone(f, sr, 2048, { harmonics: [0.15, 1, 0.6, 0.4, 0.3, 0.2] }));
      expect(Math.abs(cents(r.hz, f))).toBeLessThan(3);
    }
  });

  it('takes the voice, not its 2nd or 3rd harmonic, when that harmonic is 20 to 30 dB above it', () => {
    // Rinat's takes of 2026-10-21, sung loud: at 231 Hz the 2nd harmonic 33 dB above the
    // fundamental; at 158 Hz, on "o", the 3rd 24 dB above it. McLeod's rule alone (the first key
    // maximum within 0.9 of the highest) read both as the harmonic: the voice line's jumps.
    const dB = (v: number[]) => v.map((x) => 10 ** (x / 20));
    const voices: [number, number[]][] = [
      [231, dB([-33, 0, -17, -22, -17, -27, -41, -13])],
      [158, dB([-24, -21, 0, -17, -23, -23, -21, -40])],
    ];
    for (const sr of [44100, 48000]) {
      const N = windowSize(sr);
      const d = new PitchDetector(N, sr);
      for (const [f, harmonics] of voices) {
        for (const phase of [0, 1.3]) {
          expect(Math.abs(cents(d.detect(tone(f, sr, N, { harmonics, phase })).hz, f))).toBeLessThan(3);
          for (const seed of [1, 2]) {
            const r = d.detect(tone(f, sr, N, { harmonics, phase, vibrato: [25, 5.5], snrDb: 30, seed }));
            expect(Math.abs(cents(r.hz, f))).toBeLessThan(30);
          }
        }
      }
    }
  });

  it('leaves a high voice where it is: the pitch those harmonics had, sung', () => {
    const sr = 44100;
    const d = new PitchDetector(2048, sr);
    for (const f of [316, 462, 474, 690]) {
      for (const phase of [0, 1.3]) {
        expect(Math.abs(cents(d.detect(tone(f, sr, 2048, { phase })).hz, f))).toBeLessThan(2);
        const r = d.detect(tone(f, sr, 2048, { phase, vibrato: [25, 5.5], snrDb: 30, seed: 3 }));
        expect(Math.abs(cents(r.hz, f))).toBeLessThan(30);
      }
    }
  });

  it('copes with a noisy room (20 dB below the voice) and vibrato', () => {
    const sr = 48000;
    const d = new PitchDetector(2048, sr);
    let worst = 0;
    for (const f of FREQS.slice(3)) {
      for (const seed of [1, 2, 3]) {
        const r = d.detect(tone(f, sr, 2048, { snrDb: 20, seed }));
        worst = Math.max(worst, Math.abs(cents(r.hz, f)));
      }
    }
    expect(worst).toBeLessThan(5);
    // Vibrato of ±30 cents at 5.5 Hz: each window reads somewhere inside the swing.
    for (let k = 0; k < 8; k++) {
      const r = d.detect(tone(220, sr, 2048, { vibrato: [30, 5.5], phase: k }).subarray(0, 2048));
      expect(Math.abs(cents(r.hz, 220))).toBeLessThan(32);
    }
  });

  it('reports nothing for silence, a whisper of hiss or plain noise', () => {
    const d = new PitchDetector(2048, 48000);
    expect(d.detect(new Float32Array(2048)).hz).toBe(0);
    const rand = seeded(9);
    const hiss = Float32Array.from({ length: 2048 }, () => (rand() * 2 - 1) * 0.001);
    expect(d.detect(hiss).hz).toBe(0);
    let found = 0;
    for (let s = 0; s < 20; s++) {
      const r2 = seeded(s + 100);
      if (d.detect(Float32Array.from({ length: 2048 }, () => (r2() * 2 - 1) * 0.3)).hz) found++;
    }
    expect(found).toBeLessThanOrEqual(1);
  });

  it('is fast enough for 45 windows a second with room to spare', () => {
    const d = new PitchDetector(2048, 48000);
    const frame = tone(196, 48000, 2048);
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) d.detect(frame);
    const per = (performance.now() - t0) / 200;
    expect(per).toBeLessThan(2);
  });
});

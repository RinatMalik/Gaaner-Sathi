// Ported one-for-one from reference/tests/tanpura.test.js: same frequencies, same checks
// (tuning within 3 cents, finite output, level falling over time). The reference used
// Math.random for the pluck; this uses a seeded generator so runs are repeatable.
import { describe, expect, it } from 'vitest';
import { ksPluck } from '../../src/audio/dsp/ksPluck';
import { seeded } from '../helpers';

const sr = 48000;
/** Autocorrelation peak near the expected period, refined with a parabola. */
function pitch(x: Float32Array, a: number, b: number, f0: number) {
  const seg = x.subarray(a, b);
  const N = seg.length;
  const lo = Math.floor(sr / (f0 * 1.06));
  const hi = Math.ceil(sr / (f0 * 0.94));
  let best = -1;
  let bl = lo;
  const vals: number[] = [];
  for (let l = lo - 1; l <= hi + 1; l++) {
    let s = 0;
    for (let i = 0; i + l < N; i++) s += seg[i]! * seg[i + l]!;
    vals[l] = s;
    if (l >= lo && l <= hi && s > best) {
      best = s;
      bl = l;
    }
  }
  const y0 = vals[bl - 1]!;
  const y1 = vals[bl]!;
  const y2 = vals[bl + 1]!;
  const d = (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2);
  return sr / (bl + d);
}
const rms = (x: Float32Array, a: number, b: number) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / (b - a));
};
const db = (v: number) => 20 * Math.log10(v + 1e-12);

function measure(f: number, seed: number) {
  const x = ksPluck(f, sr, 5, seeded(seed));
  const p = pitch(x, Math.floor(sr * 0.5), Math.floor(sr * 1.0), f);
  const cents = 1200 * Math.log2(p / f);
  const levels = [rms(x, 0, sr * 0.3), rms(x, sr * 1.5, sr * 1.8), rms(x, sr * 3.5, sr * 3.8)].map(db);
  return { x, p, cents, levels };
}

describe('tanpura string (reference suite)', () => {
  for (const f of [98.0, 130.81, 196.0, 261.63, 293.66]) {
    it(`${f} Hz: in tune within 3 cents, finite, decaying`, () => {
      const { x, cents, levels } = measure(f, Math.round(f * 100));
      expect(Math.abs(cents)).toBeLessThan(3);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(levels[0]!).toBeGreaterThan(levels[1]!);
      expect(levels[1]!).toBeGreaterThan(levels[2]!);
    });
  }
});

// docs/ENGINE.md's measured figures: pitch error under about 0.05 cents; level about −16 dB
// at 1.5 s and −33 dB at 3.5 s relative to the attack. Over 100 seeded plucks the port
// measured a worst error of 0.054 cents and ranges of −18.6…−14.5 dB and −37.2…−30.1 dB;
// these bounds leave a margin around those.
describe('tanpura string (added cases)', () => {
  for (const f of [98.0, 130.81, 196.0, 261.63, 293.66]) {
    it(`${f} Hz: within 0.1 cents; decays like ENGINE.md says`, () => {
      const { cents, levels } = measure(f, Math.round(f * 100));
      expect(Math.abs(cents)).toBeLessThan(0.1);
      const at15 = levels[1]! - levels[0]!;
      const at35 = levels[2]! - levels[0]!;
      expect(at15).toBeGreaterThan(-21);
      expect(at15).toBeLessThan(-12);
      expect(at35).toBeGreaterThan(-40);
      expect(at35).toBeLessThan(-26);
    });
  }
});

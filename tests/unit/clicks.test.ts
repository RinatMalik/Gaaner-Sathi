// Measuring the device's delay from clicks played and heard (src/audio/dsp/clicks.ts; Rinat,
// 2026-10-19).
import { describe, expect, it } from 'vitest';
import { CLICK_GAP, CLICKS, clickDelays, clickSamples, roundTrip } from '../../src/audio/dsp/clicks';

const sr = 48000;

/** A recording from t0: noise, mains hum and a low hummed voice, with the clicks played at
 * `clicks` coming back `delay` later, quieter and dulled (as through an earphone held to a
 * microphone), those in `lost` not at all. */
function recording(t0: number, clicks: number[], delay: number, o: { gain?: number; lost?: number[]; noise?: number } = {}): Float32Array {
  const len = Math.ceil((clicks[clicks.length - 1]! + 1 - t0) * sr);
  const x = new Float32Array(len);
  let s = 99;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32 - 0.5) * 2;
  for (let i = 0; i < len; i++) {
    const t = t0 + i / sr;
    x[i] = (o.noise ?? 0.002) * rnd() + 0.02 * Math.sin(2 * Math.PI * 50 * t) + 0.05 * Math.sin(2 * Math.PI * 147 * t);
  }
  const c = clickSamples(sr);
  clicks.forEach((ct, k) => {
    if (o.lost?.includes(k)) return;
    const at = Math.round((ct + delay - t0) * sr);
    let y = 0;
    for (let j = 0; j < c.length && at + j < len; j++) {
      y = 0.6 * y + 0.4 * c[j]!;
      x[at + j]! += (o.gain ?? 0.08) * y;
    }
  });
  return x;
}

const times = (t0: number) => Array.from({ length: CLICKS }, (_, k) => t0 + 0.5 + k * CLICK_GAP);

describe('the device’s delay from clicks', () => {
  it('finds each click’s delay to within a sample or two', () => {
    const t0 = 3.217;
    const clicks = times(t0);
    for (const delay of [0.012, 0.047, 0.183, 0.42]) {
      const ds = clickDelays(recording(t0, clicks, delay), sr, t0, clicks);
      expect(ds.every((d) => d != null && Math.abs(d - delay) < 0.0005)).toBe(true);
      const r = roundTrip(ds);
      expect(r.heard).toBe(CLICKS);
      expect(Math.abs(r.delay! - delay)).toBeLessThan(0.0005);
    }
  });

  it('hears quiet clicks, and leaves out the ones that never came back', () => {
    const t0 = 0.5;
    const clicks = times(t0);
    const ds = clickDelays(recording(t0, clicks, 0.06, { gain: 0.03, lost: [2, 5] }), sr, t0, clicks);
    expect(ds.map((d) => d == null)).toEqual([false, false, true, false, false, true, false, false]);
    expect(Math.abs(roundTrip(ds).delay! - 0.06)).toBeLessThan(0.0005);
  });

  it('gives no delay when too few clicks were heard or they disagree', () => {
    const t0 = 0;
    const clicks = times(t0);
    const lost = clickDelays(recording(t0, clicks, 0.05, { lost: [0, 1, 2, 3] }), sr, t0, clicks);
    expect(roundTrip(lost)).toEqual({ delay: null, heard: 4 });
    // Nothing but noise: nothing heard.
    expect(roundTrip(clickDelays(recording(t0, clicks, 0.05, { lost: [0, 1, 2, 3, 4, 5, 6, 7] }), sr, t0, clicks)).heard).toBe(0);
    expect(roundTrip([0.05, 0.051, 0.12, 0.05, 0.2, 0.3, 0.05])).toEqual({ delay: null, heard: 7 });
    expect(roundTrip([0.05, 0.051, 0.049, 0.05, 0.3])).toEqual({ delay: 0.05, heard: 5 });
  });
});

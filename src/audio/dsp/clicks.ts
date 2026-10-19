/**
 * Measuring the device's delay (Rinat, 2026-10-19): the app plays clicks and listens for them
 * through the microphone (an earphone held to it, or the speakers), and the time from each
 * click's scheduled moment to its first sound in the recording is the delay of sound out and
 * back in, on the AudioContext clock. Pure, so it is tested in Node; src/audio/latency.ts
 * plays and records.
 */

/** How many clicks, how far apart, and how long after each one it may come back (seconds). */
export const CLICKS = 8;
export const CLICK_GAP = 0.6;
export const MAX_DELAY = 0.5;

/** A click: 4 ms of noise falling away fast, so it starts sharply and carries every frequency
 * (any earphone and any microphone pass some). Seeded, so it is the same each time. */
export function clickSamples(sr: number): Float32Array {
  const n = Math.round(sr * 0.004);
  const x = new Float32Array(n);
  let s = 12345;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    x[i] = (s / 2 ** 32 - 0.5) * 2 * Math.exp(-i / (n / 4));
  }
  return x;
}

/** How much of the recording's start to leave out of the noise (the microphone settling). */
export const SETTLE = 0.1;

/**
 * Each click's delay, or null where it was not heard: `rec` is the recording from `t0`
 * (seconds) at `sr`; `clicks` the times the clicks were played, the first at least 0.3 s after
 * `t0`. The recording is first differenced (hum and a low voice fall away, a click stays). The
 * noise is the quiet before the first click (from `SETTLE` in, to 20 ms before it): its
 * loudest but for a stray few samples. A click is heard when its window's loudest sample is at
 * least twice that, and comes back at the first sample a third as loud as its loudest (and
 * half as loud again as the noise).
 */
export function clickDelays(rec: Float32Array, sr: number, t0: number, clicks: readonly number[], maxDelay = MAX_DELAY): (number | null)[] {
  const d = new Float32Array(rec.length);
  for (let i = 1; i < rec.length; i++) d[i] = Math.abs(rec[i]! - rec[i - 1]!);
  const at = (t: number) => Math.max(1, Math.min(rec.length, Math.round((t - t0) * sr)));
  const quiet = Array.from(d.subarray(at(t0 + SETTLE), at((clicks[0] ?? t0) - 0.02))).sort((a, b) => a - b);
  const noise = quiet.length ? quiet[Math.floor(quiet.length * 0.995)]! : 0;
  return clicks.map((c) => {
    const a = at(c);
    const b = at(c + maxDelay);
    if (b - a < 2) return null;
    let peak = 0;
    for (let i = a; i < b; i++) if (d[i]! > peak) peak = d[i]!;
    if (peak < 1e-4 || peak < 2 * noise) return null;
    const on = Math.max(peak / 3, 1.5 * noise);
    for (let i = a; i < b; i++) if (d[i]! >= on) return t0 + i / sr - c;
    return null;
  });
}

/** The delay from the clicks heard: their median, when at least five were heard and the middle
 * ones agree within 10 ms; otherwise null (`heard` says how many were). */
export function roundTrip(delays: readonly (number | null)[]): { delay: number | null; heard: number } {
  const h = delays.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (h.length < 5) return { delay: null, heard: h.length };
  const k = Math.floor(h.length / 4);
  const mid = h.slice(k, h.length - k);
  if (mid[mid.length - 1]! - mid[0]! > 0.01) return { delay: null, heard: h.length };
  return { delay: Math.round(h[h.length >> 1]! * 10000) / 10000, heard: h.length };
}

// Takes: capturing a take in time with the guide (src/audio/dsp/pcm.ts → TakeCapture), the
// take records (src/core/practice/take.ts) and the list on the Practice view (src/app/takes.ts).
import { describe, expect, it } from 'vitest';
import { TakeCapture } from '../../src/audio/dsp/pcm';
import { cleanTake, clockText, MIN_TAKE_SECS, newTakeId, takeDetail, textSig, type Take } from '../../src/core/practice/take';
import { takeFileName, takesHTML } from '../../src/app/takes';

/** Microphone blocks of 2048 frames, stamped like the capture worklet's, over a signal. */
function blocks(signal: (frame: number) => number, first: number, count: number, skip: Set<number> = new Set()) {
  const out: { end: number; data: Float32Array }[] = [];
  for (let k = 0; k < count; k++) {
    const start = first + k * 2048;
    if (skip.has(k)) continue;
    out.push({ end: start + 2048, data: Float32Array.from({ length: 2048 }, (_, i) => signal(start + i)) });
  }
  return out;
}

describe('capturing a take', () => {
  // A click every 4800 frames (0.1 s at 48 kHz), each one 64 frames long.
  const clicks = (f: number) => (f % 4800 < 64 ? 0.8 : 0);
  const clickAt = (pcm: Int16Array) => {
    const at: number[] = [];
    for (let i = 0; i < pcm.length; i++) if (pcm[i]! > 8000 && (i === 0 || pcm[i - 1]! <= 8000)) at.push(i);
    return at;
  };

  it('starts exactly at the first beat and ends where it was told, at half the rate', () => {
    const c = new TakeCapture(48_000 + 1200, 10 * 48_000);
    for (const b of blocks(clicks, 40_000, 60)) c.push(b.end, b.data);
    c.to = 48_000 + 1200 + 48_000; // one second
    const pcm = c.finish();
    expect(pcm.length).toBe(24_000);
    // Clicks at frames 52 800, 57 600 … are 3600, 8400 … frames into the take: 1800, 4200 … at half rate.
    const at = clickAt(pcm);
    expect(at.slice(0, 3).map((x) => Math.abs(x - [1800, 4200, 6600][at.indexOf(x)]!) <= 8)).toEqual([true, true, true]);
  });

  it('keeps time across a lost block, filling it with silence', () => {
    const c = new TakeCapture(0, 1e9);
    for (const b of blocks(clicks, 0, 30, new Set([10, 11]))) c.push(b.end, b.data);
    c.to = 30 * 2048;
    const pcm = c.finish();
    expect(pcm.length).toBe(30 * 1024);
    const at = clickAt(pcm);
    // Every click outside the lost blocks is where it belongs.
    for (const x of at) expect(Math.min(...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => Math.abs(x - k * 2400)))).toBeLessThanOrEqual(8);
    // 13 clicks in 30 blocks, less the one in the lost blocks.
    expect(at.length).toBe(12);
  });

  it('stops at its longest, and a take with nothing yet is silence of the right length', () => {
    const c = new TakeCapture(0, 4096);
    for (const b of blocks(() => 0.3, 0, 10)) c.push(b.end, b.data);
    expect(c.finish().length).toBe(2048);
    const e = new TakeCapture(1000, 1e9);
    e.to = 1000 + 4800;
    expect(e.finish().length).toBe(2400);
  });
});

describe('take records', () => {
  const T: Take = { id: 'take-1', song: 's1', title: 'আমার <গান>', at: Date.UTC(2026, 9, 11, 9, 5), secs: 83.4, rate: 24000, from: 0, to: 2, loop: true, rounds: 3, tempo: 96, countIn: true, ramp: false, rampStep: 4, rampMax: 160, lag: 0.18, sig: textSig('সা রা গা') };

  it('are checked when read; damaged ones are dropped', () => {
    expect(cleanTake(T)).toEqual(T);
    expect(cleanTake({ ...T, flat: 80 })!.flat).toBe(80);
    expect(cleanTake({ ...T, to: -1, rounds: 0, tempo: 999, lag: 3 })).toMatchObject({ to: 0, rounds: 1, tempo: 240, lag: 0.6 });
    for (const bad of [null, 5, [], { ...T, id: '' }, { ...T, song: 3 }, { ...T, at: 'x' }, { ...T, rate: 0 }]) expect(cleanTake(bad)).toBeNull();
    expect(newTakeId(1791544356355, () => 0.5)).toMatch(/^take-[0-9a-z]+-[0-9a-z]{1,5}$/);
    expect(MIN_TAKE_SECS).toBe(3);
  });

  it('tell when the notation has changed since', () => {
    expect(textSig('সা রা গা')).toBe(textSig('সা রা গা'));
    expect(textSig('সা রা গা')).not.toBe(textSig('সা রা মা'));
  });

  it('are listed with their time, details, buttons and a note when the notation changed', () => {
    expect(clockText(83.4)).toBe('1:23');
    expect(takeDetail(T)).toBe('lines 1–3 × 3 rounds · 96 per min · 1:23');
    const now = T.at + 3600_000;
    const html = takesHTML([T], now, T.sig);
    expect(html).toContain('lines 1–3 × 3 rounds');
    expect(html).toContain('data-act="guide" data-id="take-1">▶ With the guide');
    expect(html).not.toContain('tkwarn');
    expect(takesHTML([T], now, 'other')).toContain('The notation has changed since');
    expect(takesHTML([T], now, T.sig, { confirm: 'take-1' })).toContain('Delete this take?');
    expect(takesHTML([T], now, T.sig, { playing: { id: 'take-1', how: 'me' } })).toContain('data-act="me" data-id="take-1">■ Stop');
    expect(takesHTML([], now, '')).toContain('No takes yet');
    expect(takeFileName(T)).toMatch(/^আমার -গান- take 2026-10-11 \d\d-05\.wav$/);
  });
});

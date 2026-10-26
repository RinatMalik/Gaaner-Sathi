// A break between rounds (Rinat, 2026-10-23; docs/ENGINE.md → Transport): when looping,
// seconds of silence before each round after the first, the drone going on, then the
// count-in again if it is on; none after the last round, none without a loop, none before the
// round a pause goes on in. A rewaz routine's break between an item's rounds counts in its
// length; takes and the routine keep it.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport, type BreakEntry, type DisplayEntry } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { cleanRoutine, roundGapOf, routineSeconds, type Routine } from '../../src/core/practice/routine';
import { cleanTake, takeDetail } from '../../src/core/practice/take';
import { taalInfo } from '../../src/core/taal/taals';
import { loadPrefs, STORE_KEYS } from '../../src/app/store';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const SONG = 'S R G M | P D N S\n';

/** Play SONG (Keherwa, 120 a minute: half a second a beat) as asked, to its end; the beats
 * scheduled (song beat, round, time), the guide notes' start times and the display entries. */
function play(opts: { from: number; to: number; loop: boolean; rounds?: number; gap?: number; at?: { s: number; pass: number } }, countIn = true) {
  const rec = new RecordingContext();
  const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
  const beats: [number, number, number][] = [];
  const notes: number[] = [];
  const shown: DisplayEntry[] = [];
  T.onBeat = (q) => beats.push([q.s, q.pass, +q.time.toFixed(3)]);
  T.onNote = (t) => notes.push(+t.toFixed(3));
  const sound = { ...structuredClone(DEFAULT_SOUND), countIn };
  T.start({ parsed: parseSong(SONG), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound }, opts);
  for (let i = 1; i * 0.025 <= 60 && !T.endAt; i++) {
    rec.currentTime = i * 0.025;
    T.tick();
    shown.push(...T.queue.splice(0));
  }
  return { beats, notes, shown, endAt: T.endAt };
}

describe('a break between rounds', () => {
  it('is silence before each round after the first, then the count-in again', () => {
    const { beats, notes, shown, endAt } = play({ from: 0, to: 0, loop: true, rounds: 3, gap: 2 });
    // The count-in (8 beats from 0.12 s), round 1 from 4.12 s to 8.12 s; a break to 10.12 s,
    // the count-in again to 14.12 s, round 2; and so on.
    const firsts = beats.filter(([s, p]) => s === 0 && p >= 0).map(([, p, t]) => [p, t]);
    expect(firsts).toEqual([[0, 4.12], [1, 14.12], [2, 24.12]]);
    const countIns = beats.filter(([, p]) => p < 0).map(([, , t]) => t);
    expect(countIns).toHaveLength(24);
    expect(countIns.slice(8, 10)).toEqual([10.12, 10.62]);
    const breaks = shown.filter((q): q is BreakEntry => 'brk' in q);
    expect(breaks.map((b) => [+b.time.toFixed(3), +b.until.toFixed(3), b.pass])).toEqual([[8.12, 10.12, 1], [18.12, 20.12, 2]]);
    // Nothing sounds in a break: no guide note and no beat from 8.12 s to 10.12 s.
    expect(notes.filter((t) => t >= 8.12 && t < 10.12)).toEqual([]);
    expect(beats.filter(([, , t]) => t >= 8.12 && t < 10.12)).toEqual([]);
    // No break after the last round: it ends as it would.
    expect(endAt).toBeCloseTo(28.12 + 1.3, 6);
  });

  it('goes straight into the round when the count-in is off and the lines start at sam', () => {
    const { beats } = play({ from: 0, to: 0, loop: true, rounds: 2, gap: 1.5 }, false);
    expect(beats.filter(([, p]) => p < 0)).toEqual([]);
    expect(beats.filter(([s]) => s === 0).map(([, p, t]) => [p, t])).toEqual([[0, 0.12], [1, 5.62]]);
  });

  it('plays the pickup again when the lines start after sam', () => {
    // Line 2 starts on the 6th beat of Keherwa's cycle: 5 beats of pickup from sam.
    const two = 'S R G M P\nD N S S R\n';
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
    const beats: [number, number][] = [];
    T.onBeat = (q) => beats.push([q.raw, q.pass]);
    T.start({ parsed: parseSong(two), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound: { ...structuredClone(DEFAULT_SOUND), countIn: false } }, { from: 1, to: 1, loop: true, rounds: 2, gap: 1 });
    for (let i = 1; i * 0.025 <= 30 && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    const pre = beats.filter(([, p]) => p < 0);
    expect(pre).toHaveLength(10);
    // The same pickup before both rounds.
    expect(pre.slice(0, pre.length / 2)).toEqual(pre.slice(pre.length / 2));
  });

  it('is not taken without a loop, nor before the round a pause goes on in', () => {
    expect(play({ from: 0, to: 0, loop: false, gap: 3 }).shown.some((q) => 'brk' in q)).toBe(false);
    const resumed = play({ from: 0, to: 0, loop: true, rounds: 3, gap: 2, at: { s: 0, pass: 1 } });
    const breaks = resumed.shown.filter((q): q is BreakEntry => 'brk' in q);
    expect(breaks.map((b) => b.pass)).toEqual([2]);
    expect(resumed.beats[0]).toEqual([0, 1, 0.12]);
  });

  it('counts in a routine’s length, and is kept by routines and takes', () => {
    const shape = () => ({ tempo: 120, lineBeats: [8], cycle: 8 });
    const r: Routine = { id: 'r', name: 'R', updatedAt: 0, items: [{ song: 'a', rounds: 3 }] };
    // 3 rounds of 8 beats and a count-in: 32 beats, 16 s.
    expect(routineSeconds(r, shape, true)).toBe(16);
    // Two breaks of 5 s, each with a count-in again: 16 + 10 + 8.
    expect(routineSeconds({ ...r, roundGap: 5 }, shape, true)).toBe(34);
    expect(routineSeconds({ ...r, roundGap: 5 }, shape, false)).toBe(22);
    expect(cleanRoutine('r', { name: 'R', items: [], roundGap: 500 })!.roundGap).toBe(120);
    expect(cleanRoutine('r', { name: 'R', items: [], roundGap: 0 })!.roundGap).toBeUndefined();
    expect(roundGapOf(cleanRoutine('r', { name: 'R', items: [] })!)).toBe(0);
    const take = cleanTake({ id: 't', song: 's', at: 1, secs: 30, rate: 48000, loop: true, rounds: 3, gap: 4, tempo: 120 })!;
    expect(take.gap).toBe(4);
    expect(takeDetail(take)).toBe('line 1 × 3 rounds, 4 s breaks · 120 per min · 0:30');
    expect(cleanTake({ id: 't', song: 's', at: 1, secs: 30, rate: 48000 })!.gap).toBeUndefined();
  });

  it('is a rewaz routine\'s only: the Practice view\'s setting is dropped', () => {
    const prefs = (o: object) => loadPrefs({ getItem: (k) => (k === STORE_KEYS.prefs ? JSON.stringify(o) : null), setItem() {}, removeItem() {} });
    expect('loopGap' in prefs({ loopGap: 6 })).toBe(false);
  });
});

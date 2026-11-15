// The page held up while a song plays (docs/ENGINE.md → One clock): a long task, or a hidden
// tab whose timer the browser slowed. The clock runs on; the beats missed meanwhile must not
// all sound at once when the timer next fires.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { LATE, RESUME, Transport } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

/** Sixteen lines of eight beats at 120 a minute (half a second a beat), no count-in: beats at
 * 0.12 s, 0.62 s … The times of the beats and guide notes as they are scheduled. */
function playing(lines: { from: number; to: number; loop: boolean; rounds?: number; gap?: number } = { from: 0, to: 15, loop: false }) {
  const rec = new RecordingContext();
  const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
  const beats: number[] = [];
  const notes: number[] = [];
  T.onBeat = (q) => beats.push(+q.time.toFixed(3));
  T.onNote = (t) => notes.push(+t.toFixed(3));
  const sound = { ...structuredClone(DEFAULT_SOUND), countIn: false };
  T.start({ parsed: parseSong('S R G M | P D N S\n'.repeat(16)), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound }, lines);
  /** The timer fires every 25 ms from `from` to `to`, seconds. */
  const run = (from: number, to: number) => {
    for (let t = from; t <= to + 1e-9; t += 0.025) {
      rec.currentTime = t;
      T.tick();
    }
  };
  return { rec, T, beats, notes, run };
}

describe('a page held up while a song plays', () => {
  it('does not sound the beats it missed all at once: the song goes on from where the clock is', () => {
    const { rec, T, beats, notes, run } = playing();
    run(0.025, 2);
    expect(beats).toEqual([0.12, 0.62, 1.12, 1.62, 2.12]);
    // Thirty seconds with no tick, the clock running on (sixty beats went by unscheduled).
    rec.currentTime = 32;
    const before = beats.length;
    T.tick();
    const caught = beats.slice(before);
    expect(caught).toEqual([+(32 + RESUME).toFixed(3)]);
    expect(notes.filter((t) => t < 32 && t > 2.2)).toEqual([]);
    // From there, a beat every half second as before, each scheduled ahead of its time.
    run(32.025, 34);
    expect(beats.slice(before)).toEqual([32.05, 32.55, 33.05, 33.55, 34.05]);
    // The song is as long as it was, only later: none of its beats is left out.
    run(34.025, 100);
    expect(beats).toHaveLength(128);
    expect(T.endAt).toBeGreaterThan(0);
  });

  it('plays a beat that is only a little late at its own time, the beats after it where they were', () => {
    const { rec, T, beats, run } = playing();
    run(0.025, 2);
    // The timer comes back just after the next beat (2.62 s) was due, by less than `LATE`.
    rec.currentTime = 2.62 + LATE - 0.005;
    T.tick();
    expect(beats.at(-1)).toBe(2.62);
    run(rec.currentTime + 0.025, 4);
    expect(beats.slice(-3)).toEqual([3.12, 3.62, 4.12]);
  });

  it('leaves a break between rounds as it was when the hold-up ends before the break does', () => {
    // One line looped twice with a 3-second break: round 1 from 0.12 s to 4.12 s, the break to
    // 7.12 s, round 2 from there.
    const { rec, T, beats, run } = playing({ from: 0, to: 0, loop: true, rounds: 2, gap: 3 });
    run(0.025, 4.5);
    expect(beats.at(-1)).toBe(3.62);
    // Held up for two seconds inside the break: nothing was due, so nothing moves.
    rec.currentTime = 6.5;
    T.tick();
    run(6.525, 8);
    expect(beats.slice(8)).toEqual([7.12, 7.62, 8.12]);
  });
});

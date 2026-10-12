// Pause (src/app/app.ts, docs/ENGINE.md → Transport): playing goes on from the beat it was
// paused on, in the same round, at once, with a note held across that beat sounding again;
// pitch scoring forgets the notes that never sounded.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { beatNotes, eventsByBeat, PitchTracker } from '../../src/core/pitch/track';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

/** Play a song (Keherwa, 120 a minute, Sa = C4, count-in on) to its end; the notes and beats
 * scheduled. */
function play(text: string, opts: { from: number; to: number; loop: boolean; rounds?: number; at?: { s: number; pass: number } }) {
  const rec = new RecordingContext();
  const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
  const notes: [number, number, number][] = [];
  const beats: [number, number][] = [];
  T.onNote = (t, d, m) => notes.push([+t.toFixed(3), +d.toFixed(3), m]);
  T.onBeat = (q) => beats.push([q.s, q.pass]);
  const sound = { ...structuredClone(DEFAULT_SOUND), countIn: true };
  const r = T.start({ parsed: parseSong(text), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound }, opts);
  for (let i = 1; i * 0.025 <= 20 && !T.endAt; i++) {
    rec.currentTime = i * 0.025;
    T.tick();
  }
  return { r, notes, beats };
}

describe('going on after a pause', () => {
  it('starts at the beat paused on, at once, with no count-in', () => {
    const { r, notes, beats } = play('S R G M | P D N S\n', { from: 0, to: 0, loop: false, at: { s: 5, pass: 0 } });
    expect(r!.pre).toBe(0);
    expect(beats).toEqual([[5, 0], [6, 0], [7, 0]]);
    // Dha, Ni, Sa at 0.12 s, 0.62 s, 1.12 s (MIDI 69, 71, 60).
    expect(notes).toEqual([[0.12, 0.5, 69], [0.62, 0.5, 71], [1.12, 0.5, 60]]);
  });

  it('sounds a note held across that beat again, for the rest of its length', () => {
    const { notes } = play('S - - M\n', { from: 0, to: 0, loop: false, at: { s: 1, pass: 0 } });
    expect(notes).toEqual([[0.12, 1, 60], [1.12, 0.5, 65]]);
  });

  it('keeps the round, so a set number of rounds ends where it would have', () => {
    const { beats } = play('S R G M\n', { from: 0, to: 0, loop: true, rounds: 3, at: { s: 2, pass: 1 } });
    expect(beats).toEqual([[2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]]);
  });

  it('plays from the start, with its count-in, when not told where to go on', () => {
    const { r, beats } = play('S R G M | P D N S\n', { from: 0, to: 0, loop: false });
    expect(r!.pre).toBe(8);
    expect(beats.filter(([, p]) => p >= 0)).toHaveLength(8);
  });
});

describe('pitch scoring over a pause', () => {
  it('forgets the notes scheduled after the pause and ends the one sounding then', () => {
    const P = parseSong('সা রা গা মা\nপা ধা না র্সা');
    const by = eventsByBeat(P);
    const sec = { secStart: 0, secEnd: P.total, loop: false };
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: 261.63 });
    // Beats 0 to 3 scheduled (0.6 s each); paused at 1.5 s, in Ga.
    for (let s = 0; s < 4; s++) tr.addNotes(beatNotes(P, by, { time: s * 0.6, s, pass: 0, spb: 0.6 }, sec, true));
    tr.cut(1.5);
    expect(tr.expectedAt(1.4)!.semi).toBe(4);
    expect(tr.expectedAt(1.4)!.t1).toBe(1.5);
    expect(tr.expectedAt(1.9)).toBeNull();
    // Going on from Ga at 3 s: the notes from then on are expected as usual.
    for (let s = 2; s < 8; s++) tr.addNotes(beatNotes(P, by, { time: 3 + (s - 2) * 0.6, s, pass: 0, spb: 0.6 }, sec, true));
    expect([3.1, 3.7, 6.5].map((t) => tr.expectedAt(t)!.semi)).toEqual([4, 5, 0]);
    const r = tr.settle(true);
    expect(r.notes.map((n) => n.note.semi)).toEqual([0, 2, 4, 4, 5, 7, 9, 11, 0]);
  });
});

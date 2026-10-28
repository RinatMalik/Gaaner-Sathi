// Pitch feedback: expected notes from the schedule, scores per note and line judged when the
// voice was sung, how far behind the guide it comes, and the whole chain from a synthetic
// singer through the detector.
import { describe, expect, it } from 'vitest';
import { saFreq } from '../../src/audio/dsp/pitch';
import { PitchDetector, windowSize } from '../../src/audio/dsp/mpm';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport } from '../../src/audio/transport';
import { EXERCISES } from '../../src/core/exercises';
import { parseSong } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { beatNotes, centsFromSa, eventsByBeat, foldOctave, isGlitch, judged, nearestNote, noteScore, octaveFor, PitchTracker, SLIP_MAX, SlipFilter, sliding, type ExpectedNote, type Section } from '../../src/core/pitch/track';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const SA = 261.63;
const hzOf = (n: { semi: number; oct: number }, detune = 0) => SA * 2 ** ((100 * n.semi + 1200 * n.oct + detune) / 1200);

/** Place every beat of a song at `spb` seconds a beat from time `t0`, in rounds of a section. */
function place(P: ParsedSong, o: { spb: number; t0?: number; sec?: Section; rounds?: number; judged?: (pass: number) => boolean }): ExpectedNote[] {
  const sec = o.sec ?? { secStart: 0, secEnd: P.total, loop: false };
  const by = eventsByBeat(P);
  const out: ExpectedNote[] = [];
  let t = o.t0 ?? 0;
  for (let pass = 0; pass < (o.rounds ?? 1); pass++) {
    for (let s = sec.secStart; s < sec.secEnd; s++) {
      out.push(...beatNotes(P, by, { time: t, s, pass, spb: o.spb }, sec, o.judged ? o.judged(pass) : true));
      t += o.spb;
    }
  }
  return out;
}

/** Readings every 22 ms over [from, to), from a function of time (0 = silence). */
function readings(tr: PitchTracker, from: number, to: number, hzAt: (t: number) => number): void {
  for (let t = from; t < to; t += 0.022) tr.addReading({ t, hz: hzAt(t) });
}

describe('pitch arithmetic', () => {
  it('measures cents from Sa, folds octaves and names the nearest note', () => {
    expect(centsFromSa(SA * 2, SA)).toBeCloseTo(1200, 9);
    expect(foldOctave(1230)).toBeCloseTo(30, 9);
    expect(foldOctave(-1180)).toBeCloseTo(20, 9);
    expect(nearestNote(-130)).toEqual({ semi: 11, oct: -1, off: -30 });
    expect(nearestNote(712)).toEqual({ semi: 7, oct: 0, off: 12 });
    // As judged: folded for any octave; else as sung, or from the octave below where it counts.
    expect(judged(1230, true)).toBeCloseTo(30, 9);
    expect(judged(-1180, false)).toBe(-1180);
    expect(judged(-1180, false, true)).toBeCloseTo(20, 9);
    expect([judged(-500, false, true), judged(1180, false, true)]).toEqual([-500, 1180]);
    expect([0, 10, 15, 25, 35, -60, 100].map(noteScore)).toEqual([100, 100, 90, 70, 50, 0, 0]);
  });
});

describe('expected notes', () => {
  it('follows holds across beats and lines, splits shared beats and skips rests', () => {
    const P = parseSong('সা -া রাগা | x মা\n-া পা');
    expect(eventsByBeat(P)).toEqual([[0], [0], [1, 2], [], [3], [3], [4]]);
    const notes = place(P, { spb: 0.5 });
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    tr.addNotes(notes);
    // Sa held for two beats is one note; Re and Ga share a beat; Ma is held into the next line.
    const t = (x: number) => tr.expectedAt(x);
    expect([t(0.1), t(0.9)].map((n) => n && n.semi)).toEqual([0, 0]);
    expect(t(0.9)!.t1).toBeCloseTo(1, 9);
    expect([t(1.1)!.semi, t(1.3)!.semi, t(1.6)]).toEqual([2, 4, null]);
    expect([t(2.1)!.semi, t(2.9)!.semi, t(2.9)!.line, t(2.9)!.t1]).toEqual([5, 5, 0, 3]);
  });

  it('cuts a note at the end of a looped section, and carries one held into it', () => {
    const P = parseSong('সা -া -া\nরা গা মা');
    const by = eventsByBeat(P);
    const sec = { secStart: 1, secEnd: 3, loop: true };
    const pieces = [1, 2].flatMap((s, i) => beatNotes(P, by, { time: i, s, pass: 0, spb: 1 }, sec, true));
    expect(pieces.map((n) => [n.semi, n.t0, n.t1])).toEqual([[0, 0, 1], [0, 1, 2]]);
    const cut = beatNotes(parseSong('সা রা -া -া'), eventsByBeat(parseSong('সা রা -া -া')), { time: 0, s: 1, pass: 0, spb: 1 }, { secStart: 0, secEnd: 2, loop: true }, true);
    expect(cut.map((n) => [n.semi, n.t1])).toEqual([[2, 1]]);
  });
});

describe('scores', () => {
  const P = parseSong('সা রা গা মা\nপা ধা না র্সা');

  it('scores each note by its readings: in tune, sharp, an octave away, or not sung', () => {
    const run = (hzAt: (n: ExpectedNote | null) => number, anyOctave = true) => {
      const tr = new PitchTracker({ lag: 0, anyOctave, saHz: SA });
      tr.addNotes(place(P, { spb: 0.6 }));
      readings(tr, 0, 4.9, (t) => hzAt(tr.expectedAt(t)));
      tr.settle(true);
      return tr;
    };
    const inTune = run((n) => (n ? hzOf(n, 4) : 0));
    expect(inTune.results.map((r) => r.status)).toEqual(Array(8).fill('sung'));
    expect(inTune.results.every((r) => r.score === 100 && Math.abs(r.cents - 4) < 0.01)).toBe(true);
    expect(inTune.summary()).toMatchObject({ score: 100, sung: 1, lines: [[0, 100], [1, 100]] });
    expect(run((n) => (n ? hzOf(n, 30) : 0)).results.map((r) => r.score)).toEqual(Array(8).fill(60));
    expect(run((n) => (n ? hzOf(n, -1200) : 0)).summary()!.score).toBe(100);
    expect(run((n) => (n ? hzOf(n, -1200) : 0), false).summary()!.score).toBe(0);
    const quiet = run(() => 0);
    expect(quiet.results.map((r) => r.status)).toEqual(Array(8).fill('unsung'));
    expect(quiet.summary()).toBeNull();
  });

  it('counts the octave below when the octave must match and the guide sounds it (Rinat, 2026-10-28)', () => {
    // Rinat sings Sa on C♯3 under a guide named C♯4, whose bass reed sounds C♯3: "Octave must match"
    // wanted the voice an octave higher.
    const run = (detune: number, below: boolean) => {
      const tr = new PitchTracker({ lag: 0, anyOctave: false, below, saHz: SA });
      tr.addNotes(place(P, { spb: 0.6 }));
      readings(tr, 0, 4.9, (t) => {
        const n = tr.expectedAt(t);
        return n ? hzOf(n, detune) : 0;
      });
      tr.settle(true);
      return tr;
    };
    expect(run(-1200, true).summary()!.score).toBe(100);
    expect(run(-1170, true).results.map((r) => r.score)).toEqual(Array(8).fill(60));
    expect(run(0, true).summary()!.score).toBe(100);
    // Without a bass reed it is wrong, and with one an octave above or two below is still wrong.
    expect(run(-1200, false).summary()!.score).toBe(0);
    expect(run(1200, true).summary()!.score).toBe(0);
    expect(run(-2400, true).summary()!.score).toBe(0);
  });

  it('counts a late start against the note, and says how late it was (Rinat, 2026-10-19)', () => {
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    tr.addNotes(place(P, { spb: 0.6 }));
    // Each note starts 150 ms on the previous pitch, then lands in tune.
    readings(tr, 0, 4.9, (t) => {
      const n = tr.expectedAt(t);
      if (!n) return 0;
      const prev = tr.expectedAt(n.t0 - 0.01);
      return t - n.t0 < 0.15 && prev ? hzOf(prev) : hzOf(n);
    });
    tr.settle(true);
    const [first, ...rest] = tr.results;
    expect([first!.score, first!.arrive < 0.05]).toEqual([100, true]);
    // About a fifth of each note's readings on the wrong pitch: about 80, not 100.
    expect(rest.every((r) => r.score >= 72 && r.score <= 85)).toBe(true);
    expect(rest.every((r) => Math.abs(r.arrive - 0.15) < 0.025)).toBe(true);
    // The pitch it held is still right.
    expect(rest.every((r) => Math.abs(r.cents) < 1)).toBe(true);
  });

  it('counts the end of a note too, and leaves silence out (Rinat, 2026-10-20)', () => {
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    tr.addNotes(place(P, { spb: 0.6 }));
    // In tune, then 50 cents sharp for the last 15 % (90 ms of 600).
    readings(tr, 0, 4.9, (t) => {
      const n = tr.expectedAt(t);
      if (!n) return 0;
      return hzOf(n, t > n.t1 - 0.15 * (n.t1 - n.t0) ? 50 : 0);
    });
    tr.settle(true);
    expect(tr.results.every((r) => r.score >= 85 && r.score < 100 && r.wobble > 0)).toBe(true);
    // Each note sung in tune for its first 70 % then a breath, and a 40 ms consonant gap in the
    // middle: full marks, the silence left out.
    const breath = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    breath.addNotes(place(P, { spb: 0.6 }));
    readings(breath, 0, 4.9, (t) => {
      const n = breath.expectedAt(t);
      const into = n ? t - n.t0 : 1;
      return n && into < 0.42 && !(into > 0.2 && into < 0.24) ? hzOf(n) : 0;
    });
    breath.settle(true);
    expect(breath.results.map((r) => [r.status, r.score])).toEqual(Array(8).fill(['sung', 100]));
    // Voice for under half of each note: not sung, left out of the score.
    const little = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    little.addNotes(place(P, { spb: 0.6 }));
    readings(little, 0, 4.9, (t) => {
      const n = little.expectedAt(t);
      return n && t - n.t0 < 0.2 ? hzOf(n, 40) : 0;
    });
    little.settle(true);
    expect(little.results.every((r) => r.status === 'unsung' && Number.isNaN(r.score))).toBe(true);
    expect(little.summary()).toBeNull();
  });

  it('leaves out a slide into a note, but not a voice holding the last one', () => {
    // Moving 10 cents or more nearer, not yet in tune, the slide not over: sliding.
    expect([sliding(-300, -250, false), sliding(-40, -25, false), sliding(-300, -295, false), sliding(-25, -12, false), sliding(-300, -250, true), sliding(null, -250, false)]).toEqual([true, true, false, false, false, false]);
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    tr.addNotes(place(P, { spb: 0.6 }));
    // Each note slides up from the note below over its first 150 ms, then holds in tune.
    readings(tr, 0, 4.9, (t) => {
      const n = tr.expectedAt(t);
      if (!n) return 0;
      const into = t - n.t0;
      return hzOf(n, into < 0.15 ? -200 * (1 - into / 0.15) : 0);
    });
    tr.settle(true);
    expect(tr.results.every((r) => r.score === 100)).toBe(true);
    // How long the slide took still shows.
    expect(tr.results.every((r) => r.arrive > 0.08 && r.arrive < 0.15)).toBe(true);
  });

  it('reads a jump away and straight back, or a lone reading, as the detector getting it wrong', () => {
    const G = 196;
    expect(isGlitch(G, G * 2, G)).toBe(true);
    expect(isGlitch(G, 240, 196.5)).toBe(true);
    expect(isGlitch(0, G, 0)).toBe(true);
    // A note change, a reading in tune, no voice, and one neighbour missing are not.
    expect(isGlitch(G, 220, 220)).toBe(false);
    expect(isGlitch(G, 197, G)).toBe(false);
    expect(isGlitch(G, 0, G)).toBe(false);
    expect(isGlitch(0, G, G)).toBe(false);
  });

  /** Readings 23 ms apart (cents from Sa, null: no voice) through a slip filter: what comes out,
   * and the most readings it held at once from the `from`th on. */
  function slipped(cs: (number | null)[], from = 0): { out: (number | null)[]; most: number } {
    const f = new SlipFilter();
    const out: (number | null)[] = [];
    let most = 0;
    const take = (rs: { hz: number }[]) => out.push(...rs.map((r) => (r.hz ? Math.round(centsFromSa(r.hz, SA)) : null)));
    cs.forEach((c, i) => {
      take(f.push({ t: i * 0.023, hz: c == null ? 0 : SA * 2 ** (c / 1200) }));
      if (i >= from) most = Math.max(most, i + 1 - out.length);
    });
    take(f.flush());
    return { out, most };
  }
  const run = (n: number, c: number | null) => Array<number | null>(n).fill(c);

  it('reads a stretch that slipped to an overtone as no voice: in a note, at an onset, at the end (Rinat, 2026-10-21)', () => {
    // A voice an octave below Sa; the detector reads its 3rd harmonic (1900 cents up) for 3.
    const mid = slipped([...run(20, -1200), ...run(3, 702), ...run(20, -1200)], 20);
    expect(mid.out).toEqual([...run(20, -1200), ...run(3, null), ...run(20, -1200)]);
    // Only the slip waits: the voice coming back carries on at once.
    expect(mid.most).toBe(3);
    // At an onset after a breath, five readings of the 3rd harmonic before the voice.
    const onset = slipped([...run(15, null), ...run(5, 700), ...run(20, -1196)]);
    expect(onset.out).toEqual([...run(20, null), ...run(20, -1196)]);
    // At the end of a phrase, the 2nd harmonic; and two in a row, the 3rd then the 2nd.
    expect(slipped([...run(20, 0), ...run(3, 1200), ...run(15, null)]).out).toEqual([...run(20, 0), ...run(18, null)]);
    expect(slipped([...run(20, 0), ...run(2, 1902), ...run(2, 1200), ...run(20, 0)]).out).toEqual([...run(20, 0), ...run(4, null), ...run(20, 0)]);
    // A reading the voice comes back from, after a pause of under a quarter second, too.
    expect(slipped([...run(20, 0), ...run(4, null), ...run(4, 2400), ...run(20, 50)]).out).toEqual([...run(20, 0), ...run(8, null), ...run(20, 50)]);
  });

  it('leaves the singing alone: an octave leap held, a meend, a fifth, a grace note, a short syllable', () => {
    const same = (cs: (number | null)[]) => expect(slipped(cs).out).toEqual(cs);
    same([...run(20, 0), ...run(20, 1200)]);
    same(Array.from({ length: 31 }, (_, i) => 40 * i));
    same([...run(20, 0), ...run(2, 200), ...run(20, 0)]);
    same([...run(20, 0), ...run(4, 700), ...run(20, 0)]);
    same([...run(15, null), ...run(6, 400), ...run(15, null)]);
    // A real leap waits until it is longer than a slip can be (about 0.2 s), then goes on.
    expect(slipped([...run(20, 0), ...run(20, 1200)], 20).most).toBe(SLIP_MAX);
  });

  it('starts in the octave sung last time, and changes it only when another is clearly sung', () => {
    const Q = parseSong(Array.from({ length: 3 }, () => 'সা পা গা মা র্সা ধা না পা').join('\n'));
    const sing = (o: { octave?: number; anyOctave?: boolean; below?: boolean }, detune: (t: number) => number) => {
      const tr = new PitchTracker({ lag: 0, anyOctave: o.anyOctave ?? true, below: o.below, saHz: SA, octave: o.octave });
      tr.addNotes(place(Q, { spb: 0.4 }));
      const seen = new Set<number>([tr.octave]);
      let found = NaN;
      for (let t = 0; t < 9.5; t += 0.022) {
        const n = tr.expectedAt(t);
        tr.addReading({ t, hz: n ? hzOf(n, detune(t)) : 0 });
        tr.settle();
        seen.add(tr.octave);
        if (Number.isNaN(found) && tr.octave === -1) found = t;
      }
      return { seen: [...seen], found };
    };
    // An octave below, as last time: drawn there from the first reading, never moved.
    expect(sing({ octave: -1 }, () => -1200).seen).toEqual([-1]);
    // A new singer an octave below: found within about half a second (it took over a second).
    const fresh = sing({}, () => -1200);
    expect(fresh.seen).toEqual([0, -1]);
    expect(fresh.found).toBeLessThan(0.6);
    // A third of the readings in the other octave does not move it.
    expect(sing({ octave: -1 }, (t) => (Math.floor(t / 0.4) % 3 === 1 ? 0 : -1200)).seen).toEqual([-1]);
    // When the octave must match, the voice is drawn where it is.
    expect(sing({ octave: -1, anyOctave: false }, () => -1200).seen).toEqual([0]);
    // Where the octave below counts too (the guide's bass reed), it is drawn there, and only there.
    expect(sing({ octave: -1, anyOctave: false, below: true }, () => -1200).seen).toEqual([-1]);
    expect(sing({ anyOctave: false, below: true }, () => -1200).seen).toEqual([0, -1]);
    expect(sing({ octave: -2, anyOctave: false, below: true }, () => -2400).seen).toEqual([-1]);
  });

  it('starts each song in the octave nearest the Sa the voice sang on, whatever the song’s Sa (Rinat, 2026-10-21)', () => {
    // Rinat's voice: Sa on C♯3 (138.59 Hz). Songs with Sa C♯4, C♯3, D4, C♯5 and C♯2.
    expect([277.18, 138.59, 293.66, 554.37, 69.3].map((sa) => octaveFor(138.59, sa))).toEqual([-1, 0, -1, -2, 1]);
    // Beyond two octaves, two.
    expect(octaveFor(138.59, 2217.46)).toBe(-2);
  });

  it('finds the octave the voice sings in, to draw it all in one octave', () => {
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    const Q = parseSong(Array.from({ length: 3 }, () => 'সা পা গা মা র্সা ধা না পা').join('\n'));
    tr.addNotes(place(Q, { spb: 0.4 }));
    for (let t = 0; t < 9.5; t += 0.022) {
      const n = tr.expectedAt(t);
      tr.addReading({ t, hz: n ? hzOf(n, -1200) : 0 });
      tr.settle();
    }
    expect(tr.octave).toBe(-1);
    tr.settle(true);
    expect(tr.summary()!.score).toBe(100);
  });


  it('finishes each line as the next begins, round by round, and leaves listening rounds unscored', () => {
    const sec = { secStart: 0, secEnd: 8, loop: true };
    const tr = new PitchTracker({ lag: 0, anyOctave: true, saHz: SA });
    tr.addNotes(place(P, { spb: 0.5, sec, rounds: 3, judged: (pass) => pass !== 1 }));
    const seen: string[] = [];
    for (let t = 0; t < 12; t += 0.022) {
      const n = tr.expectedAt(t);
      tr.addReading({ t, hz: n ? hzOf(n, n.pass === 2 ? 20 : 0) : 0 });
      for (const l of tr.settle().lines) seen.push(l.line + ':' + l.pass + '=' + l.score);
    }
    for (const l of tr.settle(true).lines) seen.push(l.line + ':' + l.pass + '=' + l.score);
    expect(seen).toEqual(['0:0=100', '1:0=100', '0:2=80', '1:2=80']);
    expect(tr.summary()!.lines).toEqual([[0, 90], [1, 90]]);
  });

  it('measures how far behind the guide the voice comes, and judges it where it was sung', () => {
    // The device's delay 30 ms; the singer a further 150 ms behind the guide.
    const tr = new PitchTracker({ lag: 0.03, anyOctave: true, saHz: SA });
    const Q = parseSong(Array.from({ length: 6 }, () => 'সা রা গা মা পা ধা না র্সা').join('\n'));
    tr.addNotes(place(Q, { spb: 0.4 }));
    for (let t = 0; t < 19.5; t += 0.022) {
      const n = tr.expectedAt(t - 0.18);
      tr.addReading({ t, hz: n ? hzOf(n, 3) : 0 });
      tr.settle();
    }
    tr.settle(true);
    expect(tr.lag).toBe(0.03);
    expect(Math.abs(tr.behind! - 0.15)).toBeLessThanOrEqual(0.02);
    // In tune, but over a third of each note late: not near 100.
    expect(tr.summary()!.score).toBeLessThan(70);
    // Long held notes fit any delay: none is said.
    const held = new PitchTracker({ lag: 0.05, anyOctave: true, saHz: SA });
    held.addNotes(place(parseSong('সা -া -া -া -া -া -া -া -া -া -া -া'), { spb: 0.8 }));
    // Sung from when it was heard (the device's 50 ms on).
    for (let t = 0.05; t < 9.5; t += 0.022) {
      held.addReading({ t, hz: SA });
      held.settle();
    }
    expect([held.lag, held.behind]).toEqual([0.05, 0]);
  });
});

describe('the whole chain: transport → expected notes, synthetic singer → detector → scores', () => {
  /** `lag`: the device's delay given to the tracker (the singer's is 150 ms). */
  function sing(detune: number, seed: number, lag = 0.15) {
    const ex = EXERCISES[2]!;
    const P = parseSong(ex.text);
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(seed)), () => {});
    const saHz = saFreq(ex);
    const tr = new PitchTracker({ lag, anyOctave: true, saHz });
    const by = eventsByBeat(P);
    T.onBeat = (q, spb) => {
      if (q.pass >= 0) tr.addNotes(beatNotes(P, by, { time: q.time, s: q.s, pass: q.pass, spb }, T, true));
    };
    T.start({ parsed: P, taal: taalInfo(ex.taal), song: ex, sound: structuredClone(DEFAULT_SOUND) }, { from: 0, to: 0, loop: false });
    for (let i = 1; !T.endAt && i < 4000; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    // The singer: in time with a 150 ms round trip, slightly off by `detune`, with vibrato,
    // breathy noise, and a little scoop into each note.
    const sr = 24000;
    const end = T.endAt;
    const n = Math.ceil(end * sr);
    const audio = new Float32Array(n);
    const rand = seeded(seed + 1);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const note = tr.expectedAt(t - 0.15);
      if (!note) continue;
      const into = t - 0.15 - note.t0;
      const scoop = into < 0.05 ? -40 * (1 - into / 0.05) : 0;
      const f = saHz * 2 ** ((100 * note.semi + 1200 * note.oct + detune + scoop + 12 * Math.sin(2 * Math.PI * 5.5 * t)) / 1200);
      phase += (2 * Math.PI * f) / sr;
      let v = 0;
      for (let h = 1; h <= 8; h++) v += Math.sin(h * phase) / h;
      audio[i] = 0.2 * v + 0.01 * (rand() * 2 - 1);
    }
    const N = windowSize(sr);
    const d = new PitchDetector(N, sr);
    for (let end = N; end <= n; end += N / 2) {
      tr.addReading({ t: (end - N / 2) / sr, hz: d.detect(audio.subarray(end - N, end)).hz });
      tr.settle();
    }
    tr.settle(true);
    return tr;
  }

  it('scores a good singer near 100, with the guide', () => {
    const tr = sing(6, 1);
    const s = tr.summary()!;
    expect(s.score).toBeGreaterThanOrEqual(90);
    expect(s.sung).toBeGreaterThan(0.95);
    expect(Math.abs(tr.behind!)).toBeLessThanOrEqual(0.03);
    expect(s.lines.length).toBe(parseSong(EXERCISES[2]!.text).noteLines.length);
  });

  it('scores the same singer lower when 110 ms behind the guide, and says so', () => {
    const on = sing(6, 1).summary()!.score;
    const tr = sing(6, 1, 0.04);
    expect(tr.summary()!.score).toBeLessThan(on - 10);
    expect(Math.abs(tr.behind! - 0.11)).toBeLessThanOrEqual(0.03);
  });

  it('scores a singer 40 cents flat near 40', () => {
    const s = sing(-40, 2).summary()!;
    expect(s.score).toBeGreaterThanOrEqual(30);
    expect(s.score).toBeLessThanOrEqual(50);
  });
});

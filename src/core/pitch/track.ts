/**
 * Pitch feedback (docs/ROADMAP.md → Pitch feedback): which note the notation expects at
 * each moment, how the singer's pitch readings compare with it, and a score for each note
 * and line. Pure (no DOM, no audio), so it is tested in Node.
 *
 * Times are AudioContext seconds, the clock that schedules the guide. A reading reaches the
 * app `lag` seconds after the moment it was sung was heard: the device's delay, sound out and
 * back in (measured with clicks, else the device's own figure). So each reading is compared
 * with the note that was playing then, `t − lag`, as the singer heard it. Nothing is fitted
 * to the singing (Rinat, 2026-10-19: "trying to make it too clever that it misrepresents is
 * not the way to go"): a voice behind the guide is judged against the notes it was behind.
 * How far behind it comes is measured from the singing and reported (`behind`), never used to
 * judge. (Until 2026-10-19 the lag was fitted to the singing, which forgave lateness.)
 */
import type { NoteEvent, ParsedSong } from '../notation/types';

/** A note the notation expects, placed in time. */
export interface ExpectedNote {
  t0: number;
  t1: number;
  /** Semitones above Sa, and octave (0 is the middle). */
  semi: number;
  oct: number;
  /** The song beat the note starts in, its notes line, and the loop round. */
  g: number;
  line: number;
  pass: number;
  /** The same sounding note across beats: its event and round. */
  key: string;
  /** False for notes the singer only listens to (the guide's rounds of call and response). */
  judged: boolean;
}

/** A pitch reading: `t` is the AudioContext time of the middle of its window; hz 0 means none. */
export interface Reading {
  t: number;
  hz: number;
}

export type NoteStatus = 'sung' | 'unsung' | 'short';

export interface NoteResult {
  note: ExpectedNote;
  /** sung: some voice; unsung: no voice at all (scores 0); short: too short to judge. */
  status: NoteStatus;
  /** The median distance of the voice from the note once it reached it, cents (sharp is
   * positive); NaN unless sung. The score, 0–100: the average of every reading's, from the
   * note's start (no voice scores 0); NaN when short. */
  cents: number;
  score: number;
  /** How much the pitch moved on the note (standard deviation, cents); NaN unless sung. */
  wobble: number;
  /** Seconds from the note's start to the voice first within 50 cents of it; NaN if never. */
  arrive: number;
}

export interface LineResult {
  line: number;
  pass: number;
  /** Pitch score of the judged notes, by their time, unsung ones 0; 0–100 (NaN if none were
   * judged); and the share of the judged notes with voice, 0–1. */
  score: number;
  sung: number;
}

/** A scheduled beat, as the transport places it. */
export interface PlacedBeat {
  time: number;
  /** Song beat, loop round, seconds per beat, and whether the guide plays it. */
  s: number;
  pass: number;
  spb: number;
}

/** The part of the song being played. */
export interface Section {
  secStart: number;
  secEnd: number;
  loop: boolean;
}

// ── Pitch arithmetic ─────────────────────────────────────────────────────────

/** Cents from Sa (Sa itself is 0; the next octave's Sa is 1200). */
export const centsFromSa = (hz: number, saHz: number): number => 1200 * Math.log2(hz / saHz);

/** The same distance moved into −600…+600 by whole octaves (for "any octave"). */
export const foldOctave = (c: number): number => c - 1200 * Math.round(c / 1200);

/** The nearest note to a pitch: semitones above Sa (any octave) and how far off it is. */
export function nearestNote(centsFromSaValue: number): { semi: number; oct: number; off: number } {
  const n = Math.round(centsFromSaValue / 100);
  return { semi: ((n % 12) + 12) % 12, oct: Math.floor(n / 12), off: centsFromSaValue - 100 * n };
}

/** A note's score from its distance: 100 within 10 cents, then 2 points a cent, 0 from 60. */
export const noteScore = (cents: number): number => Math.round(Math.max(0, Math.min(100, 100 - (Math.abs(cents) - 10) * 2)));

function median(v: number[]): number {
  const s = v.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

// ── Expected notes ───────────────────────────────────────────────────────────

/** For each song beat, the events sounding in it (indices into `P.events`). */
export function eventsByBeat(P: ParsedSong): number[][] {
  const out: number[][] = Array.from({ length: P.total }, () => []);
  P.events.forEach((e, i) => {
    const last = Math.min(P.total - 1, Math.ceil(e.start + e.dur - 1e-9) - 1);
    for (let g = Math.max(0, Math.floor(e.start + 1e-9)); g <= last; g++) out[g]!.push(i);
  });
  return out;
}

/**
 * The note pieces a scheduled beat holds, as the guide plays them: each event's part
 * inside the beat, cut at the end of a looped section.
 */
export function beatNotes(P: ParsedSong, byBeat: readonly number[][], q: PlacedBeat, sec: Section, judged: boolean): ExpectedNote[] {
  const out: ExpectedNote[] = [];
  for (const i of byBeat[q.s] || []) {
    const e: NoteEvent = P.events[i]!;
    const a = Math.max(e.start, q.s);
    let b = Math.min(e.start + e.dur, q.s + 1);
    if (sec.loop) b = Math.min(b, sec.secEnd);
    if (b - a <= 1e-9) continue;
    out.push({
      t0: q.time + (a - q.s) * q.spb, t1: q.time + (b - q.s) * q.spb, semi: e.semi, oct: e.oct,
      g: e.g, line: P.lineOfBeat[e.g] ?? 0, pass: q.pass, key: i + ':' + q.pass, judged,
    });
  }
  return out;
}

// ── The tracker ──────────────────────────────────────────────────────────────

export interface TrackerOptions {
  /** The device's delay, sound out and back in, seconds: a reading belongs to `t − lag`. */
  lag: number;
  /** Any octave counts as the right note. */
  anyOctave: boolean;
  /** Sa, Hz. */
  saHz: number;
}

/** How far behind (or ahead of) the guide the voice is looked for, seconds. */
export const BEHIND_RANGE: readonly [number, number] = [-0.2, 0.6];

/** Left out at each end of a note: half the detector's window, where a reading also holds the
 * note before or after. */
export const EDGE = 0.025;

export class PitchTracker {
  /** Set once the microphone's own figure is known, when the delay was not measured. */
  lag: number;
  /** How far behind the guide the voice comes, seconds (negative: ahead), from the last 10 s of
   * singing; null until there is enough to say. Reported only. */
  behind: number | null = null;
  /** Can change while singing: later notes follow it. */
  anyOctave: boolean;
  readonly saHz: number;
  /** Expected notes not yet scored, in time order. */
  private pending: ExpectedNote[] = [];
  /** Recent notes (scored or not), for lookups and measuring how far behind the voice is. */
  private recent: ExpectedNote[] = [];
  private readings: Reading[] = [];
  private lastAlign = -Infinity;
  /** Every note scored so far, and each line as it finishes. */
  readonly results: NoteResult[] = [];
  readonly lines: LineResult[] = [];
  private open = new Map<string, NoteResult[]>();

  constructor(o: TrackerOptions) {
    this.lag = o.lag;
    this.anyOctave = o.anyOctave;
    this.saHz = o.saHz;
  }

  /** Add the note pieces of a scheduled beat; a piece continuing the last note extends it. */
  addNotes(pieces: readonly ExpectedNote[]): void {
    for (const p of pieces) {
      const last = this.recent[this.recent.length - 1];
      if (last && last.key === p.key && Math.abs(last.t1 - p.t0) < 1e-6) {
        last.t1 = p.t1;
        continue;
      }
      const n = { ...p };
      this.recent.push(n);
      this.pending.push(n);
    }
  }

  /** The note playing at a time (a reading's, moved back by the lag), if any. */
  expectedAt(t: number, notes: readonly ExpectedNote[] = this.recent): ExpectedNote | null {
    let lo = 0;
    let hi = notes.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const n = notes[mid]!;
      if (t < n.t0) hi = mid - 1;
      else if (t >= n.t1) lo = mid + 1;
      else return n;
    }
    return null;
  }

  /** Cents from the note expected, folded when any octave counts. */
  errorFor(hz: number, n: ExpectedNote): number {
    const c = centsFromSa(hz, this.saHz) - (100 * n.semi + 1200 * n.oct);
    return this.anyOctave ? foldOctave(c) : c;
  }

  addReading(r: Reading): void {
    this.readings.push(r);
  }

  /** Playing paused at time t: the notes expected from then on never sounded, and a note
   * sounding then ended there. Notes added after (going on) are scored as usual. */
  cut(t: number): void {
    for (const n of [...this.recent, ...this.pending]) if (n.t0 < t && n.t1 > t) n.t1 = t;
    const before = (n: ExpectedNote) => n.t0 < t - 1e-9;
    this.pending = this.pending.filter(before);
    this.recent = this.recent.filter(before);
  }

  /** The expected notes overlapping a stretch of time (for drawing). */
  notesBetween(a: number, b: number): ExpectedNote[] {
    return this.recent.filter((n) => n.t1 > a && n.t0 < b);
  }

  /** The latest reading against the note expected then (null when none is expected). */
  live(): { reading: Reading; note: ExpectedNote | null; cents: number } | null {
    const r = this.readings[this.readings.length - 1];
    if (!r) return null;
    const note = this.expectedAt(r.t - this.lag);
    return { reading: r, note, cents: note && r.hz ? this.errorFor(r.hz, note) : NaN };
  }

  /** Score every note whose readings are all in (up to the latest reading), and every line
   * that has finished. `final` scores the rest as well (playing stopped). */
  settle(final = false): { notes: NoteResult[]; lines: LineResult[] } {
    const latest = this.readings.length ? this.readings[this.readings.length - 1]!.t - this.lag : -Infinity;
    if (!final && latest - this.lastAlign >= 1) {
      this.lastAlign = latest;
      this.measureBehind(latest);
    }
    const notes: NoteResult[] = [];
    while (this.pending.length && (final || this.pending[0]!.t1 + 0.03 <= latest)) {
      const n = this.pending.shift()!;
      const r = this.scoreNote(n);
      notes.push(r);
      if (!n.judged) continue;
      this.results.push(r);
      const k = n.line + ':' + n.pass;
      if (!this.open.has(k)) this.open.set(k, []);
      this.open.get(k)!.push(r);
    }
    // A line is finished once a note of a later line or round is waiting, or at the end.
    const lines: LineResult[] = [];
    const next = this.pending.find((n) => n.judged);
    for (const [k, rs] of this.open) {
      const [line, pass] = k.split(':').map(Number) as [number, number];
      if (!final && !(next && (next.pass > pass || (next.pass === pass && next.line > line)))) continue;
      this.open.delete(k);
      const l = lineResult(line, pass, rs);
      this.lines.push(l);
      lines.push(l);
    }
    this.prune(latest);
    return { notes, lines };
  }

  /** The score of everything judged so far, unsung notes 0: by note time, and by line (each
   * line's rounds together). Null until something was sung. */
  summary(): { score: number; sung: number; lines: [number, number][] } | null {
    const sung = this.results.filter((r) => r.status === 'sung');
    if (sung.length < 4) return null;
    const judged = this.results.filter((r) => r.status !== 'short');
    const w = (rs: NoteResult[]) => rs.reduce((a, r) => a + (r.note.t1 - r.note.t0), 0);
    const mean = (rs: NoteResult[]) => rs.reduce((a, r) => a + r.score * (r.note.t1 - r.note.t0), 0) / w(rs);
    const byLine = new Map<number, NoteResult[]>();
    for (const r of judged) {
      if (!byLine.has(r.note.line)) byLine.set(r.note.line, []);
      byLine.get(r.note.line)!.push(r);
    }
    const lines = Array.from(byLine, ([line, rs]) => [line, Math.round(mean(rs))] as [number, number]).sort((a, b) => a[0] - b[0]);
    return { score: Math.round(mean(judged)), sung: w(sung) / Math.max(1e-9, w(judged)), lines };
  }

  /** A note's score: every reading while it played, each scored by how close it is (full
   * marks within 10 cents, nothing from 60 off) and nothing where there is no voice, averaged.
   * So a late, scooped or early-leaving voice counts against the note, as silence does (Rinat,
   * 2026-10-19; until then its first 100 ms and last 10 % were left out and the median
   * taken). Only `EDGE` at each end is left out, where a reading holds the next note too. */
  private scoreNote(n: ExpectedNote): NoteResult {
    const a = n.t0 + EDGE;
    const b = n.t1 - EDGE;
    const none = { note: n, cents: NaN, score: NaN, wobble: NaN, arrive: NaN };
    if (b - a < 0.03) return { ...none, status: 'short' };
    let errs: number[] = [];
    let count = 0;
    let total = 0;
    let arrive = NaN;
    let from = 0;
    for (const r of this.readings) {
      const t = r.t - this.lag;
      if (t < a || t > b) continue;
      count++;
      if (r.hz <= 0) continue;
      const e = this.errorFor(r.hz, n);
      total += noteScore(e);
      if (Number.isNaN(arrive) && Math.abs(e) <= 50) {
        arrive = t - n.t0;
        from = errs.length;
      }
      errs.push(e);
    }
    if (count < 2) return { ...none, status: 'short' };
    if (!errs.length) return { ...none, status: 'unsung', score: 0 };
    // The pitch it held: from when the voice reached the note (all of it, if it never did), so
    // a late start shows as late, not as off pitch.
    errs = errs.slice(from);
    const c = median(errs);
    const sd = Math.sqrt(errs.reduce((s, e) => s + (e - c) ** 2, 0) / errs.length);
    return { note: n, status: 'sung', cents: c, score: Math.round(total / count), wobble: sd, arrive };
  }

  /**
   * How far behind the guide the voice comes, from the last 10 s of singing: the shift at
   * which the most readings land within half a semitone of the note playing. Where several fit
   * as well (held notes), the one nearest none. Reported, never used to judge.
   */
  private measureBehind(latest: number): void {
    const from = latest - 10;
    const rs = this.readings.filter((r) => r.hz > 0 && r.t - this.lag >= from);
    if (rs.length < 60) return;
    const fit = (d: number) => {
      let hit = 0;
      for (const r of rs) {
        const n = this.expectedAt(r.t - this.lag - d);
        if (n && Math.abs(this.errorFor(r.hz, n)) < 50) hit++;
      }
      return hit / rs.length;
    };
    let best = 0;
    let bestFit = -1;
    for (let k = Math.round(BEHIND_RANGE[0] * 100); k <= Math.round(BEHIND_RANGE[1] * 100); k++) {
      const d = k / 100;
      const f = fit(d);
      if (f > bestFit + 1e-9 || (Math.abs(f - bestFit) <= 1e-9 && Math.abs(d) < Math.abs(best))) {
        bestFit = f;
        best = d;
      }
    }
    if (bestFit >= 0.4) this.behind = best;
  }

  /** Forget readings and notes more than 20 s old (scores are kept). */
  private prune(latest: number): void {
    const keep = latest - 20;
    if (this.readings.length > 2000) this.readings = this.readings.filter((r) => r.t - this.lag >= keep);
    if (this.recent.length > 500) this.recent = this.recent.filter((n) => n.t1 >= keep || this.pending.includes(n));
  }
}

function lineResult(line: number, pass: number, rs: readonly NoteResult[]): LineResult {
  const judged = rs.filter((r) => r.status !== 'short');
  const sung = judged.filter((r) => r.status === 'sung');
  const w = (x: readonly NoteResult[]) => x.reduce((a, r) => a + (r.note.t1 - r.note.t0), 0);
  const score = judged.length ? Math.round(judged.reduce((a, r) => a + r.score * (r.note.t1 - r.note.t0), 0) / w(judged)) : NaN;
  return { line, pass, score, sung: judged.length ? w(sung) / w(judged) : 0 };
}

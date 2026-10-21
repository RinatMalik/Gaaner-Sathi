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
 * judge. (Until 2026-10-19 the lag was fitted to the singing, which forgave lateness.) What is
 * not judged at all: no voice (a breath, a consonant, stopping early), the voice sliding into a
 * note, and readings the detector got wrong (Rinat, 2026-10-20).
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
  /** sung: voice for at least half of it; unsung: less (left out of the scores, but counted in
   * the share sung); short: too short to judge. */
  status: NoteStatus;
  /** The median distance of the voice from the note once it reached it, cents (sharp is
   * positive); NaN unless sung. The score, 0–100: the average of its readings with voice, from
   * the note's start, but for a slide into it; NaN unless sung. */
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
  /** Pitch score of the sung notes, by their time, 0–100 (NaN if none were sung); and the share
   * of the judged notes that were sung, 0–1. */
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

/** Cents between two pitches. */
const apart = (a: number, b: number): number => Math.abs(1200 * Math.log2(a / b));

/**
 * Whether a reading (`b`, Hz; 0 is no voice) is one the detector most likely got wrong, from
 * the readings either side of it: voice alone between two without, or more than a semitone
 * from both while they agree within one. It lasts about 20 ms, shorter than anything sung, and
 * drew a spike; it is read as no voice (Rinat, 2026-10-20: "micro spikes at random points").
 */
export function isGlitch(a: number, b: number, c: number): boolean {
  if (b <= 0) return false;
  if (a <= 0 && c <= 0) return true;
  if (a <= 0 || c <= 0) return false;
  return apart(a, c) < 100 && apart(a, b) > 100 && apart(b, c) > 100;
}

/** A step this big between readings with voice, cents, starts a new stretch of voice. */
export const SLIP_STEP = 1000;
/** A stretch of voice this short, readings (about 185 ms), can be a slip. */
export const SLIP_MAX = 8;
/** Silence this long, seconds, ends a stretch of voice. */
export const SLIP_GAP = 0.25;

interface Stretch {
  /** Readings with voice in it; when it began and its latest; their pitches, Hz. */
  n: number;
  t0: number;
  t1: number;
  hz0: number;
  hz: number;
  /** A later stretch has begun, or the silence after it outlasted SLIP_GAP. */
  ended: boolean;
  /** Kept or read as no voice, once known. */
  keep?: boolean;
}

/**
 * Readings that slipped to an overtone, read as no voice (Rinat, 2026-10-21: "the sudden jump
 * of the pitch line still exists"). On some vowels, at an onset or a consonant, the detector can
 * read a low voice's 2nd, 3rd or 4th harmonic (or the guide, heard through speakers) for up to
 * about 200 ms: 1200, 1900 or 2400 cents away, then straight back. A voice does not leap that far
 * and back so fast, so the voice is split into stretches at steps of `SLIP_STEP` or more, and a
 * stretch of at most `SLIP_MAX` readings next to a longer one (within `SLIP_GAP`) is a slip.
 * Smaller steps (a meend, a leap of a fifth, a grace note) are never touched. Readings carrying on
 * a stretch longer than `SLIP_MAX` go on at once; the start of any other stretch waits until its
 * fate is known (at most about twice `SLIP_MAX` readings).
 */
export class SlipFilter<R extends Reading = Reading> {
  /** Readings not passed on yet, each with its stretch (null: no voice). */
  private held: { r: R; s: Stretch | null }[] = [];
  /** Stretches whose fate is not known yet, in time order; the one decided just before them;
   * and the latest of all. */
  private open: Stretch[] = [];
  private before: Stretch | null = null;
  private last: Stretch | null = null;

  /** A reading in; the readings whose fate is now known out, in order. */
  push(r: R): R[] {
    const L = this.last;
    if (L && !L.ended && r.t - L.t1 > SLIP_GAP) L.ended = true;
    let s: Stretch | null = null;
    if (r.hz > 0) {
      if (L && !L.ended && apart(r.hz, L.hz) < SLIP_STEP) {
        s = L;
        L.n++;
        L.t1 = r.t;
        L.hz = r.hz;
      } else {
        if (L) L.ended = true;
        s = { n: 1, t0: r.t, t1: r.t, hz0: r.hz, hz: r.hz, ended: false };
        this.open.push(s);
        this.last = s;
      }
    }
    this.held.push({ r, s });
    this.decide();
    return this.release();
  }

  /** Playing stopped: everything held is decided on what is known. */
  flush(): R[] {
    if (this.last) this.last.ended = true;
    this.decide();
    return this.release();
  }

  private decide(): void {
    const near = (a: Stretch, b: Stretch) => b.t0 - a.t1 <= SLIP_GAP;
    while (this.open.length) {
      const S = this.open[0]!;
      const P = this.before;
      const N = this.open[1];
      let keep: boolean | undefined;
      if (S.n > SLIP_MAX) keep = true;
      else if (S.ended) {
        if (P?.keep && near(P, S) && P.n > S.n) keep = false;
        else if (N && near(S, N)) {
          if (N.n > S.n) keep = false;
          else if (N.ended) keep = true;
        } else keep = true;
      }
      if (keep == null) return;
      S.keep = keep;
      this.open.shift();
      // The voice coming back from a slip carries on the stretch before it, so it goes on at once.
      if (!keep && P?.keep && N && near(P, N) && apart(N.hz0, P.hz) < SLIP_STEP) N.n += P.n;
      this.before = keep || !P ? S : P;
    }
  }

  private release(): R[] {
    const out: R[] = [];
    while (this.held.length) {
      const h = this.held[0]!;
      if (h.s && h.s.keep == null) break;
      this.held.shift();
      out.push(h.s && !h.s.keep ? { ...h.r, hz: 0 } : h.r);
    }
    return out;
  }
}

/**
 * Whether a reading is the voice sliding into its note (a meend or a scoop), left out of the
 * score: since the note began every reading has been moving towards it, this one too, by at
 * least 10 cents (about 450 cents a second or faster), and it is not yet in tune (within 15
 * cents). The slide is over (`settled`) at the first reading that is not; a voice holding the
 * last note is not sliding, and counts (Rinat, 2026-10-20: "sliding in can be part of the
 * singing").
 */
export function sliding(prevErr: number | null, err: number, settled: boolean): boolean {
  return !settled && prevErr != null && Math.abs(err) > 15 && Math.abs(err) <= Math.abs(prevErr) - 10;
}

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
  /** The octave the voice sang in last time, against the notes, when any octave counts. */
  octave?: number;
}

/** Readings within a semitone of an octave of their note that it takes to change the octave the
 * voice is drawn in, and how many times more of them there must be than in the octave it was. */
const OCTAVE_MIN = 20;
const OCTAVE_LEAD = 2;

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
  /** The octave the voice sings in against the notes (−1: an octave below), when any octave
   * counts. The voice is drawn moved by it, all of it the same, so it never flips between
   * octaves reading by reading. It starts as last time (Rinat, 2026-10-21: until 2026-10-20 it
   * started at 0 and was found only after a second or more of singing, so a voice an octave
   * below was drawn at the foot of the strip and then jumped up), and changes when another is
   * clearly the most common over the last 10 s. */
  octave: number;
  /** Can change while singing: later notes follow it. */
  anyOctave: boolean;
  readonly saHz: number;
  /** Expected notes not yet scored, in time order. */
  private pending: ExpectedNote[] = [];
  /** Recent notes (scored or not), for lookups and measuring how far behind the voice is. */
  private recent: ExpectedNote[] = [];
  private readings: Reading[] = [];
  private lastAlign = -Infinity;
  private lastOctave = -Infinity;
  /** Every note scored so far, and each line as it finishes. */
  readonly results: NoteResult[] = [];
  readonly lines: LineResult[] = [];
  private open = new Map<string, NoteResult[]>();

  constructor(o: TrackerOptions) {
    this.lag = o.lag;
    this.anyOctave = o.anyOctave;
    this.saHz = o.saHz;
    this.octave = o.anyOctave ? (o.octave ?? 0) : 0;
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
    if (!final && latest - this.lastOctave >= 0.25) {
      this.lastOctave = latest;
      this.measureOctave(latest);
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

  /** The score of everything sung so far: by note time, and by line (each line's rounds
   * together). Null until enough was sung to say. */
  summary(): { score: number; sung: number; lines: [number, number][] } | null {
    const sung = this.results.filter((r) => r.status === 'sung');
    if (sung.length < 4) return null;
    const judged = this.results.filter((r) => r.status !== 'short');
    const w = (rs: NoteResult[]) => rs.reduce((a, r) => a + (r.note.t1 - r.note.t0), 0);
    const mean = (rs: NoteResult[]) => rs.reduce((a, r) => a + r.score * (r.note.t1 - r.note.t0), 0) / w(rs);
    const byLine = new Map<number, NoteResult[]>();
    for (const r of sung) {
      if (!byLine.has(r.note.line)) byLine.set(r.note.line, []);
      byLine.get(r.note.line)!.push(r);
    }
    const lines = Array.from(byLine, ([line, rs]) => [line, Math.round(mean(rs))] as [number, number]).sort((a, b) => a[0] - b[0]);
    return { score: Math.round(mean(sung)), sung: w(sung) / Math.max(1e-9, w(judged)), lines };
  }

  /** A note's score: every reading with voice while it played, each scored by how close it is
   * (full marks within 10 cents, nothing from 60 off), averaged. A voice late on the last note
   * or leaving early for the next counts against it (Rinat, 2026-10-19); no voice, and a slide
   * into the note, are left out (2026-10-20). A note with voice for under half of it is not
   * sung: left out of the scores. Only `EDGE` at each end is left out, where a reading holds the
   * next note too. (Until 2026-10-19 the median over its middle, from 100 ms in to its last
   * 10 %.) */
  private scoreNote(n: ExpectedNote): NoteResult {
    const a = n.t0 + EDGE;
    const b = n.t1 - EDGE;
    const none = { note: n, cents: NaN, score: NaN, wobble: NaN, arrive: NaN };
    if (b - a < 0.03) return { ...none, status: 'short' };
    let errs: number[] = [];
    let count = 0;
    let total = 0;
    let scored = 0;
    let arrive = NaN;
    let from = 0;
    /** The reading before's distance from this note (null: no voice), and whether a slide into
     * it is over, to tell a slide. */
    let prev: number | null = null;
    let settled = false;
    for (const r of this.readings) {
      const t = r.t - this.lag;
      if (t > b) continue;
      if (t < a) {
        if (t > a - 0.06) prev = r.hz > 0 ? this.errorFor(r.hz, n) : null;
        continue;
      }
      count++;
      if (r.hz <= 0) {
        prev = null;
        continue;
      }
      const e = this.errorFor(r.hz, n);
      const arrived = !Number.isNaN(arrive);
      if (sliding(prev, e, settled)) {
        // A slide into the note: left out.
      } else {
        settled = true;
        total += noteScore(e);
        scored++;
      }
      if (!arrived && Math.abs(e) <= 50) {
        arrive = t - n.t0;
        from = errs.length;
      }
      errs.push(e);
      prev = e;
    }
    if (count < 2) return { ...none, status: 'short' };
    if (errs.length < Math.max(2, 0.5 * count)) return { ...none, status: 'unsung' };
    // Slid the whole way without arriving: it all counts.
    if (!scored) {
      total = errs.reduce((s, e) => s + noteScore(e), 0);
      scored = errs.length;
    }
    // The pitch it held: from when the voice reached the note (all of it, if it never did), so
    // a late start shows as late, not as off pitch.
    errs = errs.slice(from);
    const c = median(errs);
    const sd = Math.sqrt(errs.reduce((s, e) => s + (e - c) ** 2, 0) / errs.length);
    return { note: n, status: 'sung', cents: c, score: Math.round(total / scored), wobble: sd, arrive };
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

  /** The octave sung in, from the last 10 s: among readings within a semitone of an octave of
   * their note, the most common, once it has `OCTAVE_MIN` of them and `OCTAVE_LEAD` times as
   * many as the octave it was. */
  private measureOctave(latest: number): void {
    if (!this.anyOctave) {
      this.octave = 0;
      return;
    }
    const tally = new Map<number, number>();
    for (const r of this.readings) {
      if (!(r.hz > 0) || r.t - this.lag < latest - 10) continue;
      const n = this.expectedAt(r.t - this.lag - (this.behind ?? 0));
      if (!n) continue;
      const c = centsFromSa(r.hz, this.saHz) - (100 * n.semi + 1200 * n.oct);
      const k = Math.round(c / 1200);
      if (Math.abs(c - 1200 * k) < 100) tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    let best = this.octave;
    let most = 0;
    for (const [k, v] of tally) if (v > most) [most, best] = [v, k];
    if (best !== this.octave && most >= OCTAVE_MIN && most >= OCTAVE_LEAD * (tally.get(this.octave) ?? 0)) this.octave = best;
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
  const score = sung.length ? Math.round(sung.reduce((a, r) => a + r.score * (r.note.t1 - r.note.t0), 0) / w(sung)) : NaN;
  return { line, pass, score, sung: judged.length ? w(sung) / w(judged) : 0 };
}

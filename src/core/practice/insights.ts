/**
 * What a practice session shows (docs/ENGINE.md → Session reports): its numbers, worked out
 * from the session's detail (session.ts) and the practice log, and what went well and what to
 * work on in plain words, for the report and the file for AI (Rinat, 2026-10-20: "what were
 * good, what needs improving, whether i kept to the note well but came in too late"). Nothing
 * is re-scored: the notes' scores are the ones shown while singing. Pure, so tested in Node.
 */
import { centsFromSa, foldOctave } from '../pitch/track';
import { noteTally, type LogEntry } from './log';
import type { NoteRow, SessionDetail } from './session';

/** A note's score: in tune from 85, close from 60 (as the Practice view colours them). */
export const GOOD = 85;
export const OK = 60;
/** Cents from the note: in tune within 15, close within 35 (as the gauge). */
export const IN_TUNE = 15;
export const CLOSE = 35;
/** Reaching a new note: on time within 0.1 s, a little late within 0.25 s. */
export const ON_TIME = 0.1;
export const LATE = 0.25;
/** A jump of this many semitones or more is a leap; 1 or 2 a step. */
export const LEAP = 5;

const NAMES = ['Sa', 'komal Re', 'Re', 'komal Ga', 'Ga', 'Ma', 'tivra Ma', 'Pa', 'komal Dha', 'Dha', 'komal Ni', 'Ni'];
const OCT_WORDS: Record<number, string> = { [-2]: 'lowest ', [-1]: 'lower ', 0: '', 1: 'upper ', 2: 'highest ' };
/** A note in words: "komal Ga", "upper Sa". */
export const noteWords = (semi: number, oct: number): string => (OCT_WORDS[oct] ?? '') + (NAMES[semi] ?? '?');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface SwaraStat {
  semi: number;
  oct: number;
  /** How many times it was sung, its average score, and its median distance from the note. */
  n: number;
  score: number;
  cents: number;
}
export interface LineStat {
  line: number;
  /** Its score over the rounds sung (null: none of it sung), the rounds, the share sung. */
  score: number | null;
  rounds: number;
  sung: number;
  /** How far behind the music the voice came on it, seconds (null: not enough to say). */
  behind: number | null;
}
export interface Timing {
  /** How far behind the music the voice came over the session, seconds (negative: ahead). */
  behind: number | null;
  /** New notes (a change of note, or after a rest) sung: how long the voice took to reach them
   * (median, seconds), and the share reached on time, a little late, late and never. */
  n: number;
  arrive: number | null;
  onTime: number;
  littleLate: number;
  late: number;
  never: number;
  /** The median time to reach a leap and a step, when there were three or more of each. */
  leap: number | null;
  step: number | null;
}
export interface Insights {
  score: number | null;
  /** Share of the notes' time sung, 0–1. */
  sung: number | null;
  counts: { judged: number; sung: number; unsung: number; good: number; ok: number; off: number };
  /** Of the notes sung: the median distance from the note (signed and not), the share within
   * IN_TUNE, the median wobble. */
  pitch: { median: number; medianAbs: number; inTune: number; wobble: number } | null;
  timing: Timing | null;
  swaras: SwaraStat[];
  lines: LineStat[];
  /** Each loop round's score, when there were two or more. */
  rounds: { round: number; score: number }[];
  /** Earlier sessions of the song with a score, oldest first (the last 12). */
  history: { at: number; score: number }[];
  /** The session in a sentence: "You kept to the notes well, but came in late." */
  headline: string;
  good: string[];
  work: string[];
  /** What to bear in mind reading it. */
  notes: string[];
}

const median = (v: readonly number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const dur = (n: NoteRow) => n.t1 - n.t0;
/** Notes' score weighted by their length, as the tracker's summary; null when none. */
function weighted(rows: readonly NoteRow[]): number | null {
  const sung = rows.filter((r) => r.status === 'sung' && r.score != null);
  const w = sung.reduce((a, r) => a + dur(r), 0);
  return w > 0 ? Math.round(sung.reduce((a, r) => a + r.score! * dur(r), 0) / w) : null;
}
const pitchOf = (n: NoteRow) => n.semi + 12 * n.oct;
const ms = (s: number) => Math.round(Math.abs(s) * 100) * 10 + ' ms';

/**
 * How far behind the music the voice came: the shift (−0.2 to 0.6 s) at which most readings
 * with voice land within half a semitone of the note playing; where several fit as well, the
 * one nearest none. As the tracker measures it while singing, over the whole session (or the
 * `windows` given, seconds as sung). Null under 30 readings or a fit under 40 %.
 */
export function bestShift(d: Pick<NonNullable<SessionDetail['pitch']>, 'readings' | 'notes' | 'lag' | 'anyOctave'>, saHz: number, windows?: readonly [number, number][]): number | null {
  const notes = d.notes.filter((n) => n.status !== 'short').sort((a, b) => a.t0 - b.t0);
  const rs: [number, number][] = [];
  for (let i = 0; i + 1 < d.readings.length; i += 2) {
    const t = d.readings[i]! - d.lag;
    const hz = d.readings[i + 1]!;
    if (hz > 0 && (!windows || windows.some(([a, b]) => t >= a && t < b))) rs.push([t, hz]);
  }
  if (rs.length < 30 || !notes.length) return null;
  // Long sessions: an even sample is plenty.
  const step = Math.max(1, Math.floor(rs.length / 12000));
  const use = step > 1 ? rs.filter((_, i) => i % step === 0) : rs;
  const at = (t: number): NoteRow | null => {
    let lo = 0;
    let hi = notes.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      const n = notes[m]!;
      if (t < n.t0) hi = m - 1;
      else if (t >= n.t1) lo = m + 1;
      else return n;
    }
    return null;
  };
  let best = 0;
  let bestFit = -1;
  for (let k = -20; k <= 60; k++) {
    const s = k / 100;
    let hit = 0;
    for (const [t, hz] of use) {
      const n = at(t - s);
      if (!n) continue;
      const c = centsFromSa(hz, saHz) - (100 * n.semi + 1200 * n.oct);
      if (Math.abs(d.anyOctave ? foldOctave(c) : c) < 50) hit++;
    }
    const f = hit / use.length;
    if (f > bestFit + 1e-9 || (Math.abs(f - bestFit) <= 1e-9 && Math.abs(s) < Math.abs(best))) {
      bestFit = f;
      best = s;
    }
  }
  return bestFit >= 0.4 ? best : null;
}

/** New notes and the step to each: a change of note from the one just before (null after a
 * rest or at the start). */
function newNotes(rows: readonly NoteRow[]): { n: NoteRow; jump: number | null }[] {
  const s = rows.filter((r) => r.status !== 'short').sort((a, b) => a.t0 - b.t0);
  const out: { n: NoteRow; jump: number | null }[] = [];
  s.forEach((n, i) => {
    const p = s[i - 1];
    const joined = p && p.t1 >= n.t0 - 0.05;
    if (joined && pitchOf(p) === pitchOf(n)) return;
    out.push({ n, jump: joined ? Math.abs(pitchOf(n) - pitchOf(p)) : null });
  });
  return out;
}

/**
 * The session's numbers and findings. `log` is the whole practice log (for the song's earlier
 * scores); `detail` is null for sessions from before details were kept (2026-10-20), whose
 * report has only what the log has.
 */
export function analyse(e: LogEntry, detail: SessionDetail | null, log: readonly LogEntry[]): Insights {
  const p = detail?.pitch && detail.pitch.notes.length ? detail.pitch : null;
  const rows = p ? p.notes.filter((r) => r.status !== 'short') : [];
  const sungRows = rows.filter((r) => r.status === 'sung' && r.score != null);
  const ins: Insights = {
    score: e.score ?? (p ? weighted(rows) : null),
    sung: null,
    counts: { judged: rows.length, sung: sungRows.length, unsung: rows.length - sungRows.length, good: 0, ok: 0, off: 0 },
    pitch: null,
    timing: null,
    swaras: [],
    lines: [],
    rounds: [],
    history: log.filter((x) => x.song === e.song && x.at < e.at && x.score != null).slice(-12).map((x) => ({ at: x.at, score: x.score! })),
    headline: '',
    good: [],
    work: [],
    notes: [],
  };
  const saHz = detail?.played.saHz ?? 261.63;

  if (p) {
    const all = rows.reduce((a, r) => a + dur(r), 0);
    ins.sung = all > 0 ? sungRows.reduce((a, r) => a + dur(r), 0) / all : null;
    for (const r of sungRows) {
      if (r.score! >= GOOD) ins.counts.good++;
      else if (r.score! >= OK) ins.counts.ok++;
      else ins.counts.off++;
    }
    const cents = sungRows.map((r) => r.cents).filter((c): c is number => c != null);
    if (cents.length) {
      const wob = sungRows.map((r) => r.wobble).filter((c): c is number => c != null);
      ins.pitch = {
        median: median(cents),
        medianAbs: median(cents.map(Math.abs)),
        inTune: cents.filter((c) => Math.abs(c) <= IN_TUNE).length / cents.length,
        wobble: wob.length ? median(wob) : 0,
      };
    }
    // Timing: the session's shift, and how soon each new note was reached.
    const fresh = newNotes(rows).filter((x) => x.n.status === 'sung');
    const arr = fresh.map((x) => x.n.arrive);
    const reached = arr.filter((a): a is number => a != null);
    const share = (f: (a: number | null) => boolean) => (fresh.length ? arr.filter(f).length / fresh.length : 0);
    const leapA = fresh.filter((x) => x.jump != null && x.jump >= LEAP && x.n.arrive != null).map((x) => x.n.arrive!);
    const stepA = fresh.filter((x) => x.jump != null && x.jump >= 1 && x.jump <= 2 && x.n.arrive != null).map((x) => x.n.arrive!);
    ins.timing = {
      behind: bestShift(p, saHz),
      n: fresh.length,
      arrive: reached.length ? median(reached) : null,
      onTime: share((a) => a != null && a < ON_TIME),
      littleLate: share((a) => a != null && a >= ON_TIME && a < LATE),
      late: share((a) => a != null && a >= LATE),
      never: share((a) => a == null),
      leap: leapA.length >= 3 ? median(leapA) : null,
      step: stepA.length >= 3 ? median(stepA) : null,
    };
    // Each note of the scale (as the practice log keeps it).
    ins.swaras = noteTally(rows).map(([k, n, score, cents]) => ({ semi: ((k % 12) + 12) % 12, oct: Math.floor(k / 12), n, score, cents }));
    // Each line, its rounds together; and each round.
    const lineIds = Array.from(new Set(rows.map((r) => r.line))).sort((a, b) => a - b);
    ins.lines = lineIds.map((line) => {
      const rs = rows.filter((r) => r.line === line);
      const passes = Array.from(new Set(rs.map((r) => r.pass)));
      const w = rs.reduce((a, r) => a + dur(r), 0);
      const windows = passes.map((k) => {
        const q = rs.filter((r) => r.pass === k);
        return [Math.min(...q.map((r) => r.t0)), Math.max(...q.map((r) => r.t1))] as [number, number];
      });
      return {
        line, score: weighted(rs), rounds: passes.length,
        sung: w > 0 ? rs.filter((r) => r.status === 'sung').reduce((a, r) => a + dur(r), 0) / w : 0,
        behind: bestShift(p, saHz, windows),
      };
    });
    const passes = Array.from(new Set(rows.map((r) => r.pass))).sort((a, b) => a - b);
    if (passes.length > 1) {
      for (const k of passes) {
        const q = rows.filter((r) => r.pass === k);
        const w = q.reduce((a, r) => a + dur(r), 0);
        const sung = w > 0 ? q.filter((r) => r.status === 'sung').reduce((a, r) => a + dur(r), 0) / w : 0;
        const s = weighted(q);
        // A round mostly not sung says nothing about how the rounds went: the loop going on after
        // the singer stopped (Rinat, 2026-10-21), or playing stopped early in it.
        if (s != null && sung >= 0.5) ins.rounds.push({ round: k, score: s });
        else ins.notes.push('Round ' + (k + 1) + ' was hardly sung (' + Math.round(sung * 100) + '% of its notes), so it is left out of the rounds compared.');
      }
    }
  } else if (e.lines) {
    ins.lines = e.lines.map(([line, score]) => ({ line, score, rounds: 0, sung: 1, behind: null }));
  }
  findings(ins, e, detail);
  ins.headline = headline(ins);
  return ins;
}

/** The session in a sentence: how close to the notes, and how in time. */
function headline(ins: Insights): string {
  const p = ins.pitch;
  const b = ins.timing?.behind ?? null;
  if (!p) return ins.score != null ? 'Your score: ' + ins.score + '.' : ins.counts.judged ? 'No singing was heard this time.' : 'No pitch check this time.';
  const pitchOk = p.medianAbs <= 20;
  const pitch = p.medianAbs <= 12 ? 'You kept to the notes well' : pitchOk ? 'You were close to the notes' : 'You were often off the notes';
  if (b == null) return pitch + '.';
  const timeOk = Math.abs(b) < 0.06;
  const time = b >= 0.1 ? 'came in late' : b >= 0.06 ? 'came in a little late' : b <= -0.06 ? 'came in early' : 'kept time with the music';
  return pitch + (pitchOk === timeOk ? ' and ' : ', but ') + time + '.';
}

/** What went well, what to work on, and what to bear in mind, in plain words. */
function findings(ins: Insights, e: LogEntry, detail: SessionDetail | null): void {
  const { good, work, notes } = ins;
  const p = ins.pitch;
  const t = ins.timing;
  const behind = t?.behind ?? null;
  const late = behind != null && behind >= 0.1;

  // Pitch, and timing with it: in tune but late is said as one.
  if (p) {
    if (p.medianAbs <= 12 && late) {
      good.push('You keep to the notes well: once you reach a note, you are usually within ' + Math.round(p.medianAbs) + ' cents of it.');
      work.push('You come in late: about ' + ms(behind!) + ' behind the music. Start each note with the harmonium, not after you hear it.');
    } else {
      if (p.medianAbs <= 12) good.push('Once you reach a note you hold it in tune: usually within ' + Math.round(p.medianAbs) + ' cents of it.');
      else if (p.medianAbs <= 20) good.push('Your notes are close: usually within ' + Math.round(p.medianAbs) + ' cents (a semitone is 100).');
      else work.push('Your notes are often off: usually ' + Math.round(p.medianAbs) + ' cents from the note (a semitone is 100; in tune is within ' + IN_TUNE + ').');
      if (late) work.push('You come in late: about ' + ms(behind!) + ' behind the music. Start each note with the harmonium, not after you hear it.');
    }
    if (p.median >= 10) work.push('You tend to sing a little sharp (high): about +' + Math.round(p.median) + ' cents.');
    else if (p.median <= -10) work.push('You tend to sing a little flat (low): about −' + Math.round(-p.median) + ' cents.');
    if (p.wobble <= 12) good.push('Your notes are steady.');
    else if (p.wobble >= 25) work.push('Your notes waver, by about ±' + Math.round(p.wobble) + ' cents: hold them steadier.');
  }
  if (t) {
    if (behind != null && behind > -0.06 && behind < 0.06) good.push('You keep time with the music.');
    else if (behind != null && behind >= 0.06 && behind < 0.1) work.push('You come in a little behind the music: about ' + ms(behind) + '.');
    else if (behind != null && behind <= -0.06) work.push('You come in ahead of the music: about ' + ms(behind) + ' early.');
    // Slow to settle, beyond coming in late.
    if (t.arrive != null && t.arrive - Math.max(0, behind ?? 0) >= 0.1) {
      work.push('You take a while to settle on each new note: about ' + ms(t.arrive) + '. Aim for the note itself straight away.');
    }
    if (t.leap != null && t.step != null) {
      if (t.leap - t.step >= 0.08) work.push('Big jumps (' + LEAP + ' semitones or more) take you longer to reach: ' + ms(t.leap) + ', against ' + ms(t.step) + ' for nearby notes. Practise the jumps slowly.');
      else if (t.leap - t.step < 0.04) good.push('You reach big jumps as quickly as nearby notes.');
    }
    if (t.n >= 5 && t.never >= 0.1) work.push(Math.round(t.never * 100) + '% of the new notes you sang were never quite reached (within half a semitone).');
  }
  // Each note of the scale: the ones off, and the ones spot on.
  const off = ins.swaras.filter((s) => s.n >= 3 && Math.abs(s.cents) >= 20).sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents)).slice(0, 3);
  for (const s of off) work.push(cap(noteWords(s.semi, s.oct)) + ' is usually ' + (s.cents > 0 ? 'sharp: +' : 'flat: −') + Math.abs(s.cents) + ' cents (' + s.n + ' times).');
  const spot = ins.swaras.filter((s) => s.n >= 3 && Math.abs(s.cents) <= 8 && s.score >= 90).sort((a, b) => b.n - a.n).slice(0, 3);
  if (spot.length) good.push(cap(spot.map((s) => noteWords(s.semi, s.oct)).join(', ').replace(/, ([^,]*)$/, ' and $1')) + (spot.length > 1 ? ' are' : ' is') + ' spot on.');
  // Lines and rounds.
  const scored = ins.lines.filter((l): l is LineStat & { score: number } => l.score != null);
  if (scored.length > 1) {
    const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = scored.reduce((a, b) => (b.score < a.score ? b : a));
    if (best.score - worst.score >= 5) good.push('Your best line: line ' + (best.line + 1) + ' (' + best.score + ').');
    if (best.score - worst.score >= 10) work.push('Line ' + (worst.line + 1) + ' needs the most practice (' + worst.score + ').');
  }
  const lateLines = ins.lines.filter((l) => l.behind != null && l.behind >= 0.15 && !(behind != null && l.behind - behind < 0.08));
  if (lateLines.length && lateLines.length <= 3) work.push('You come in latest on line' + (lateLines.length > 1 ? 's ' : ' ') + lateLines.map((l) => l.line + 1).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.');
  const R = ins.rounds;
  if (R.length > 1) {
    const a = R[0]!;
    const b = R[R.length - 1]!;
    if (b.score - a.score >= 5) good.push('You got better round by round: ' + a.score + ' in round 1, ' + b.score + ' in round ' + (b.round + 1) + '.');
    else if (a.score - b.score >= 5) work.push('Your score fell in later rounds (' + a.score + ' in round 1, ' + b.score + ' in round ' + (b.round + 1) + '): take a break, or slow down.');
  }
  if (ins.sung != null && ins.sung < 0.6 && ins.counts.judged >= 8) work.push('You sang only ' + Math.round(ins.sung * 100) + '% of the notes; the rest are left out of the score.');
  // Against earlier sessions.
  const H = ins.history;
  if (ins.score != null && H.length) {
    const last = H[H.length - 1]!;
    const d = ins.score - last.score;
    if (ins.score > Math.max(...H.map((h) => h.score))) good.push('Your best score for this song so far.');
    else if (d >= 3) good.push('Up ' + d + ' on last time (' + last.score + ').');
    if (d <= -3) work.push(-d + ' lower than last time (' + last.score + ').');
  }
  // What to bear in mind.
  if (!detail) notes.push('This session is from before the app kept each session’s detail (20 October 2026), so only its score and lines are known.');
  else if (!detail.pitch || !detail.pitch.notes.length) notes.push('Check my pitch was off, so there is nothing on pitch or timing. Switch it on before you play to get them.');
  else if (!ins.counts.sung) notes.unshift('The pitch check was on but heard no singing. If you were singing, check the microphone: plugged in, its level up, and the one the browser is using.');
  if (detail?.pitch && !detail.pitch.measured) notes.push('The device’s delay was not measured, so some of the lateness may be your headphones or speakers. Measure it once with Measure the delay, at the foot of the song’s lines on the Practice view.');
  if (detail?.pitch?.anyOctave && detail.pitch.octave) notes.push('You sang ' + (Math.abs(detail.pitch.octave) === 1 ? 'an octave' : Math.abs(detail.pitch.octave) + ' octaves') + (detail.pitch.octave < 0 ? ' below' : ' above') + ' the notes, which counts as right.');
  if (p && ins.counts.sung < 12) notes.push('Only ' + ins.counts.sung + ' notes were sung, so these findings are rough.');
  if (e.secs < 30 && detail?.pitch) notes.push('A short session: ' + Math.round(e.secs) + ' seconds.');
}

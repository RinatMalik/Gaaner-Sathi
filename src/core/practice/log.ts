/**
 * The practice log (docs/DATA.md → Practice log): one entry each time a song or exercise
 * is practised, and what the Progress view and the library work out from it. Pure, so it
 * is tested in Node.
 */

export interface LogEntry {
  /** When the first beat sounded (after any count-in), ms since epoch. */
  at: number;
  /** Seconds practised, from the first beat to the stop. */
  secs: number;
  /** The song or exercise, and its title at the time (songs get renamed or deleted). */
  song: string;
  title: string;
  /** Lines practised, 0-based and inclusive, and whether they looped. */
  from: number;
  to: number;
  loop: boolean;
  /** Rounds begun: 1 without a loop. */
  rounds: number;
  /** Tempo at the start, and the highest reached (the tempo trainer). */
  tempo: number;
  top: number;
  /** Pitch score, 0–100, when pitch feedback was on. */
  score?: number;
  /** Pitch score per line sung: [line, score]. */
  lines?: [number, number][];
  /** The rewaz routine this was part of. */
  routine?: string;
}

/** Shorter practice is not logged: a quick listen is not practice. */
export const MIN_LOG_SECS = 10;

export const LOG_FILE_FORMAT = 'gaaner-sathi-log';
export const LOG_FILE_VERSION = 1;

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = num(v, lo, hi);
  return n == null ? null : Math.round(n);
};

/** A stored entry, checked: null when it is damaged beyond use. */
export function cleanEntry(v: unknown): LogEntry | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const at = num(o.at, 0, 8.64e15);
  const secs = num(o.secs, 0, 86_400);
  if (at == null || secs == null || typeof o.song !== 'string' || !o.song) return null;
  const from = int(o.from, 0, 10_000) ?? 0;
  const e: LogEntry = {
    at,
    secs: Math.round(secs),
    song: o.song,
    title: typeof o.title === 'string' ? o.title.slice(0, 200) : '',
    from,
    to: Math.max(from, int(o.to, 0, 10_000) ?? from),
    loop: o.loop === true,
    rounds: int(o.rounds, 1, 10_000) ?? 1,
    tempo: int(o.tempo, 30, 240) ?? 100,
    top: 0,
  };
  e.top = Math.max(e.tempo, int(o.top, 30, 240) ?? e.tempo);
  const score = int(o.score, 0, 100);
  if (score != null) e.score = score;
  if (Array.isArray(o.lines)) {
    const lines = o.lines
      .filter((x): x is [number, number] => Array.isArray(x) && int(x[0], 0, 10_000) != null && int(x[1], 0, 100) != null)
      .map((x) => [int(x[0], 0, 10_000)!, int(x[1], 0, 100)!] as [number, number]);
    if (lines.length) e.lines = lines;
  }
  if (typeof o.routine === 'string' && o.routine) e.routine = o.routine.slice(0, 200);
  return e;
}

export const cleanLog = (v: unknown): LogEntry[] =>
  (Array.isArray(v) ? v.map(cleanEntry).filter((e): e is LogEntry => !!e) : []).sort((a, b) => a.at - b.at);

/** The local calendar day of a time, as a whole number (days since 1970 in local time). */
export function dayNumber(at: number): number {
  const d = new Date(at);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

/** When each song was last practised (the start of its latest entry). */
export function lastPractised(log: readonly LogEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of log) if (e.at > (m.get(e.song) ?? -1)) m.set(e.song, e.at);
  return m;
}

/**
 * Days in a row with some practice: the current run (counting today, or up to yesterday
 * when nothing is logged yet today) and the longest ever.
 */
export function streaks(log: readonly LogEntry[], now: number): { current: number; best: number } {
  const days = Array.from(new Set(log.map((e) => dayNumber(e.at)))).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1]! + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const have = new Set(days);
  const today = dayNumber(now);
  let d = have.has(today) ? today : today - 1;
  let current = 0;
  while (have.has(d)) {
    current++;
    d--;
  }
  return { current, best };
}

export interface DaySummary {
  day: number;
  secs: number;
  entries: LogEntry[];
}

/** The log by day, newest day first; each day's entries in the order practised. */
export function byDay(log: readonly LogEntry[]): DaySummary[] {
  const m = new Map<number, DaySummary>();
  for (const e of log) {
    const day = dayNumber(e.at);
    let s = m.get(day);
    if (!s) m.set(day, (s = { day, secs: 0, entries: [] }));
    s.secs += e.secs;
    s.entries.push(e);
  }
  for (const s of m.values()) s.entries.sort((a, b) => a.at - b.at);
  return Array.from(m.values()).sort((a, b) => b.day - a.day);
}

/** Seconds practised on each of the last `n` days, oldest first, ending today. */
export function lastDays(log: readonly LogEntry[], now: number, n: number): { day: number; secs: number }[] {
  const today = dayNumber(now);
  const out = Array.from({ length: n }, (_, i) => ({ day: today - n + 1 + i, secs: 0 }));
  for (const e of log) {
    const i = dayNumber(e.at) - (today - n + 1);
    if (i >= 0 && i < n) out[i]!.secs += e.secs;
  }
  return out;
}

export interface SongTotal {
  song: string;
  title: string;
  times: number;
  secs: number;
  last: number;
  /** The latest and the best pitch score, when any session had one. */
  lastScore?: number;
  bestScore?: number;
}

/** Each song's totals, most practised (by time) first. The title is the latest one logged. */
export function songTotals(log: readonly LogEntry[]): SongTotal[] {
  const m = new Map<string, SongTotal>();
  for (const e of log) {
    let t = m.get(e.song);
    if (!t) m.set(e.song, (t = { song: e.song, title: e.title, times: 0, secs: 0, last: 0 }));
    t.times++;
    t.secs += e.secs;
    if (e.at >= t.last) {
      t.last = e.at;
      if (e.title) t.title = e.title;
      if (e.score != null) t.lastScore = e.score;
    }
    if (e.score != null) t.bestScore = Math.max(t.bestScore ?? 0, e.score);
  }
  return Array.from(m.values()).sort((a, b) => b.secs - a.secs || b.last - a.last);
}

/** The text of an exported log file. `exported` is YYYY-MM-DD. */
export function logFileText(log: readonly LogEntry[], exported: string): string {
  return JSON.stringify({ format: LOG_FILE_FORMAT, version: LOG_FILE_VERSION, exported, entries: log }, null, 2);
}

/** "1 h 5 min", "12 min", "40 s". */
export function durationText(secs: number): string {
  const s = Math.round(secs);
  if (s < 60) return s + ' s';
  const m = Math.round(s / 60);
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
}

/** A song's length to the second: "3 min 20 s", "45 s", "1 h 2 min". */
export function lengthText(secs: number): string {
  const s = Math.round(secs);
  if (s < 60) return s + ' s';
  if (s < 3600) return Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '');
  const m = Math.round(s / 60);
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
}

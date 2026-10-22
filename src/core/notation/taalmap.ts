/**
 * Where each beat of a song falls in its taal (docs/NOTATION.md → A taal per section). A song
 * plays in its own taal; a section whose heading names another (taal pherta: "# অন্তরা ·
 * কাহারবা") plays in that one, and the sections after it go back to the song's. The song's
 * first beat falls on the song's "starts on" beat; wherever the taal changes, the new taal
 * starts on sam. Pure, so it is tested in Node.
 */
import { taalInfo, type TaalId, type TaalInfo } from '../taal/taals';
import { endHeadings, songSections, type SongSection } from './sections';
import type { ParsedSong } from './types';

/** A stretch of the song in one taal, from song beat `from`: beat g falls on taal beat
 * (g + off) mod T.cycle, 0 being sam. */
export interface TaalRun<T = TaalInfo> {
  from: number;
  T: T;
  off: number;
}

/** A song's taal, beat by beat. */
export interface Taals<T = TaalInfo> {
  /** The runs in the song's order; the first starts at beat 0. */
  runs: readonly TaalRun<T>[];
  /** The run of notes line n (the last run for a line not written yet). */
  line(n: number): TaalRun<T>;
  /** The run of song beat g: before the song, the first; after it, the last line's. */
  beat(g: number): TaalRun<T>;
  /** The run a new line at the end of the song goes in: the last line's, or a heading's
   * written after it. */
  end: TaalRun<T>;
  /** Whether any of the song is in a taal other than its own: a section's heading names one. */
  changes: boolean;
}

/** One taal for the whole song, its first beat on taal beat off + 1. */
export function oneTaal<T>(T: T, off: number): Taals<T> {
  const r: TaalRun<T> = { from: 0, T, off };
  return { runs: [r], line: () => r, beat: () => r, end: r, changes: false };
}

/**
 * A song played in one taal picked over its own (the top section's taal picker, Rinat
 * 2026-10-22): every section in it, its first beat as many beats before sam as in the song's own
 * first taal, so a song coming in on the 13th beat of Teentaal comes in on the 5th of Keherwa.
 */
export function inOneTaal<T extends { cycle: number }>(own: Taals<T>, T: T): Taals<T> {
  const r = own.runs[0]!;
  const before = (r.T.cycle - (r.off % r.T.cycle)) % r.T.cycle;
  return oneTaal(T, (T.cycle - (before % T.cycle)) % T.cycle);
}

/** What the notation functions take: a song's taal map, or one taal for the whole song with
 * its first beat on taal beat off + 1 (as the prototype's functions took them). */
export const asTaals = <T extends object>(t: T | Taals<T>, off = 0): Taals<T> => ('runs' in t && 'line' in t ? (t as Taals<T>) : oneTaal(t as T, off));

/** A taal beat: its taal, where it is in the cycle (0: sam), and how many cycles into its run. */
export function placeIn<T extends { cycle: number }>(r: TaalRun<T>, g: number): { T: T; p: number; cyc: number } {
  const k = g + r.off;
  const n = r.T.cycle;
  return { T: r.T, p: ((k % n) + n) % n, cyc: Math.floor(k / n) };
}

/**
 * The taal map of a song: its taal (`taal`, an id) and the beat its first beat falls on
 * (`startOn`, 1-based), and the taals its section headings name. Sections without one are in
 * the song's taal (as a section without a tempo is at the song's tempo).
 */
export function taalMap(text: string, P: ParsedSong, taal: string, startOn: number, S: readonly SongSection[] = songSections(text, P)): Taals {
  const song = taalInfo(taal);
  const of = (id: TaalId | undefined) => (id ? taalInfo(id) : song);
  const first = (T: TaalInfo): TaalRun => ({ from: 0, T, off: Math.max(1, Math.min(T.cycle, Math.round(startOn) || 1)) - 1 });
  const runs: TaalRun[] = [];
  const lineRun: number[] = [];
  for (const sec of S) {
    const T = of(sec.taal);
    const last = runs[runs.length - 1];
    if (!last) runs.push(first(T));
    else if (last.T.id !== T.id) {
      const from = P.noteLines[sec.first]!.start;
      runs.push({ from, T, off: -from });
    }
    for (let n = sec.first; n <= sec.last; n++) lineRun[n] = runs.length - 1;
  }
  const eh = endHeadings(text, P);
  const lastRun = runs[runs.length - 1];
  let end: TaalRun;
  if (!lastRun) end = first(of(eh.taal));
  else if (eh.any && of(eh.taal).id !== lastRun.T.id) end = { from: P.total, T: of(eh.taal), off: -P.total };
  else end = lastRun;
  if (!runs.length) runs.push(end);
  const lastLine = P.noteLines.length - 1;
  const line = (n: number) => runs[lineRun[n] ?? (n < 0 ? 0 : lineRun[lastLine] ?? 0)]!;
  return {
    runs,
    line,
    beat: (g) => (g < 0 ? runs[0]! : line(P.lineOfBeat[g] ?? lastLine)),
    end,
    changes: runs.length > 1 || end !== runs[runs.length - 1] || runs[0]!.T.id !== song.id,
  };
}

/**
 * The film's song and its clock (dev only: docs/ROADMAP.md → Phase 3 → The film).
 *
 * The film is the app playing a song about itself: its name and its tagline, sung to a tune in
 * Bhupali (Sa Re Ga Pa Dha), in Keherwa. The picture and the soundtrack are both worked out from
 * this file, so they cannot drift apart: every cut and every caption is placed in matras.
 * Change the tune, the words or the tempo here and render the film again (`npm run film`).
 */
import type { Song } from '../../src/core/song/model';

export const TITLE = 'তরঙ্গিণী';
export const TEMPO = 112;
export const TAAL = 'keherwa';
/** Sa, as the app keeps it: C♯4, the Sa Rinat's own songs are at. */
export const SA = { saKey: 1, saOct: 4 } as const;

/** Each line: its notes, then its words, a group to a beat. */
export const LINES: readonly (readonly [string, string])[] = [
  ['সা রা গা পা | গা রা সা -', 'ত রঙ্ গি ণী | ০ ০ ০ -'],
  ['গা পা ধা র্সা | ধা পা গা -', 'ত রঙ্ গি ণী | ০ ০ ০ -'],
  ['পা ধা পা গা | রা গা পা -', 'প্র তি দি নের | ০ ০ ০ -'],
  ['গা রা সা .ধা | সা - - -', 'রে ওয়া জের সা | থী - - -'],
];
export const lineText = (i: number): string => LINES[i]![0] + '\n> ' + LINES[i]![1] + '\n';
export const SONG_TEXT = LINES.map((_, i) => lineText(i)).join('');

export const SONG_ID = 'film-song';
/** The song as the app's library keeps it. */
export function filmSong(text: string): Song {
  return { id: SONG_ID, example: false, title: TITLE, taal: TAAL, tempo: TEMPO, ...SA, startOn: 1, text, updatedAt: 0 };
}

/** Seconds a matra. */
export const SPB = 60 / TEMPO;
/** Seconds of the film before its first matra. */
export const LEAD = 0.3;
/** The film's time, seconds, at matra m. */
export const at = (m: number): number => LEAD + m * SPB;
/** The matra the film is at, at time t. */
export const matra = (t: number): number => (t - LEAD) / SPB;

/**
 * The film in matras, a cycle of Keherwa (8) to a row:
 *    0  the name, on paper, a tanpura under it
 *    8  the first line typed, a note to a matra, each one sounding
 *   16  the second line typed; the words go under the first
 *   24  Play, on the sam: the tabla comes in and the song goes round twice (32 matras each)
 *   56  the second round: night
 *   88  the last sam: the name, the tagline, the address
 *   96  the tanpura dies away
 */
export const AT = { open: 0, type1: 8, type2: 16, play: 24, round2: 56, end: 88, out: 96 } as const;
/** How long the film is, seconds. */
export const DURATION = at(AT.out) + 1.6;
/** A press of Play sounds its first beat this long after (Transport.start). */
export const PLAY_LAG = 0.12;

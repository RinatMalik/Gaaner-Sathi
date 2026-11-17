/**
 * The film's song, its arrangement and its clock (dev only: docs/ROADMAP.md → Phase 3 → The film).
 *
 * The film is the app playing a song about itself, in Bhupali (Sa Re Ga Pa Dha), in Keherwa, at
 * 128 a minute with the drums at double speed: its name, its tagline and a line about singing,
 * eight lines in all. The picture and the soundtrack are both worked out from this file, so they
 * cannot drift apart: every cut, every word and every change of instrument is placed in matras.
 * Change the tune, the words, the arrangement or the tempo here and render the film again
 * (`npm run film`).
 */
import type { Song } from '../../src/core/song/model';
import type { BeatStyle } from '../../src/core/song/sound';

export const TITLE = 'তরঙ্গিণী';
export const TEMPO = 128;
export const TAAL = 'keherwa';
/** Sa, as the app keeps it: C♯4, the Sa Rinat's own songs are at. */
export const SA = { saKey: 1, saOct: 4 } as const;
/** The song's own rhythm speed: the drums go round twice to a cycle of the tune, for drive. */
export const SPEED = 'double' as const;

/** Each line: its notes, then its words, a group to a beat. Lines 1 to 4 the sthayi, 5 and 6 the
 * antara, 7 a taan (four notes to a beat), 8 the name again to close. */
export const LINES: readonly (readonly [string, string])[] = [
  ['সা রা গা পা | ধা পা গা -', 'ত রঙ্ গি ণী | ০ ০ ০ -'],
  ['গা পা ধা র্সা | ধা পা গা -', 'ত রঙ্ গি ণী | ০ ০ ০ -'],
  ['পা ধা র্সা র্রা | র্সা ধা পা -', 'প্র তি দি নের | ০ ০ ০ -'],
  ['গা রা সা .ধা | সা - - -', 'রে ওয়া জের সা | থী - - -'],
  ['পা ধা র্সা র্সা | র্রা র্সা ধা পা', 'প্রাণ ০ খু লে | গান ০ গাও ০'],
  ['ধা র্সা ধা পা | গা রা গা পা', 'সু রে সু রে | তা লে তা লে'],
  ['সারাগাপা গাপাধার্সা পাধার্সার্রা র্সা | র্রার্সাধাপা র্সাধাপাগা ধাপাগারা সা', 'আ ০ ০ ০ | ০ ০ ০ ০'],
  ['গা রা সা .ধা | সা - - -', 'ত রঙ্ গি ণী | ০ - - -'],
];
export const lineText = (i: number): string => LINES[i]![0] + '\n> ' + LINES[i]![1] + '\n';
export const SONG_TEXT = LINES.map((_, i) => lineText(i)).join('');

export const SONG_ID = 'film-song';
/** The song as the app's library keeps it. */
export function filmSong(text: string): Song {
  return { id: SONG_ID, example: false, title: TITLE, taal: TAAL, tempo: TEMPO, ...SA, startOn: 1, text, updatedAt: 0, sound: { speed: SPEED } };
}

/** The extra percussion the app adds to each rhythm (its Add chips), the same all through. */
export const LAYERS: Record<'tabla' | 'dholak' | 'kit', string[]> = {
  tabla: ['kartal', 'manjira'],
  dholak: ['ghungroo', 'tambourine'],
  kit: ['claps', 'congas', 'shaker'],
};
/** The rhythm the song starts on, and how many reeds. */
export const START_BEAT: BeatStyle = 'tabla';
export const START_REEDS = 3;
/** What is changed on the deck as the song plays, and from which matra: a line on tabla, a line on
 * dholak, two on drums; the antara with the drums out and one reed; the tabla back; drums for the
 * taan and the close. The app's own controls make each change in the picture (film.ts) and the
 * soundtrack makes the same change on the same beat (sound.ts). */
export const CHANGES: readonly { m: number; beat?: BeatStyle; reeds?: 1 | 2 | 3 }[] = [
  { m: 24, beat: 'dholak' },
  { m: 32, beat: 'kit' },
  { m: 48, beat: 'off', reeds: 1 },
  { m: 56, beat: 'tabla', reeds: 3 },
  { m: 64, beat: 'kit' },
];

/**
 * The bass: the app's harmonium a line below the tune, played as a second song on the same clock
 * (Sa an octave down, two reeds). Not something the app adds by itself: the film's arrangement.
 * Each line's roots, a beat each, and how they are played: two to a beat, off the beat, low and
 * high, or held.
 */
export const SA_BASS = { saKey: 1, saOct: 3 } as const;
type BassWay = 'pump' | 'off' | 'oct';
const BASS: readonly (readonly [string, BassWay] | string)[] = [
  ['S S S S .D .D .P .P', 'pump'],
  ['.P .P .D .D .P .P S S', 'off'],
  ['.D .D .D .D S S S S', 'oct'],
  ['.D .D .P .P S S S S', 'oct'],
  '.D - - - | .P - - -',
  ['S S .D .D .P .P .P .P', 'pump'],
  ['S S S S .D .D .P .P', 'oct'],
  ['.D .D .P .P S S S S', 'oct'],
  'S - - - | x x x x',
];
const upOctave = (n: string): string => (n.startsWith('.') ? n.slice(1) : n + "'");
const bassBeat = (n: string, way: BassWay): string => (way === 'pump' ? n + n : way === 'off' ? 'x' + n : n + upOctave(n));
export const BASS_TEXT = BASS.map((l) => {
  if (typeof l === 'string') return l + '\n';
  const beats = l[0].split(' ').map((n) => bassBeat(n, l[1]));
  return beats.slice(0, 4).join(' ') + ' | ' + beats.slice(4).join(' ') + '\n';
}).join('');

/** Seconds a matra. */
export const SPB = 60 / TEMPO;
/** Seconds of the film before its first matra. */
export const LEAD = 0.3;
/** The film's time, seconds, at matra m. */
export const at = (m: number): number => LEAD + m * SPB;
/** The matra the film is at, at time t. */
export const matra = (t: number): number => (t - LEAD) / SPB;

/**
 * The film in matras, a cycle of Keherwa (8) to a line of the song:
 *    0  the first line typed, a note to a matra, each one sounding over a soft dholak
 *    8  its words; then the other lines pasted, the tabla rising
 *   16  Play, on the sam: line 1, tabla           24  line 2, dholak
 *   32  line 3, drums                             40  line 4: the taals, nineteen of them
 *   48  line 5, the drums out: sing, and the pitch is drawn
 *   56  line 6, the tabla back: full screen, every line scored
 *   64  line 7, the taan, drums and tabla: night, and every view of the app
 *   72  line 8: a phone and a laptop
 *   80  the closing stroke: the name, the tagline, the address
 *   88  the tanpura dies away
 */
export const AT = { type: 0, words: 8, paste: 11, play: 16, sing: 48, full: 56, night: 64, phone: 72, end: 80, out: 88 } as const;
/** The matra line n (0-based) of the song starts on. */
export const lineAt = (n: number): number => AT.play + 8 * n;
/** How long the film is, seconds. */
export const DURATION = at(AT.out) + 1;
/** A press of Play sounds its first beat this long after (Transport.start). */
export const PLAY_LAG = 0.12;

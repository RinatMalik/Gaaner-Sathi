/** The song record (docs/DATA.md → Song). */
import { isTaalId, type TaalId } from '../taal/taals';

export interface Song {
  id: string;
  /** Built-in exercises are read-only in the app. */
  example: boolean;
  title: string;
  taal: TaalId;
  /** Matras per minute, 30–240. */
  tempo: number;
  /** Semitones above C, 0–11. */
  saKey: number;
  /** 3, 4 or 5 (Low, Middle, High): Sa = MIDI 12 × (saOct + 1) + saKey. */
  saOct: 3 | 4 | 5;
  /** The taal beat (1-based) the first beat lands on. */
  startOn: number;
  text: string;
  /** ms since epoch. */
  updatedAt: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Clamp every field into range, as the prototype does for every song it loads or
 * imports, so a damaged or hand-edited file can never break the app.
 */
export function normalize(s: { id: string } & Partial<Record<keyof Song, unknown>>): Song {
  const oct = Number(s.saOct);
  return {
    id: s.id,
    example: !!s.example,
    title: typeof s.title === 'string' && s.title.trim() ? s.title : 'Untitled song',
    taal: isTaalId(s.taal) ? s.taal : 'dadra',
    tempo: clamp(Math.round(Number(s.tempo) || 100), 30, 240),
    saKey: clamp(Math.round(Number(s.saKey) || 0), 0, 11),
    saOct: oct === 3 || oct === 4 || oct === 5 ? oct : 4,
    startOn: Math.max(1, Math.round(Number(s.startOn) || 1)),
    text: typeof s.text === 'string' ? s.text : '',
    updatedAt: Number(s.updatedAt) || 0,
  };
}

/** A new song id: "song-" + time + 5 random characters, as the prototype makes them. */
export function newId(now: number = Date.now(), rand: () => number = Math.random): string {
  return 'song-' + now.toString(36) + '-' + rand().toString(36).slice(2, 7);
}

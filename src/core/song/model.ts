/** The song record (docs/DATA.md → Song). */
import { isTaalId, type TaalId } from '../taal/taals';
import { cleanSound, type SongSound } from './sound';

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
  /** Library tags such as "Rabindrasangeet" or "Learning"; absent when there are none. */
  tags?: string[];
  /** A favourite; absent when not. */
  fav?: boolean;
  /** Its own Melody and Rhythm settings (src/core/song/sound.ts), over the device's; absent
   * while it uses the device's. */
  sound?: Partial<SongSound>;
  /** Notes about the song: its meaning, where it comes from, a teacher's comments. Absent
   * when there are none. */
  notes?: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const TAG_LIMITS = { tags: 20, chars: 40 } as const;
/** The longest notes kept with a song. */
export const NOTES_CHARS = 20_000;

/** Notes as kept: cut to the limit; absent (undefined) when there is nothing but space. */
export const cleanNotes = (v: unknown): string | undefined => (typeof v === 'string' && /\S/.test(v) ? v.slice(0, NOTES_CHARS) : undefined);

/** Text folded for matching: one Unicode form, lower case, no invisible joiners. */
export const foldText = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[​-‍⁠﻿]/g, '');

/** Tags as kept: trimmed, single-spaced, no commas, at most 40 characters each and 20 in
 * all, and no two the same apart from case (the first spelling wins). */
export function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const t = x.replace(/[,\s]+/g, ' ').trim().slice(0, TAG_LIMITS.chars).trim();
    const k = foldText(t);
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length === TAG_LIMITS.tags) break;
  }
  return out;
}

/** Tags typed into one box, separated by commas. */
export const parseTags = (input: string): string[] => cleanTags(input.split(','));

/**
 * Clamp every field into range, as the prototype does for every song it loads or
 * imports, so a damaged or hand-edited file can never break the app. Tags, the
 * favourite mark, the song's own sound and its notes are this app's additions: present
 * only when set.
 */
export function normalize(s: { id: string } & Partial<Record<keyof Song, unknown>>): Song {
  const oct = Number(s.saOct);
  const song: Song = {
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
  const tags = cleanTags(s.tags);
  if (tags.length) song.tags = tags;
  if (s.fav === true) song.fav = true;
  const sound = cleanSound(s.sound);
  if (sound) song.sound = sound;
  const notes = cleanNotes(s.notes);
  if (notes) song.notes = notes;
  return song;
}

/** A new song id: "song-" + time + 5 random characters, as the prototype makes them. */
export function newId(now: number = Date.now(), rand: () => number = Math.random): string {
  return 'song-' + now.toString(36) + '-' + rand().toString(36).slice(2, 7);
}

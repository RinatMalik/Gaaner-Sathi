/**
 * Song files: export, back up, import (docs/DATA.md → File format). Keep reading version 1
 * forever; the importer never checks `format`, so files from before the rename
 * ("swaralipi-player") import too.
 */
import type { Song } from './model';
import type { SongSound } from './sound';

export const FILE_FORMAT = 'gaaner-sathi';
export const FILE_VERSION = 1;

export const IMPORT_LIMITS = {
  /** Per file, checked by the caller on the file's size before reading it. */
  fileBytes: 2_000_000,
  songs: 200,
  chars: 200_000,
  titleChars: 200,
} as const;

/** What a file holds for each song: no id, no timestamps. Tags, the favourite mark, the
 * song's own sound and its notes are optional additions (still version 1: older readers
 * skip them). */
export interface SongFileEntry {
  title: string;
  taal: string;
  tempo: number;
  saKey: number;
  saOct: number;
  startOn: number;
  text: string;
  tags?: string[];
  fav?: boolean;
  sound?: Partial<SongSound>;
  notes?: string;
}

/** A song found in an imported file: title and text are always strings; any other fields
 * are passed through to `normalize`. */
export type ImportedSong = Record<string, unknown> & { title: string; text: string };

export function songForFile(s: Song): SongFileEntry {
  const e: SongFileEntry = { title: s.title, taal: s.taal, tempo: s.tempo, saKey: s.saKey, saOct: s.saOct, startOn: s.startOn, text: s.text };
  if (s.tags && s.tags.length) e.tags = s.tags;
  if (s.fav) e.fav = true;
  if (s.sound) e.sound = s.sound;
  if (s.notes) e.notes = s.notes;
  return e;
}

/** The file text for "Export this song" or "Back up all my songs". `exported` is YYYY-MM-DD. */
export function songFileText(songs: readonly Song[], exported: string): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, exported, songs: songs.map(songForFile) }, null, 2);
}

/** A safe file name: no characters Windows or macOS refuse, at most 80 characters. */
export function fileName(base: string): string {
  return (String(base).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'song') + '.json';
}

/** Drops an "Example · " style prefix when an exercise is copied or exported. */
export function stripExamplePrefix(title: string): string {
  return title.replace(/^(Example|Typing example|উদাহরণ)\s*·\s*/, '');
}

/**
 * The songs in a file's text: our envelope, a bare array of songs, a single song object,
 * or plain text (one song named after the file). Texts over 200 000 characters and titles
 * over 200 are cut.
 */
export function songsFromFile(txt: string, name?: string): ImportedSong[] {
  const base = String(name || 'Imported song').replace(/\.[^.]+$/, '');
  let obj: unknown = null;
  try {
    obj = JSON.parse(txt);
  } catch {
    obj = null;
  }
  if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    const list: unknown[] = Array.isArray(obj) ? obj : Array.isArray(o.songs) ? o.songs : typeof o.text === 'string' ? [obj] : [];
    return list
      .filter((s): s is Record<string, unknown> & { text: string } => !!s && typeof s === 'object' && typeof (s as Record<string, unknown>).text === 'string')
      .map((s) => Object.assign({}, s, {
        text: s.text.slice(0, IMPORT_LIMITS.chars),
        title: typeof s.title === 'string' && s.title.trim() ? s.title.slice(0, IMPORT_LIMITS.titleChars) : base,
      }));
  }
  return /\S/.test(txt) ? [{ title: base, text: txt.slice(0, IMPORT_LIMITS.chars) }] : [];
}

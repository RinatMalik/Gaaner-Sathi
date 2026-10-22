/**
 * Back up everything, and restore it (Rinat, 2026-10-22: "export all songs/ all progress data/
 * backup everything etc"; asked, "Backup and restore, no takes"). One file holds the user's
 * songs and exercises, the rewaz routines, the practice log, each session's detail and the
 * settings; takes (recordings) stay out, being large. Import from file reads it back and adds
 * what is missing, never changing anything already here (docs/DATA.md → Backups). Pure, so it
 * is tested in Node.
 */
import { cleanLog, type LogEntry } from '../core/practice/log';
import { cleanRoutine, type Routine } from '../core/practice/routine';
import { cleanSession, type SessionDetail } from '../core/practice/session';
import { FILE_VERSION, songForFile } from '../core/song/file';
import { uniqueTitle } from '../core/song/library';
import { newId, normalize, type Song } from '../core/song/model';

export const BACKUP_FORMAT = 'gaaner-sathi-backup';
/** A backup's most bytes. A file is read before it is known to be one, so files of songs may be
 * this big too, but only a backup is taken from one over 2 MB: each session's readings make a
 * backup far bigger than songs alone. */
export const BACKUP_BYTES = 200_000_000;
/** Settings of this device rather than of the singer, never written to a backup or taken from
 * one: its delay, its keyboard, and where it was left. */
export const DEVICE_PREFS: readonly string[] = ['deviceLag', 'pitchLag', 'midi', 'lastSong', 'tab', 'soundOpen'];

export interface Backup {
  /** When it was made, ms since epoch. */
  at: number;
  songs: Song[];
  routines: Routine[];
  log: LogEntry[];
  sessions: SessionDetail[];
  prefs: Record<string, unknown>;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** A session as written: its readings to the millisecond and the hundredth of a hertz. */
function sessionForFile(d: SessionDetail): SessionDetail {
  if (!d.pitch) return d;
  const rd = d.pitch.readings;
  const readings = new Array<number>(rd.length);
  for (let i = 0; i + 1 < rd.length; i += 2) {
    readings[i] = r3(rd[i]!);
    readings[i + 1] = r2(rd[i + 1]!);
  }
  return { ...d, pitch: { ...d.pitch, readings } };
}

const singerPrefs = (p: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(p).filter(([k]) => !DEVICE_PREFS.includes(k)));

/** The backup file, in parts (a session to a line) for a Blob. Its songs are a song file's with
 * their ids, so an import of songs alone reads them too. */
export function backupParts(b: Backup): string[] {
  const head = {
    format: BACKUP_FORMAT,
    version: FILE_VERSION,
    exported: new Date(b.at).toISOString(),
    about: 'A backup of Gaaner Sathi (গানের সাথী): songs, rewaz routines, practice and settings, without recordings. Restore it with Import, at the top of the app.',
    songs: b.songs.map((s) => ({ id: s.id, updatedAt: s.updatedAt, ...songForFile(s) })),
    routines: b.routines,
    prefs: singerPrefs(b.prefs),
    log: b.log,
  };
  const parts = [JSON.stringify(head).slice(0, -1) + ',"sessions":['];
  b.sessions.forEach((d, i) => parts.push((i ? ',\n' : '\n') + JSON.stringify(sessionForFile(d))));
  parts.push('\n]}\n');
  return parts;
}

/** A backup in a file's text, every part checked; null when the file is not a backup. */
export function readBackup(txt: string): Backup | null {
  let o: unknown;
  try {
    o = JSON.parse(txt);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  if (r.format !== BACKUP_FORMAT) return null;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const songs: Song[] = [];
  for (const s of list(r.songs)) {
    if (!s || typeof s !== 'object' || typeof (s as { text?: unknown }).text !== 'string') continue;
    const x = s as Record<string, unknown>;
    songs.push(normalize({ ...x, id: typeof x.id === 'string' && x.id ? x.id : newId(), example: false }));
  }
  const routines: Routine[] = [];
  for (const x of list(r.routines)) {
    const id = x && typeof x === 'object' ? (x as { id?: unknown }).id : null;
    const rt = typeof id === 'string' && id ? cleanRoutine(id, x) : null;
    if (rt) routines.push(rt);
  }
  const at = Date.parse(typeof r.exported === 'string' ? r.exported : '');
  return {
    at: Number.isFinite(at) ? at : 0,
    songs,
    routines,
    log: cleanLog(r.log),
    sessions: list(r.sessions).map(cleanSession).filter((d): d is SessionDetail => !!d),
    prefs: r.prefs && typeof r.prefs === 'object' && !Array.isArray(r.prefs) ? singerPrefs(r.prefs as Record<string, unknown>) : {},
  };
}

/** What is here already, for a restore to leave alone. */
export interface Here {
  songIds: ReadonlySet<string>;
  titles: readonly string[];
  routineIds: ReadonlySet<string>;
  logAts: ReadonlySet<number>;
  sessionAts: ReadonlySet<number>;
}

/** What a restore adds: the songs, routines, log entries and sessions not here already (by id,
 * or by when a session was). Songs keep their ids, so the practice and routines that name them
 * still do, and take a title of their own when one here has theirs. */
export function restorePlan(b: Backup, here: Here): Omit<Backup, 'at' | 'prefs'> {
  const taken = [...here.titles];
  const songs = b.songs
    .filter((s) => !here.songIds.has(s.id))
    .map((s) => {
      const title = uniqueTitle(s.title, taken);
      taken.push(title);
      return { ...s, title };
    });
  return {
    songs,
    routines: b.routines.filter((r) => !here.routineIds.has(r.id)),
    log: b.log.filter((e) => !here.logAts.has(e.at)),
    sessions: b.sessions.filter((d) => !here.sessionAts.has(d.at)),
  };
}

/** The settings after "Restore with its settings": the backup's over these, but this device's own
 * (its delay, its keyboard, where it was left) kept as they are. To be checked as stored ones are. */
export function restoredPrefs(here: Record<string, unknown>, fromBackup: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...here, ...singerPrefs(fromBackup) };
  for (const k of DEVICE_PREFS) {
    if (k in here) out[k] = here[k];
    else delete out[k];
  }
  return out;
}

const many = (n: number, one: string, more = one + 's') => n + ' ' + (n === 1 ? one : more);

/** What a backup holds, in words: "12 songs, 3 routines and 140 practice sessions". */
export function backupWords(b: Pick<Backup, 'songs' | 'routines' | 'log'>): string {
  const parts = [many(b.songs.length, 'song'), many(b.routines.length, 'routine'), many(b.log.length, 'practice session')];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

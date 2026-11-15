/**
 * Back up everything, and restore it (Rinat, 2026-10-22: "export all songs/ all progress data/
 * backup everything etc"; asked, "Backup and restore, no takes"). One file holds the user's
 * songs and exercises, the rewaz routines, the practice log, each session's detail and the
 * settings; takes (recordings) stay out, being large. Import from file reads it back and adds
 * what is missing, never changing anything already here (docs/DATA.md → Backups). Pure, so it
 * is tested in Node.
 *
 * A backup is never bigger than Import reads (`BACKUP_BYTES`). Until 2026-11-15 nothing held the
 * two together: each reading was written out as numbers, a three-minute session came to 270 KB,
 * and the 1,000 sessions kept made a file of 270 MB that Import refused. Now the readings are
 * packed (core/practice/pack.ts) and the notes are rows of numbers, under a third of the size
 * all told, and a file that would still be too big leaves out the oldest sessions' detail,
 * saying so; their summaries are in the log.
 */
import { cleanLog, dayNumber, type LogEntry } from '../core/practice/log';
import { packReadings, unpackReadings } from '../core/practice/pack';
import { cleanRoutine, type Routine } from '../core/practice/routine';
import { cleanSession, type NoteRow, type SessionDetail } from '../core/practice/session';
import { FILE_VERSION, songForFile } from '../core/song/file';
import { uniqueTitle } from '../core/song/library';
import { newId, normalize, type Song } from '../core/song/model';

export const BACKUP_FORMAT = 'gaaner-sathi-backup';
/** A backup's most bytes. A file is read before it is known to be one, so files of songs may be
 * this big too, but only a backup is taken from one over 2 MB: each session's readings make a
 * backup far bigger than songs alone. */
export const BACKUP_BYTES = 200_000_000;
/** Settings of this device rather than of the singer, never written to a backup or taken from
 * one: its delay, its keyboard, its microphone, where it was left, when it was last backed up
 * and when its browser was last asked to keep what the app stores. */
export const DEVICE_PREFS: readonly string[] = ['deviceLag', 'pitchLag', 'midi', 'mic', 'lastSong', 'tab', 'lastBackup', 'keepAsked'];

export interface Backup {
  /** When it was made, ms since epoch. */
  at: number;
  songs: Song[];
  routines: Routine[];
  log: LogEntry[];
  sessions: SessionDetail[];
  prefs: Record<string, unknown>;
}

/** A note's result as a row of numbers, in this order, its status by its place here; and back. */
const STATUS = ['sung', 'unsung', 'short'] as const;
const noteRow = (n: NoteRow): (number | null)[] => [n.t0, n.t1, n.semi, n.oct, n.g, n.line, n.pass, STATUS.indexOf(n.status), n.score, n.cents, n.arrive, n.wobble];
const noteOfRow = (r: unknown): unknown =>
  Array.isArray(r)
    ? { t0: r[0], t1: r[1], semi: r[2], oct: r[3], g: r[4], line: r[5], pass: r[6], status: STATUS[r[7] as number], score: r[8], cents: r[9], arrive: r[10], wobble: r[11] }
    : r;

/** A session as its line of the file. Its readings (to the millisecond and the hundredth of a
 * hertz) and their levels (to a tenth of a decibel) are packed, as `packed`, in place of the two
 * lists of numbers a backup held until 2026-11-15, and each note's result is a row of numbers in
 * place of a named set. Made a session at a time, so that only one session's readings are in
 * memory. */
export function sessionLine(d: SessionDetail): string {
  if (!d.pitch) return JSON.stringify(d);
  const { readings, levels, notes, ...rest } = d.pitch;
  return JSON.stringify({ ...d, pitch: { ...rest, notes: notes.map(noteRow), packed: packReadings(readings, levels) } });
}

/** A session read from a backup's file, as written now or as it was before. */
function sessionFromFile(v: unknown): SessionDetail | null {
  const q = v && typeof v === 'object' ? (v as { pitch?: unknown }).pitch : null;
  if (!q || typeof q !== 'object') return cleanSession(v);
  const p = q as { packed?: unknown; notes?: unknown };
  const got = typeof p.packed === 'string' ? unpackReadings(p.packed) : null;
  return cleanSession({
    ...(v as object),
    pitch: {
      ...p,
      ...(Array.isArray(p.notes) ? { notes: p.notes.map(noteOfRow) } : {}),
      // Packed readings that cannot be read are left out; the rest of the session stands.
      ...(typeof p.packed === 'string' ? { readings: got?.readings ?? [], levels: got?.levels } : {}),
    },
  });
}

const singerPrefs = (p: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(p).filter(([k]) => !DEVICE_PREFS.includes(k)));

/** How many bytes a text takes in a file (UTF-8): a Bengali letter takes three. */
export function fileBytes(s: string): number {
  let n = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) continue;
    if (c >= 0xd800 && c <= 0xdbff && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      // The two halves of one character: four bytes for the pair.
      n += 2;
      i++;
    } else n += c < 0x800 ? 1 : 2;
  }
  return n;
}

/**
 * The backup file, in parts (a session to a line) for a Blob: everything but the sessions, then
 * each session's line (`sessionLine`), oldest first. Its songs are a song file's with their ids,
 * so an import of songs alone reads them too. The file is never more than `most` bytes, so Import
 * always reads what this wrote: when it would be, the oldest sessions' lines are left out until
 * it fits, and `dropped` says how many (their summaries are in the log, which is always whole).
 */
export function backupFile(b: Omit<Backup, 'sessions'>, lines: readonly string[], most: number = BACKUP_BYTES): { parts: string[]; dropped: number } {
  const head = {
    format: BACKUP_FORMAT,
    version: FILE_VERSION,
    exported: new Date(b.at).toISOString(),
    about: 'A backup of Torongini (তরঙ্গিণী): songs, rewaz routines, practice and settings, without recordings. Restore it with Import from file, in the Music library.',
    songs: b.songs.map((s) => ({ id: s.id, updatedAt: s.updatedAt, ...songForFile(s) })),
    routines: b.routines,
    prefs: singerPrefs(b.prefs),
    log: b.log,
  };
  const first = JSON.stringify(head).slice(0, -1) + ',"sessions":[';
  const last = '\n]}\n';
  // Each line is led by a new line, and all but the first by a comma too.
  const chars = first.length + last.length + lines.reduce((a, l) => a + l.length + 2, 0);
  let dropped = 0;
  // No character takes more than three bytes, so most files need no counting.
  if (3 * chars > most) {
    const size = lines.map(fileBytes);
    const fixed = fileBytes(first) + last.length;
    let body = size.reduce((a, x) => a + x + 2, 0);
    while (dropped < lines.length && fixed + body - 1 > most) body -= size[dropped++]! + 2;
  }
  const parts = [first];
  for (let i = dropped; i < lines.length; i++) parts.push((i > dropped ? ',\n' : '\n') + lines[i]!);
  parts.push(last);
  return { parts, dropped };
}

/** A session in a backup that was read: its detail is worked out when it is restored, one
 * session at a time (a year's sessions unpacked together are hundreds of megabytes); null when
 * it is damaged beyond use. */
export interface BackupSession {
  at: number;
  read(): SessionDetail | null;
}
/** A backup as read from its file. */
export type BackupRead = Omit<Backup, 'sessions'> & { sessions: BackupSession[] };

/** A backup in a file's text, every part checked; null when the file is not a backup. */
export function readBackup(txt: string): BackupRead | null {
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
    sessions: list(r.sessions)
      .filter((v): v is { at: number; song: string } => !!v && typeof v === 'object' && Number.isFinite((v as { at?: unknown }).at) && typeof (v as { song?: unknown }).song === 'string')
      .map((v) => ({ at: v.at, read: () => sessionFromFile(v) })),
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
export function restorePlan<S extends { at: number }>(b: Pick<Backup, 'songs' | 'routines' | 'log'> & { sessions: readonly S[] }, here: Here): Pick<Backup, 'songs' | 'routines' | 'log'> & { sessions: S[] } {
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

/** Work this many days old with no backup holding it is due one. */
export const BACKUP_DUE_DAYS = 14;

/**
 * What the Music library says of the last backup (2026-11-15: everything is kept in the browser
 * alone, and nothing said how long ago a copy was saved outside it). `last`: when Everything was
 * last saved from this browser; `oldest` and `newest`: the times of the user's own songs and
 * practice (absent: there is none yet, and nothing is said). `due`: there is work a fortnight
 * old that no backup holds, so the note asks for one.
 */
export function backupNote(o: { last?: number; oldest?: number; newest?: number; now: number }): { text: string; due: boolean } {
  if (o.oldest == null) return { text: '', due: false };
  const days = (t: number) => Math.max(0, dayNumber(o.now) - dayNumber(t));
  if (o.last == null) {
    const due = days(o.oldest) >= BACKUP_DUE_DAYS;
    return { text: 'Not backed up yet' + (due ? ': save a copy with Back up or export' : ''), due };
  }
  const d = days(o.last);
  const due = d >= BACKUP_DUE_DAYS && (o.newest ?? 0) > o.last;
  return { text: 'Backed up ' + (d === 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago') + (due ? ': time for another' : ''), due };
}

/**
 * Takes (docs/ENGINE.md → Takes; docs/DATA.md → Takes): on the Practice view the open song's
 * takes, newest first, and on the Voice page every song's (Rinat, 2026-10-23: "no way to see
 * all the recorded audios in one go"), each to play back against the guide or alone, download
 * as a WAV file, or delete. Takes are kept in this browser's IndexedDB (localStorage cannot hold
 * sound): the details in one store, the samples in another, so listing never loads sound.
 * The HTML builder is pure and tested in Node.
 */
import { fromInt16 } from '../audio/dsp/pcm';
import { dayNumber } from '../core/practice/log';
import { cleanTake, clockText, takeDetail, type Take } from '../core/practice/take';
import { whenText } from '../core/song/library';
import { inTx, openDB } from './db';
import { exportName, stamp } from './filenames';
import { dayLabel } from './progress';
import { esc } from './view';

/** The takes and their samples in IndexedDB (db.ts); null where IndexedDB is not available. */
export class TakeStore {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(): Promise<TakeStore | null> {
    const db = await openDB();
    return db ? new TakeStore(db) : null;
  }

  private run<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
    return inTx(this.db, stores, mode, fn);
  }

  /** A song's takes, newest first (only their details). */
  async list(song: string): Promise<Take[]> {
    const raw = (await this.run<unknown[]>(['takes'], 'readonly', (tx) => tx.objectStore('takes').index('song').getAll(song))) ?? [];
    return raw.map(cleanTake).filter((t): t is Take => !!t).sort((a, b) => b.at - a.at);
  }

  /** Every take, newest first (only their details). */
  async all(): Promise<Take[]> {
    const raw = (await this.run<unknown[]>(['takes'], 'readonly', (tx) => tx.objectStore('takes').getAll())) ?? [];
    return raw.map(cleanTake).filter((t): t is Take => !!t).sort((a, b) => b.at - a.at);
  }

  async samples(id: string): Promise<Int16Array | null> {
    const r = await this.run<{ id: string; pcm: ArrayBuffer } | undefined>(['audio'], 'readonly', (tx) => tx.objectStore('audio').get(id));
    return r && r.pcm instanceof ArrayBuffer ? new Int16Array(r.pcm) : null;
  }

  async add(t: Take, pcm: Int16Array): Promise<void> {
    const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
    await this.run(['takes', 'audio'], 'readwrite', (tx) => {
      tx.objectStore('audio').put({ id: t.id, pcm: buf });
      tx.objectStore('takes').put(t);
    });
  }

  /** Delete takes (one, or several ticked together) and their samples. */
  async remove(...ids: string[]): Promise<void> {
    await this.run(['takes', 'audio'], 'readwrite', (tx) => {
      for (const id of ids) {
        tx.objectStore('takes').delete(id);
        tx.objectStore('audio').delete(id);
      }
    });
  }
}

export interface TakesShown {
  /** The take playing, and how. */
  playing?: { id: string; how: 'guide' | 'me' };
}

const NO_TAKES = '<li class="tkempty">No takes yet. Switch on <b>Record me</b> at the top, then press Play: each play is a take.</li>';
const DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const clockOf = (at: number) => {
  const d = new Date(at);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
/** "Today 18:02", "3 days ago 09:15", "12 Oct 20:40". */
const whenAt = (at: number, now: number) => {
  const when = whenText(at, now);
  return (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) : when) + ' ' + clockOf(at);
};
const changed = (t: Take, sig: string | null) => (sig != null && t.sig && t.sig !== sig ? '<span class="tkwarn">The notation has changed since, so the guide may not line up.</span>' : '');

/** The list on the Practice view: each take's time, details, a note when the notation has
 * changed since, and its buttons; `playing` the one playing. Delete deletes at once (Rinat,
 * 2026-10-23: "no need for delete confirmation when deleting just one take"), with an Undo. */
export function takesHTML(takes: readonly Take[], now: number, sig: string, o: TakesShown = {}): string {
  return takes.length ? takes.map((t) => takeHTML(t, now, sig, o)).join('') : NO_TAKES;
}

function takeHTML(t: Take, now: number, sig: string, o: TakesShown): string {
  const id = esc(t.id);
  const on = o.playing?.id === t.id ? o.playing.how : null;
  const acts = '<button type="button" class="ibtn" data-act="guide" data-id="' + id + '">' + (on === 'guide' ? '■ Stop' : '▶ With the guide') + '</button>' +
    '<button type="button" class="ibtn" data-act="me" data-id="' + id + '">' + (on === 'me' ? '■ Stop' : '▶ Just me') + '</button>' +
    '<button type="button" class="ibtn" data-act="dl" data-id="' + id + '">Download</button>' +
    '<button type="button" class="ibtn" data-act="del" data-id="' + id + '" aria-label="Delete this take">Delete</button>';
  return '<li class="tk"><span class="tkwhen">' + whenAt(t.at, now) + '</span>' +
    '<span class="tkdet">' + esc(takeDetail(t)) + '</span>' + changed(t, sig) +
    '<span class="tkacts">' + acts + '</span></li>';
}

/** A take's song as it is now: its title and notation's fingerprint; null when it is gone. */
export type TakeSong = (id: string) => { title: string; sig: string } | null;

/** How the Voice page's table of every take is shown. */
export interface AllTakesShown extends TakesShown {
  /** Grouped by song (the song with the newest take first) or by the day they were taken. */
  by: 'song' | 'date';
  /** The takes ticked, to delete together. */
  selected: ReadonlySet<string>;
  /** Groups opened or folded by the user (absent: the first three open). */
  open: ReadonlyMap<string, boolean>;
  /** Asking whether to delete the takes ticked. */
  asking?: boolean;
}

const many = (n: number, one: string) => n + ' ' + one + (n === 1 ? '' : 's');
const bytes = (n: number): string => (n < 1e6 ? Math.max(1, Math.round(n / 1e3)) + ' KB' : n < 1e9 ? Math.round(n / 1e6) + ' MB' : (n / 1e9).toFixed(1) + ' GB');
const FOLD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/** A tick box: ticked, not ticked, or some of a group's (`data-mixed`, made indeterminate once
 * drawn). */
const tick = (attr: string, label: string, all: boolean, some: boolean) =>
  '<label class="tkchk" title="' + label + '"><input type="checkbox" ' + attr + ' aria-label="' + label + '"' + (all ? ' checked' : '') + (some && !all ? ' data-mixed="1"' : '') + '></label>';

export interface TakeGroup {
  key: string;
  title: string;
  /** The song of a group by song, as it is now (null: deleted), for its button. */
  song?: { id: string; now: { title: string; sig: string } | null };
  list: Take[];
}

/** The takes in groups, newest first: by song, under its title now (a deleted song's under
 * the title it had), or by the day taken. */
export function takeGroups(takes: readonly Take[], now: number, song: TakeSong, by: 'song' | 'date'): TakeGroup[] {
  const groups = new Map<string, TakeGroup>();
  for (const t of [...takes].sort((a, b) => b.at - a.at)) {
    const key = by === 'song' ? 's:' + t.song : 'd:' + dayNumber(t.at);
    let g = groups.get(key);
    if (!g) {
      const s = by === 'song' ? song(t.song) : null;
      g = by === 'song' ? { key, title: s ? s.title : t.title || 'A song', song: { id: t.song, now: s }, list: [] } : { key, title: dayLabel(dayNumber(t.at), now), list: [] };
      groups.set(key, g);
    }
    g.list.push(t);
  }
  return Array.from(groups.values());
}

/**
 * Every take on the Voice page, as a table (Rinat, 2026-10-23: "needs all the bells and
 * whistles of a table"): how many, how long and how much room they take; grouped by song or by
 * the day taken, each group folding by its heading; takes and whole groups ticked to delete
 * together (asked first), or one take deleted at once with its bin.
 */
export function allTakesHTML(takes: readonly Take[], now: number, song: TakeSong, o: AllTakesShown): string {
  if (!takes.length) return '<ul class="tklist">' + NO_TAKES + '</ul>';
  const groups = takeGroups(takes, now, song, o.by);
  const secs = takes.reduce((n, t) => n + t.secs, 0);
  const size = takes.reduce((n, t) => n + t.secs * t.rate * 2, 0);
  const songsN = new Set(takes.map((t) => t.song)).size;
  const sel = takes.filter((t) => o.selected.has(t.id)).length;
  const head = '<p class="tksum">' + many(takes.length, 'take') + ' of ' + many(songsN, 'song') + ' · ' + clockText(secs) + ' in all · ' + bytes(size) + ' in this browser</p>';
  const seg = (v: 'song' | 'date', label: string) => '<button type="button" data-act="by" data-v="' + v + '" aria-pressed="' + (o.by === v) + '">' + label + '</button>';
  const selBit = !sel
    ? ''
    : o.asking
      ? '<span class="tksure">Delete ' + (sel === 1 ? 'this take' : 'these ' + sel + ' takes') + '?</span><button type="button" class="btn danger" data-act="delyes">Delete</button><button type="button" class="btn" data-act="delno">Keep</button>'
      : '<span class="tkseln">' + sel + ' ticked</span><button type="button" class="btn danger" data-act="delsel">Delete ' + (sel === 1 ? 'it' : 'all ' + sel) + '</button><button type="button" class="btn" data-act="clearsel">Untick</button>';
  const bar = '<div class="tkbar"><span class="lab2" id="tkByLab">Group by</span><div class="seg" role="group" aria-labelledby="tkByLab">' + seg('song', 'Song') + seg('date', 'Date') + '</div>' +
    '<label class="tkall"><input type="checkbox" data-selall="1"' + (sel === takes.length ? ' checked' : sel ? ' data-mixed="1"' : '') + '> Tick all</label>' +
    '<span class="spacer"></span>' + selBit + '</div>';
  return head + bar + groups.map((g, i) => groupHTML(g, i, now, song, o)).join('');
}

function groupHTML(g: TakeGroup, i: number, now: number, song: TakeSong, o: AllTakesShown): string {
  const open = o.open.get(g.key) ?? i < 3;
  const n = g.list.filter((t) => o.selected.has(t.id)).length;
  const id = 'tkg-' + g.key.replace(/[^\w-]/g, '_');
  const meta = many(g.list.length, 'take') + ' · ' + clockText(g.list.reduce((s, t) => s + t.secs, 0));
  const side = !g.song
    ? ''
    : g.song.now
      ? '<div class="lacts"><button type="button" class="lact pgact" data-act="open" data-song="' + esc(g.song.id) + '">Open the song</button></div>'
      : '<span class="tkgone">The song has been deleted.</span>';
  return '<section class="tkg pgdayl"><div class="pgsrow tkgh">' + tick('data-selgroup="' + esc(g.key) + '"', 'Tick all of ' + esc(g.title), n === g.list.length, n > 0) +
    '<button type="button" class="pgdayt" data-act="fold" data-key="' + esc(g.key) + '" aria-expanded="' + open + '" aria-controls="' + esc(id) + '">' + FOLD +
    '<b' + (g.song ? ' class="tksong"' : '') + '>' + esc(g.title) + '</b><span class="pgdaymeta">' + meta + '</span></button>' + side + '</div>' +
    '<ul class="pgses" id="' + esc(id) + '"' + (open ? '' : ' hidden') + '>' + g.list.map((t) => rowHTML(t, now, !g.song, song(t.song), o)).join('') + '</ul></section>';
}

/** A take in the table: its tick box, when (in a day's group the time, and its song), its
 * details, and full-height buttons; `s` its song now. A deleted song's take plays only alone. */
function rowHTML(t: Take, now: number, byDate: boolean, s: { title: string; sig: string } | null, o: AllTakesShown): string {
  const id = esc(t.id);
  const on = o.playing?.id === t.id ? o.playing.how : null;
  const sig = s ? s.sig : null;
  const alone = !s;
  const ticked = o.selected.has(t.id);
  const acts = '<div class="lacts">' +
    (alone ? '' : '<button type="button" class="lact pgact" data-act="guide" data-id="' + id + '">' + (on === 'guide' ? '■ Stop' : '▶ With the guide') + '</button>') +
    '<button type="button" class="lact pgact sm" data-act="me" data-id="' + id + '">' + (on === 'me' ? '■ Stop' : '▶ Just me') + '</button>' +
    '<button type="button" class="lact pgact sm" data-act="dl" data-id="' + id + '">Download</button>' +
    '<button type="button" class="lact ldel" data-act="del" data-id="' + id + '" aria-label="Delete this take" title="Delete this take">' + DEL_ICON + '</button></div>';
  return '<li class="pgsrow tkrow' + (ticked ? ' sel' : '') + '">' + tick('data-sel="' + id + '"', 'Tick this take', ticked, false) +
    '<div class="pgsmain"><span class="pgclock">' + (byDate ? clockOf(t.at) : whenAt(t.at, now)) + '</span>' + (byDate ? '<span class="pgsong">' + esc(s ? s.title : t.title || 'A song') + '</span>' : '') +
    '<span class="pgdet">' + esc(takeDetail(t)) + '</span>' + changed(t, sig) + '</div>' + acts + '</li>';
}

/** A take's file name, named as a session's files are (Rinat, 2026-10-21), so it lists beside
 * them: "2026.10.20_19.35.41 - Nisha lagilo re - Recording.wav". */
export const takeFileName = (t: Take): string => exportName(stamp(t.at), t.title || 'Take', 'Recording');

/** The samples as an AudioBuffer on a context, to play. */
export function takeBuffer(ctx: BaseAudioContext, pcm: Int16Array, rate: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.max(1, pcm.length), rate);
  b.getChannelData(0).set(fromInt16(pcm));
  return b;
}

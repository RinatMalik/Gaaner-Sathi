/**
 * Takes (docs/ENGINE.md → Takes; docs/DATA.md → Takes): on the Practice view the open song's
 * takes, newest first, and on the Voice page every song's (Rinat, 2026-10-23: "no way to see
 * all the recorded audios in one go"), each to play back against the guide or alone, download
 * as a WAV file, or delete. Takes are kept in this browser's IndexedDB (localStorage cannot hold
 * sound): the details in one store, the samples in another, so listing never loads sound.
 * The HTML builder is pure and tested in Node.
 */
import { fromInt16 } from '../audio/dsp/pcm';
import { cleanTake, clockText, takeDetail, type Take } from '../core/practice/take';
import { whenText } from '../core/song/library';
import { inTx, openDB } from './db';
import { exportName, stamp } from './filenames';
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

  async remove(id: string): Promise<void> {
    await this.run(['takes', 'audio'], 'readwrite', (tx) => {
      tx.objectStore('takes').delete(id);
      tx.objectStore('audio').delete(id);
    });
  }
}

export interface TakesShown {
  /** The take asking whether to be deleted. */
  confirm?: string;
  /** The take playing, and how. */
  playing?: { id: string; how: 'guide' | 'me' };
}

const NO_TAKES = '<li class="tkempty">No takes yet. Switch on <b>Record me</b> at the top, then press Play: each play is a take.</li>';

/** The list: each take's time, details, a note when the notation has changed since, and its
 * buttons; `confirm` is the take asking whether to be deleted, `playing` the one playing. */
export function takesHTML(takes: readonly Take[], now: number, sig: string, o: TakesShown = {}): string {
  return takes.length ? takes.map((t) => takeHTML(t, now, sig, o)).join('') : NO_TAKES;
}

/** A take in a list. `sig` is its song's notation now; null when the song is gone, so it plays
 * only alone. */
function takeHTML(t: Take, now: number, sig: string | null, o: TakesShown): string {
  const d = new Date(t.at);
  const clock = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const when = whenText(t.at, now);
  const id = esc(t.id);
  const on = o.playing?.id === t.id ? o.playing.how : null;
  const acts = o.confirm === t.id
    ? '<span class="confirm">Delete this take? <button type="button" class="btn danger" data-act="yes" data-id="' + id + '">Delete</button><button type="button" class="btn" data-act="no" data-id="' + id + '">Keep</button></span>'
    : (sig == null ? '' : '<button type="button" class="ibtn" data-act="guide" data-id="' + id + '">' + (on === 'guide' ? '■ Stop' : '▶ With the guide') + '</button>') +
      '<button type="button" class="ibtn" data-act="me" data-id="' + id + '">' + (on === 'me' ? '■ Stop' : '▶ Just me') + '</button>' +
      '<button type="button" class="ibtn" data-act="dl" data-id="' + id + '">Download</button>' +
      '<button type="button" class="ibtn" data-act="del" data-id="' + id + '" aria-label="Delete this take">Delete</button>';
  return '<li class="tk"><span class="tkwhen">' + (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) : when) + ' ' + clock + '</span>' +
    '<span class="tkdet">' + esc(takeDetail(t)) + '</span>' +
    (sig != null && t.sig && t.sig !== sig ? '<span class="tkwarn">The notation has changed since, so the guide may not line up.</span>' : '') +
    '<span class="tkacts">' + acts + '</span></li>';
}

/** A take's song as it is now: its title and notation's fingerprint; null when it is gone. */
export type TakeSong = (id: string) => { title: string; sig: string } | null;

const many = (n: number, one: string) => n + ' ' + one + (n === 1 ? '' : 's');
const bytes = (n: number): string => (n < 1e6 ? Math.max(1, Math.round(n / 1e3)) + ' KB' : n < 1e9 ? Math.round(n / 1e6) + ' MB' : (n / 1e9).toFixed(1) + ' GB');

/** Every song's takes on the Voice page: how many, how long and how much room they take, then
 * each song's, the song with the newest take first, each under its title with a button to open
 * the song. A song since deleted keeps its takes under the title it had, to play alone. */
export function allTakesHTML(takes: readonly Take[], now: number, song: TakeSong, o: TakesShown = {}): string {
  if (!takes.length) return '<ul class="tklist">' + NO_TAKES + '</ul>';
  const groups = new Map<string, Take[]>();
  for (const t of [...takes].sort((a, b) => b.at - a.at)) {
    const g = groups.get(t.song);
    if (g) g.push(t);
    else groups.set(t.song, [t]);
  }
  const secs = takes.reduce((n, t) => n + t.secs, 0);
  const size = takes.reduce((n, t) => n + t.secs * t.rate * 2, 0);
  const head = '<p class="tksum">' + many(takes.length, 'take') + ' of ' + many(groups.size, 'song') + ' · ' + clockText(secs) + ' in all · ' + bytes(size) + ' in this browser</p>';
  return head + Array.from(groups, ([id, list]) => {
    const s = song(id);
    const title = s ? s.title : list[0]!.title || 'A song';
    return '<section class="tkgroup"><div class="tkhead"><h4 class="tksong">' + esc(title) + '</h4><span class="n">' + many(list.length, 'take') + '</span>' +
      (s ? '<button type="button" class="ibtn" data-act="open" data-song="' + esc(id) + '">Open the song</button>' : '<span class="tkgone">The song has been deleted.</span>') +
      '</div><ul class="tklist">' + list.map((t) => takeHTML(t, now, s ? s.sig : null, o)).join('') + '</ul></section>';
  }).join('');
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

/**
 * Takes on the Practice view (docs/ROADMAP.md → Phase 1; docs/adr/ADR-004-takes.md): the
 * open song's takes, newest first, each to play back against the guide or alone, download as
 * a WAV file, or delete. Takes are kept in this browser's IndexedDB (localStorage cannot hold
 * sound): the details in one store, the samples in another, so listing never loads sound.
 * The HTML builder is pure and tested in Node.
 */
import { fromInt16 } from '../audio/dsp/pcm';
import { cleanTake, takeDetail, type Take } from '../core/practice/take';
import { whenText } from '../core/song/library';
import { esc } from './view';

const DB = 'gaanersathi';
const DB_VERSION = 1;

/** The takes and their samples in IndexedDB; null where IndexedDB is not available. */
export class TakeStore {
  private constructor(private readonly db: IDBDatabase) {}

  static open(): Promise<TakeStore | null> {
    return new Promise((resolve) => {
      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.open(DB, DB_VERSION);
      } catch {
        resolve(null);
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('takes')) db.createObjectStore('takes', { keyPath: 'id' }).createIndex('song', 'song');
        if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // Another tab needs to upgrade or delete the database: let it, rather than block it.
        db.onversionchange = () => db.close();
        resolve(new TakeStore(db));
      };
      req.onerror = () => resolve(null);
      // Blocked by another tab's older connection: wait for it (it closes on versionchange).
    });
  }

  private run<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(stores, mode);
      let out: T | undefined;
      const r = fn(tx);
      if (r) r.onsuccess = () => (out = r.result);
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /** A song's takes, newest first (only their details). */
  async list(song: string): Promise<Take[]> {
    const raw = (await this.run<unknown[]>(['takes'], 'readonly', (tx) => tx.objectStore('takes').index('song').getAll(song))) ?? [];
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

/** The list: each take's time, details, a note when the notation has changed since, and its
 * buttons; `confirm` is the take asking whether to be deleted, `playing` the one playing. */
export function takesHTML(takes: readonly Take[], now: number, sig: string, o: { confirm?: string; playing?: { id: string; how: 'guide' | 'me' } } = {}): string {
  if (!takes.length) return '<li class="tkempty">No takes yet. Switch on <b>Record me</b> on the deck, then press Play: each play is a take.</li>';
  return takes.map((t) => {
    const d = new Date(t.at);
    const clock = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const when = whenText(t.at, now);
    const id = esc(t.id);
    const on = o.playing?.id === t.id ? o.playing.how : null;
    const acts = o.confirm === t.id
      ? '<span class="confirm">Delete this take? <button type="button" class="btn danger" data-act="yes" data-id="' + id + '">Delete</button><button type="button" class="btn" data-act="no" data-id="' + id + '">Keep</button></span>'
      : '<button type="button" class="ibtn" data-act="guide" data-id="' + id + '">' + (on === 'guide' ? '■ Stop' : '▶ With the guide') + '</button>' +
        '<button type="button" class="ibtn" data-act="me" data-id="' + id + '">' + (on === 'me' ? '■ Stop' : '▶ Just me') + '</button>' +
        '<button type="button" class="ibtn" data-act="dl" data-id="' + id + '">Download</button>' +
        '<button type="button" class="ibtn" data-act="del" data-id="' + id + '" aria-label="Delete this take">Delete</button>';
    return '<li class="tk"><span class="tkwhen">' + (when === 'today' || when === 'yesterday' ? when[0]!.toUpperCase() + when.slice(1) : when) + ' ' + clock + '</span>' +
      '<span class="tkdet">' + esc(takeDetail(t)) + '</span>' +
      (t.sig && t.sig !== sig ? '<span class="tkwarn">The notation has changed since, so the guide may not line up.</span>' : '') +
      '<span class="tkacts">' + acts + '</span></li>';
  }).join('');
}

/** A take's file name: the song, the date and time. */
export function takeFileName(t: Take): string {
  const d = new Date(t.at);
  const p = (n: number) => String(n).padStart(2, '0');
  const base = (t.title || 'take').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60);
  return base + ' take ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + '-' + p(d.getMinutes()) + '.wav';
}

/** The samples as an AudioBuffer on a context, to play. */
export function takeBuffer(ctx: BaseAudioContext, pcm: Int16Array, rate: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.max(1, pcm.length), rate);
  b.getChannelData(0).set(fromInt16(pcm));
  return b;
}

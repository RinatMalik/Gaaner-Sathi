/**
 * This browser's IndexedDB, for what localStorage cannot hold (docs/DATA.md → Storage): takes
 * (their details in one store, their sound in another) and each practice session's detail
 * (since 2026-10-20). One connection, opened on first use; null where IndexedDB is not
 * available.
 */
import { cleanSession, type SessionDetail } from '../core/practice/session';

const DB = 'gaanersathi';
/** 1: takes and audio; 2: sessions. */
const DB_VERSION = 2;

let opening: Promise<IDBDatabase | null> | null = null;

export function openDB(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
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
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'at' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab needs to upgrade or delete the database: let it, rather than block it.
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    req.onerror = () => resolve(null);
    // Blocked by another tab's older connection: wait for it (it closes on versionchange).
  });
  return opening;
}

/** One transaction: `fn` makes its requests; the result of the one it returns. */
export function inTx<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let out: T | undefined;
    const r = fn(tx);
    if (r) r.onsuccess = () => (out = r.result);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** The detail of this many sessions is kept, the newest; older sessions keep their summary in
 * the practice log. A session with the pitch check is about 1 KB a second of singing. */
export const KEEP_SESSIONS = 1000;

/** Each practice session's detail, by its log entry's `at`. */
export class SessionStore {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(): Promise<SessionStore | null> {
    const db = await openDB();
    return db ? new SessionStore(db) : null;
  }

  async get(at: number): Promise<SessionDetail | null> {
    return cleanSession(await inTx<unknown>(this.db, ['sessions'], 'readonly', (tx) => tx.objectStore('sessions').get(at)));
  }

  /** Keep a session's detail (the readings as 32-bit floats, half the size), and let the oldest
   * go past KEEP_SESSIONS. */
  async add(d: SessionDetail): Promise<void> {
    const stored = d.pitch ? { ...d, pitch: { ...d.pitch, readings: Float32Array.from(d.pitch.readings) } } : d;
    await inTx(this.db, ['sessions'], 'readwrite', (tx) => {
      const os = tx.objectStore('sessions');
      os.put(stored);
      const count = os.count();
      count.onsuccess = () => {
        let extra = count.result - KEEP_SESSIONS;
        if (extra <= 0) return;
        const cur = os.openCursor();
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c || extra-- <= 0) return;
          c.delete();
          c.continue();
        };
      };
    });
  }
}

// The review's findings 7 and 8 (2026-11-16): a restore that says what it kept; settings saved
// without undoing another tab's; dates where the singer is; a database shut for another tab
// opened again; and a backup's `format` read under the app's new name too.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBackup, restoredWords, restoreInto } from '../../src/app/backup';
import { localDate } from '../../src/app/filenames';
import { mergePrefs, savePrefs, loadPrefs, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { normalize, type Song } from '../../src/core/song/model';
import type { Routine } from '../../src/core/practice/routine';
import type { LogEntry } from '../../src/core/practice/log';

const song = (id: string): Song => normalize({ id, title: 'Song ' + id, text: 'সা রে গা মা', updatedAt: 1 });
const routine = (id: string): Routine => ({ id, name: 'R ' + id, items: [], updatedAt: 1 });
const entry = (at: number) => ({ at, song: 'a', title: 'Song a', secs: 60 }) as unknown as LogEntry;
const why = (f: 'full' | 'blocked') => (f === 'full' ? 'storage is full.' : 'storage is blocked.');

describe('a restore says what it kept', () => {
  const add = { songs: [song('a'), song('b')], routines: [routine('r')], log: [entry(1), entry(2)], sessions: [1, 2] };
  const ok = { songs: () => 'ok' as const, routines: () => 'ok' as const, log: async () => 'ok' as const, session: async () => true };

  it('says what it restored when everything was kept', async () => {
    const r = await restoreInto(add, ok);
    expect(r.failed).toEqual({});
    expect(restoredWords(r, why, 5)).toBe('Restored 2 songs, 1 routine and 2 practice sessions.');
    expect(restoredWords(r, why, 9)).toBe('Restored 2 songs, 1 routine and 2 practice sessions; the rest were here already.');
  });

  it('names only what it restored', async () => {
    // Found in the app: a backup's one new song was "Restored 1 song, 0 routines and 0 practice sessions".
    const r = await restoreInto({ songs: [song('c')], routines: [], log: [], sessions: [] }, ok);
    expect(restoredWords(r, why, 3)).toBe('Restored 1 song; the rest were here already.');
  });

  it('does not claim songs the browser would not keep', async () => {
    // Until 2026-11-16: "Restored 2 songs …" whatever the write said.
    const r = await restoreInto(add, { ...ok, songs: () => 'full' as const });
    expect(r.kept.songs).toEqual([]);
    const said = restoredWords(r, why, 5);
    expect(said).toBe('Restored 1 routine and 2 practice sessions. Its 2 songs could not be restored: storage is full.');
  });

  it('says so when routines and the log could not be kept either', async () => {
    const r = await restoreInto(add, { ...ok, songs: () => 'blocked' as const, routines: () => 'full' as const, log: async () => 'full' as const });
    expect(restoredWords(r, why, 5)).toBe(
      'Nothing was restored. Its 2 songs could not be restored: storage is blocked. Its 1 routine could not be restored: storage is full. Its 2 practice sessions could not be restored: storage is full.',
    );
  });

  it('counts the sessions whose detail could not be kept', async () => {
    const r = await restoreInto(add, { ...ok, session: async (s: number) => s !== 2 });
    expect(r.lost).toBe(1);
    expect(restoredWords(r, why, 5)).toContain('2 practice sessions (1 without their detail)');
  });

  it('writes nothing when everything is here already', async () => {
    const songs = vi.fn(() => 'ok' as const);
    const r = await restoreInto({ songs: [], routines: [], log: [], sessions: [] }, { ...ok, songs });
    expect(songs).not.toHaveBeenCalled();
    expect(restoredWords(r, why, 5)).toBe('Everything in this backup is here already.');
  });
});

describe('settings saved by two tabs', () => {
  const mem = (): KeyValueStore & { m: Map<string, string> } => {
    const m = new Map<string, string>();
    return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  };

  it('keeps what the other tab changed', () => {
    const S = mem();
    savePrefs(S, loadPrefs(S));
    // Two tabs open with the same settings.
    const a = loadPrefs(S);
    const b = loadPrefs(S);
    const aSeen = structuredClone(a);
    const bSeen = structuredClone(b);
    a.theme = 'dark';
    savePrefs(S, a, aSeen);
    b.plRows = 9;
    savePrefs(S, b, bSeen);
    // Until 2026-11-16 the second tab wrote its whole set, and the first tab's dark theme went.
    const now = loadPrefs(S);
    expect(now.theme).toBe('dark');
    expect(now.plRows).toBe(9);
  });

  it('removes a setting this tab took away', () => {
    const merged = mergePrefs({ theme: 'dark', plRows: 9, tab: 'voice' }, { theme: 'dark', plRows: 5 }, { plRows: 5 });
    expect(merged).toEqual({ plRows: 9, tab: 'voice' });
  });

  it('writes the whole set when nothing of this app’s is stored yet', () => {
    expect(mergePrefs(null, { a: 1 }, { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    const S = mem();
    const p = loadPrefs(S);
    const seen = structuredClone(p);
    p.theme = 'light';
    savePrefs(S, p, seen);
    expect(JSON.parse(S.m.get(STORE_KEYS.prefs)!)).toMatchObject({ theme: 'light', tab: p.tab, libSort: p.libSort });
  });

  it('sees a change inside a setting', () => {
    const merged = mergePrefs({ holdBest: { '0': 5 }, x: 1 }, { holdBest: { '0': 5 } }, { holdBest: { '0': 8 } });
    expect(merged).toEqual({ holdBest: { '0': 8 }, x: 1 });
  });
});

describe('the date a file is saved', () => {
  it('is the date where the singer is, not in UTC', () => {
    // Half past midnight: in a British summer (or anywhere east of London) UTC is still yesterday.
    const at = new Date(2026, 5, 1, 0, 30).getTime();
    expect(localDate(at)).toBe('2026-06-01');
    expect(localDate(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
  });
});

describe('a backup under the app’s new name', () => {
  it('is read as one', () => {
    const txt = JSON.stringify({ format: 'torongini-backup', version: 1, exported: '2026-11-16T10:00:00Z', songs: [{ id: 's1', title: 'A', text: 'সা' }], routines: [], log: [] });
    const b = readBackup(txt);
    expect(b?.songs).toHaveLength(1);
    expect(readBackup(JSON.stringify({ format: 'something-else', songs: [] }))).toBeNull();
  });
});

// ── A database shut for another tab (src/app/db.ts) ───────────────────────────────────────────

type Handler = ((e?: unknown) => void) | null;
class FakeDB {
  closed = false;
  onversionchange: Handler = null;
  onclose: Handler = null;
  close(): void {
    this.closed = true;
  }
  transaction(): unknown {
    if (this.closed) throw new DOMException('The database connection is closing.', 'InvalidStateError');
    const tx = {
      oncomplete: null as Handler,
      onerror: null as Handler,
      onabort: null as Handler,
      error: null,
      objectStore: () => ({
        getAllKeys: () => {
          const r = { result: [7, 8] as unknown, onsuccess: null as Handler };
          setTimeout(() => {
            r.onsuccess?.();
            tx.oncomplete?.();
          });
          return r;
        },
      }),
    };
    return tx;
  }
}

function fakeIndexedDB(version: { now: number }) {
  const opened: FakeDB[] = [];
  return {
    opened,
    open(_name: string, v: number) {
      const req = { result: null as unknown, error: null as unknown, onsuccess: null as Handler, onerror: null as Handler, onupgradeneeded: null as Handler };
      setTimeout(() => {
        if (v < version.now) {
          req.error = new DOMException('The requested version is less than the existing version.', 'VersionError');
          req.onerror?.();
          return;
        }
        const db = new FakeDB();
        opened.push(db);
        req.result = db;
        req.onsuccess?.();
      });
      return req;
    },
  };
}

describe('a database shut for another tab', () => {
  afterEach(() => {
    vi.resetModules();
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
  });

  it('is opened again at the next use', async () => {
    const idb = fakeIndexedDB({ now: 2 });
    (globalThis as { indexedDB?: unknown }).indexedDB = idb;
    const { SessionStore, whenOutdated } = await import('../../src/app/db');
    const outdated = vi.fn();
    whenOutdated(outdated);
    const store = (await SessionStore.open())!;
    expect(await store.keys()).toEqual([7, 8]);
    // Another tab deletes the database (Start afresh in an older page, say): this page lets go.
    idb.opened[0]!.onversionchange?.({ newVersion: null });
    expect(idb.opened[0]!.closed).toBe(true);
    // Until 2026-11-16 the store kept the shut connection, and this failed until a refresh.
    expect(await store.keys()).toEqual([7, 8]);
    expect(idb.opened).toHaveLength(2);
    expect(outdated).not.toHaveBeenCalled();
  });

  it('says the page is out of date when a newer copy has upgraded it', async () => {
    const version = { now: 2 };
    const idb = fakeIndexedDB(version);
    (globalThis as { indexedDB?: unknown }).indexedDB = idb;
    const { SessionStore, whenOutdated } = await import('../../src/app/db');
    const outdated = vi.fn();
    whenOutdated(outdated);
    const store = (await SessionStore.open())!;
    version.now = 3;
    idb.opened[0]!.onversionchange?.({ newVersion: 3 });
    expect(outdated).toHaveBeenCalledOnce();
    await expect(store.keys()).rejects.toThrow();
  });
});

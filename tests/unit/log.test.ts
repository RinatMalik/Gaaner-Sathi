import { describe, expect, it } from 'vitest';
import { LogStore, STORE_KEYS, type KeyValueStore, type LogBackend } from '../../src/app/store';
import { byDay, cleanEntry, cleanLog, dailyScores, dayNumber, durationText, lastDays, lastPractised, noteScores, noteTally, songTotals, streaks, type LogEntry } from '../../src/core/practice/log';

const at = (d: number, h = 9, m = 0) => new Date(2026, 9, d, h, m).getTime();
const entry = (song: string, when: number, extra: Partial<LogEntry> = {}): LogEntry =>
  ({ at: when, secs: 120, song, title: song.toUpperCase(), from: 0, to: 2, loop: false, rounds: 1, tempo: 100, top: 100, ...extra });

class Memory implements KeyValueStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('practice log entries', () => {
  it('are checked when read: damaged ones are dropped, numbers clamped, extras kept only when valid', () => {
    expect(cleanEntry(null)).toBeNull();
    expect(cleanEntry({ at: 'x', secs: 1, song: 'a' })).toBeNull();
    expect(cleanEntry({ at: 1, secs: 1, song: '' })).toBeNull();
    expect(cleanEntry({ at: 5, secs: 12.6, song: 'a', from: 3, to: 1, tempo: 999, top: 10, rounds: 0, score: 140, lines: [[0, 80], ['x', 1], [2, 101]], routine: 'Morning' }))
      .toEqual({ at: 5, secs: 13, song: 'a', title: '', from: 3, to: 3, loop: false, rounds: 1, tempo: 240, top: 240, score: 100, lines: [[0, 80], [2, 100]], routine: 'Morning' });
    expect(cleanLog([entry('b', 20), 'junk', entry('a', 10)]).map((e) => e.song)).toEqual(['a', 'b']);
    expect(cleanLog({ not: 'a list' })).toEqual([]);
  });

  it('give each song the time it was last practised', () => {
    const m = lastPractised([entry('a', 10), entry('b', 30), entry('a', 20)]);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([20, 30, undefined]);
  });
});

describe('progress from the log', () => {
  it('counts days in a row: the current run (today, or up to yesterday) and the best', () => {
    const log = [at(1), at(2), at(3), at(3, 20), at(6), at(8), at(9)].map((t) => entry('a', t));
    expect(streaks(log, at(9, 22))).toEqual({ current: 2, best: 3 });
    expect(streaks(log, at(10, 7))).toEqual({ current: 2, best: 3 });
    expect(streaks(log, at(11, 7))).toEqual({ current: 0, best: 3 });
    expect(streaks([], at(11))).toEqual({ current: 0, best: 0 });
  });

  it('groups by local day, newest first, with the time practised', () => {
    const days = byDay([entry('a', at(3, 23, 50), { secs: 60 }), entry('b', at(4, 0, 10), { secs: 30 }), entry('c', at(4, 7), { secs: 90 })]);
    expect(days.map((d) => [d.day === dayNumber(at(4)), d.secs, d.entries.map((e) => e.song)])).toEqual([[true, 120, ['b', 'c']], [false, 60, ['a']]]);
  });

  it('adds up the last days, oldest first, ending today', () => {
    const r = lastDays([entry('a', at(9), { secs: 60 }), entry('a', at(10), { secs: 30 }), entry('a', at(10, 11), { secs: 30 }), entry('a', at(1), { secs: 999 })], at(10, 23), 3);
    expect(r.map((d) => d.secs)).toEqual([0, 60, 60]);
  });

  it('totals each song: times, time, the latest title and the latest and best scores', () => {
    const t = songTotals([
      entry('a', 1, { title: 'Old name', score: 70 }), entry('b', 2, { secs: 30 }), entry('a', 3, { title: 'New name', score: 60 }), entry('a', 4, { title: 'Newest' }),
    ]);
    expect(t).toEqual([
      { song: 'a', title: 'Newest', times: 3, secs: 360, last: 4, lastScore: 60, bestScore: 70 },
      { song: 'b', title: 'B', times: 1, secs: 30, last: 2 },
    ]);
  });

  it('keeps each note of the scale sung, checked when read', () => {
    const rows = [
      { semi: 0, oct: 1, status: 'sung', score: 60, cents: -20 },
      { semi: 0, oct: 1, status: 'sung', score: 70, cents: -30 },
      { semi: 0, oct: 1, status: 'sung', score: 80, cents: -10 },
      { semi: 7, oct: -1, status: 'sung', score: 95, cents: 2 },
      { semi: 4, oct: 0, status: 'unsung', score: null, cents: null },
      { semi: 5, oct: 0, status: 'short', score: 90, cents: 0 },
    ];
    // Upper Sa 12 semitones up, lower Pa 5 down; the unsung and the too short left out.
    expect(noteTally(rows)).toEqual([[-5, 1, 95, 2], [12, 3, 70, -20]]);
    const e = cleanEntry({ ...entry('a', 1), notes: [[12, 3, 70, -20], [-5, 1, 95, 2], ['x', 1, 2, 3], [0, 0, 50, 0], [7, 2, 140, 5000]] })!;
    // Numbers clamped, as everywhere in the log; a row that is not numbers dropped.
    expect(e.notes).toEqual([[12, 3, 70, -20], [-5, 1, 95, 2], [0, 1, 50, 0], [7, 2, 100, 1200]]);
    expect(cleanEntry({ ...entry('a', 1), notes: 'x' })).not.toHaveProperty('notes');
  });

  it('sums the notes over sessions, weighted by the times sung', () => {
    const ns = noteScores([
      entry('a', 1, { notes: [[12, 3, 70, -20], [7, 1, 90, 0]] }),
      entry('b', 2, { notes: [[12, 1, 90, 0]] }),
      entry('c', 3),
    ]);
    expect(ns).toEqual([
      { semi: 7, oct: 0, n: 1, score: 90, cents: 0 },
      { semi: 0, oct: 1, n: 4, score: 75, cents: -15 },
    ]);
  });

  it('gives each day’s score for one song or all, over a time or all time', () => {
    const log = [entry('a', at(1), { score: 60 }), entry('b', at(5), { score: 90 }), entry('a', at(5, 12), { score: 70 }), entry('a', at(10), { score: 80 })];
    expect(dailyScores(log, at(10, 20), 7).map((d) => [d.score, d.n])).toEqual([[80, 2], [80, 1]]);
    expect(dailyScores(log, at(10, 20), 0, 'a').map((d) => d.score)).toEqual([60, 70, 80]);
    expect(dailyScores(log, at(10, 20), 7, 'b').map((d) => d.score)).toEqual([90]);
  });

  it('writes durations the short way', () => {
    expect([40, 89, 720, 3600, 3900].map(durationText)).toEqual(['40 s', '1 min', '12 min', '1 h', '1 h 5 min']);
  });
});

/** The browser's database for the log, in memory: entries by their `at`. `fail` makes the next
 * writes fail as a browser's does (its name says why); `wait` holds a write until it is let go. */
class FakeDB implements LogBackend {
  m = new Map<number, LogEntry>();
  fail: string | null = null;
  wait: Promise<void> | null = null;
  writes = 0;
  private async writing(): Promise<void> {
    await this.wait;
    if (this.fail) throw Object.assign(new Error(this.fail), { name: this.fail });
    this.writes++;
  }
  async all() {
    return structuredClone([...this.m.values()]);
  }
  async put(es: readonly LogEntry[]) {
    await this.writing();
    for (const e of es) this.m.set(e.at, structuredClone(e));
  }
  async remove(ats: readonly number[]) {
    await this.writing();
    for (const at of ats) this.m.delete(at);
  }
  async clear() {
    await this.writing();
    this.m.clear();
  }
}
const ats = (L: LogStore) => L.load().map((e) => e.at);

describe('the log in the browser’s database', () => {
  it('holds a year of practice and more: nothing of it is in localStorage, which would be full', async () => {
    // localStorage with room for 20,000 characters, as a browser's has for five million: the
    // log kept there fills it, and says so; kept in the database it does not touch it.
    class Small extends Memory {
      override setItem(k: string, v: string) {
        const others = [...this.m].reduce((a, [key, x]) => a + (key === k ? 0 : key.length + x.length), 0);
        if (others + k.length + v.length > 20_000) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        super.setItem(k, v);
      }
    }
    const scored = (i: number) => entry('song-' + (i % 7), at(1) + i * 600_000, { score: 70, lines: [[0, 71], [1, 80], [2, 64]], notes: [[0, 12, 80, -6], [2, 9, 71, 4], [4, 7, 66, -12]] });
    const local = new LogStore(new Small());
    const results: string[] = [];
    for (let i = 0; i < 200; i++) results.push(await local.add(scored(i)));
    expect(results.indexOf('full')).toBeGreaterThan(20);
    expect(local.load().length).toBe(results.indexOf('full'));

    const S = new Small();
    const L = new LogStore(S, async () => new FakeDB());
    await L.ready;
    for (let i = 0; i < 200; i++) expect(await L.add(scored(i))).toBe('ok');
    expect(L.load()).toHaveLength(200);
    expect(S.m.has(STORE_KEYS.log)).toBe(false);
  });

  it('takes in the log this browser kept in localStorage, and removes that copy only once it has all arrived', async () => {
    const S = new Memory();
    const old = new LogStore(S);
    await old.addAll([entry('a', 1, { score: 70 }), entry('b', 2), entry('c', 3)]);
    const db = new FakeDB();
    let told = 0;
    const L = new LogStore(S, async () => db);
    L.onChange = () => told++;
    // Until the database has opened, the log is read where it was.
    expect(ats(L)).toEqual([1, 2, 3]);
    await L.ready;
    expect(ats(L)).toEqual([1, 2, 3]);
    expect([...db.m.keys()]).toEqual([1, 2, 3]);
    expect(db.m.get(1)!.score).toBe(70);
    expect(S.m.has(STORE_KEYS.log)).toBe(false);
    expect(told).toBe(1);
    // The next visit finds it in the database.
    const next = new LogStore(S, async () => db);
    await next.ready;
    expect(ats(next)).toEqual([1, 2, 3]);
  });

  it('leaves the log in localStorage, and goes on keeping it there, when the database will not take it or will not open', async () => {
    for (const open of [async () => Object.assign(new FakeDB(), { fail: 'QuotaExceededError' }), async () => null, async () => Promise.reject(new Error('no database'))]) {
      const S = new Memory();
      await new LogStore(S).addAll([entry('a', 1), entry('b', 2)]);
      const L = new LogStore(S, open as () => Promise<LogBackend | null>);
      await L.ready;
      expect(ats(L)).toEqual([1, 2]);
      expect(await L.add(entry('c', 3))).toBe('ok');
      expect(ats(new LogStore(S))).toEqual([1, 2, 3]);
    }
    // A database that loses what it is given does not get the only copy.
    const S = new Memory();
    await new LogStore(S).addAll([entry('a', 1), entry('b', 2)]);
    const leaky = new FakeDB();
    leaky.put = async () => {};
    const L = new LogStore(S, async () => leaky);
    await L.ready;
    expect(ats(L)).toEqual([1, 2]);
    expect(S.m.has(STORE_KEYS.log)).toBe(true);
  });

  it('shows a session in the log at once, and keeps it in the background', async () => {
    const db = new FakeDB();
    const L = new LogStore(new Memory(), async () => db);
    await L.ready;
    let go!: () => void;
    db.wait = new Promise((r) => (go = r));
    const kept = L.add(entry('a', 5));
    expect(ats(L)).toEqual([5]);
    expect(db.m.size).toBe(0);
    go();
    expect(await kept).toBe('ok');
    expect([...db.m.keys()]).toEqual([5]);
    // What load() gives is the caller's own list.
    L.load().length = 0;
    expect(ats(L)).toEqual([5]);
  });

  it('takes back out a session the database refused, and says why', async () => {
    const db = new FakeDB();
    const L = new LogStore(new Memory(), async () => db);
    await L.ready;
    await L.add(entry('a', 1));
    let told = 0;
    L.onChange = () => told++;
    db.fail = 'QuotaExceededError';
    const full = L.add(entry('b', 2));
    expect(ats(L)).toEqual([1, 2]);
    expect(await full).toBe('full');
    expect(ats(L)).toEqual([1]);
    expect(told).toBe(1);
    db.fail = 'InvalidStateError';
    expect(await L.remove(1)).toBe('blocked');
    expect(ats(L)).toEqual([1]);
    // A session logged behind the one refused still stands, in the log and in the database.
    let go!: () => void;
    db.wait = new Promise((r) => (go = r));
    db.fail = 'QuotaExceededError';
    const refused = L.add(entry('c', 3));
    const behind = L.add(entry('d', 4));
    expect(ats(L)).toEqual([1, 3, 4]);
    let seen: number[] = [];
    L.onChange = () => {
      // As the refusal is told: the refused one gone, the one still on its way there.
      seen = ats(L);
      db.fail = null;
    };
    go();
    expect(await refused).toBe('full');
    expect(seen).toEqual([1, 4]);
    expect(await behind).toBe('ok');
    expect(ats(L)).toEqual([1, 4]);
    expect([...db.m.keys()]).toEqual([1, 4]);
  });

  it('gives older entries their notes, deletes a session or a day’s, and starts afresh', async () => {
    const db = new FakeDB();
    const S = new Memory();
    const L = new LogStore(S, async () => db);
    await L.ready;
    await L.addAll([entry('a', 1, { score: 70 }), entry('b', 2, { score: 80 }), entry('c', 3), entry('d', 4)]);
    expect(await L.setNotes(new Map<number, [number, number, number, number][]>([[2, [[0, 3, 80, -5]]], [99, [[0, 1, 1, 1]]]]))).toBe('ok');
    expect(L.load().map((e) => e.notes ?? null)).toEqual([null, [[0, 3, 80, -5]], null, null]);
    expect(db.m.get(2)!.notes).toEqual([[0, 3, 80, -5]]);
    const writes = db.writes;
    expect(await L.setNotes(new Map([[99, [[0, 1, 1, 1]]]]))).toBe('ok');
    expect(db.writes).toBe(writes);
    expect(await L.remove(1)).toBe('ok');
    expect(await L.remove([2, 4])).toBe('ok');
    expect(ats(L)).toEqual([3]);
    expect([...db.m.keys()]).toEqual([3]);
    // An entry added again replaces the one with its time, as a backup restored twice would.
    await L.add(entry('c2', 3));
    expect(L.load().map((e) => e.song)).toEqual(['c2']);
    expect(await L.clear()).toBe('ok');
    expect(L.load()).toEqual([]);
    expect(db.m.size).toBe(0);
  });

  it('keeps two tabs in step: each is told of the other’s sessions, and neither writes over them', async () => {
    const db = new FakeDB();
    const S = new Memory();
    const tabs: LogStore[] = [];
    const tell = (from: number) => () => tabs.forEach((t, i) => i !== from && void t.sync());
    tabs.push(new LogStore(S, async () => db, tell(0)), new LogStore(S, async () => db, tell(1)));
    const [a, b] = tabs as [LogStore, LogStore];
    await Promise.all([a.ready, b.ready]);
    let told = 0;
    b.onChange = () => told++;
    await a.add(entry('a', 1));
    await b.add(entry('b', 2));
    await a.add(entry('c', 3));
    await new Promise((r) => setTimeout(r, 0));
    expect(ats(a)).toEqual([1, 2, 3]);
    expect(ats(b)).toEqual([1, 2, 3]);
    expect(told).toBe(2);
    // A session logged while the other tab's is being read is not lost from view.
    const reading = b.sync();
    const adding = b.add(entry('d', 4));
    expect(ats(b)).toEqual([1, 2, 3, 4]);
    await Promise.all([reading, adding]);
    expect(ats(b)).toEqual([1, 2, 3, 4]);
  });

  it('takes in a session that a page open from before the log moved left in localStorage', async () => {
    const db = new FakeDB();
    const S = new Memory();
    const L = new LogStore(S, async () => db);
    await L.ready;
    await L.add(entry('a', 1));
    // The older page, as it was: it appends to localStorage.
    await new LogStore(S).add(entry('old', 2));
    await L.sync();
    expect(ats(L)).toEqual([1, 2]);
    expect([...db.m.keys()]).toEqual([1, 2]);
    expect(S.m.has(STORE_KEYS.log)).toBe(false);
  });
});

describe('the log in localStorage, where a browser has no database', () => {
  it('gives older entries their notes, and starts afresh', async () => {
    const S = new Memory();
    const a = new LogStore(S);
    await a.add(entry('a', 1, { score: 70 }));
    await a.add(entry('b', 2, { score: 80 }));
    expect(await a.setNotes(new Map<number, [number, number, number, number][]>([[2, [[0, 3, 80, -5]]]]))).toBe('ok');
    expect(a.load().map((e) => e.notes ?? null)).toEqual([null, [[0, 3, 80, -5]]]);
    expect(await a.remove(1)).toBe('ok');
    expect(a.load().map((e) => e.at)).toEqual([2]);
    // A day's at once.
    await a.add(entry('c', 3));
    await a.add(entry('d', 4));
    expect(await a.remove([2, 4])).toBe('ok');
    expect(a.load().map((e) => e.at)).toEqual([3]);
    expect(await a.clear()).toBe('ok');
    expect(a.load()).toEqual([]);
    expect(S.m.has(STORE_KEYS.log)).toBe(false);
  });

  it('appends to what is stored, so another tab’s entries survive', async () => {
    const S = new Memory();
    const a = new LogStore(S);
    const b = new LogStore(S);
    expect(await a.add(entry('a', 1))).toBe('ok');
    expect(await b.add(entry('b', 2))).toBe('ok');
    expect(await a.add(entry('c', 3))).toBe('ok');
    expect(a.load().map((e) => e.song)).toEqual(['a', 'b', 'c']);
  });

  it('starts again when the stored log is unreadable, and reports a full or blocked store', async () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.log, '{oops');
    const L = new LogStore(S);
    expect(L.load()).toEqual([]);
    await L.add(entry('a', 1));
    expect(L.load()).toHaveLength(1);
    const full = new LogStore({ ...S, getItem: () => null, removeItem() {}, setItem() {
      throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    } });
    expect(await full.add(entry('a', 1))).toBe('full');
    expect(await new LogStore(null).add(entry('a', 1))).toBe('blocked');
    // Nothing stored and nothing to delete is no failure.
    expect(await new LogStore(null).remove(1)).toBe('ok');
    expect(LogStore.isLogKey(STORE_KEYS.log) && LogStore.isLogKey(null) && !LogStore.isLogKey(STORE_KEYS.songs)).toBe(true);
  });
});

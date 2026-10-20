import { describe, expect, it } from 'vitest';
import { LogStore, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
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

describe('the log in storage', () => {
  it('gives older entries their notes, and starts afresh', () => {
    const S = new Memory();
    const a = new LogStore(S);
    a.add(entry('a', 1, { score: 70 }));
    a.add(entry('b', 2, { score: 80 }));
    expect(a.setNotes(new Map<number, [number, number, number, number][]>([[2, [[0, 3, 80, -5]]]]))).toBe('ok');
    expect(a.load().map((e) => e.notes ?? null)).toEqual([null, [[0, 3, 80, -5]]]);
    expect(a.clear()).toBe('ok');
    expect(a.load()).toEqual([]);
    expect(S.m.has(STORE_KEYS.log)).toBe(false);
  });

  it('appends to what is stored, so another tab’s entries survive', () => {
    const S = new Memory();
    const a = new LogStore(S);
    const b = new LogStore(S);
    expect(a.add(entry('a', 1))).toBe('ok');
    expect(b.add(entry('b', 2))).toBe('ok');
    expect(a.add(entry('c', 3))).toBe('ok');
    expect(a.load().map((e) => e.song)).toEqual(['a', 'b', 'c']);
  });

  it('starts again when the stored log is unreadable, and reports a full or blocked store', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.log, '{oops');
    const L = new LogStore(S);
    expect(L.load()).toEqual([]);
    L.add(entry('a', 1));
    expect(L.load()).toHaveLength(1);
    const full = new LogStore({ ...S, getItem: () => null, removeItem() {}, setItem() {
      throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    } });
    expect(full.add(entry('a', 1))).toBe('full');
    expect(new LogStore(null).add(entry('a', 1))).toBe('blocked');
    expect(LogStore.isLogKey(STORE_KEYS.log) && LogStore.isLogKey(null) && !LogStore.isLogKey(STORE_KEYS.songs)).toBe(true);
  });
});

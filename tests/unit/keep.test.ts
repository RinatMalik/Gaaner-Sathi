// Asking the browser to keep what the app stores, and saying how long ago it was backed up
// (docs/DATA.md → Storage, Backups): everything lives in the browser alone, which may clear it.
import { describe, expect, it } from 'vitest';
import { BACKUP_DUE_DAYS, DEVICE_PREFS, backupFile, backupNote, readBackup, restoredPrefs } from '../../src/app/backup';
import { ASK_EVERY_MS, askToKeep, type StorageKeeper } from '../../src/app/keep';
import { DEFAULT_PREFS, loadPrefs, STORE_KEYS } from '../../src/app/store';

/** A browser's storage manager: whether it keeps the site's data already, what it answers when
 * asked to, and how often it was asked. */
function browser(kept: boolean, answer: boolean | Error = true): StorageKeeper & { asked: number } {
  const b = {
    asked: 0,
    persisted: async () => kept,
    persist: async () => {
      b.asked++;
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return b;
}
const DAY = 86_400_000;
const NOW = new Date(2026, 10, 15, 12).getTime();

describe('asking the browser to keep what the app stores', () => {
  it('asks once there is something to lose, and remembers that it asked', async () => {
    const yes = browser(false, true);
    expect(await askToKeep(yes, undefined, NOW)).toEqual({ kept: true, asked: true });
    const no = browser(false, false);
    expect(await askToKeep(no, undefined, NOW)).toEqual({ kept: false, asked: true });
    expect([yes.asked, no.asked]).toEqual([1, 1]);
  });

  it('does not ask a browser that keeps it already', async () => {
    const b = browser(true);
    expect(await askToKeep(b, undefined, NOW)).toEqual({ kept: true, asked: false });
    expect(b.asked).toBe(0);
  });

  it('after a no, does not ask again for a month (Firefox asks the user each time)', async () => {
    const b = browser(false, false);
    expect(await askToKeep(b, NOW - 29 * DAY, NOW)).toEqual({ kept: false, asked: false });
    expect(b.asked).toBe(0);
    expect(await askToKeep(b, NOW - ASK_EVERY_MS, NOW)).toEqual({ kept: false, asked: true });
    expect(b.asked).toBe(1);
    // A clock set back since it asked is no reason never to ask again.
    expect((await askToKeep(b, NOW + 5 * DAY, NOW)).asked).toBe(true);
  });

  it('says it does not know where the browser cannot say, or fails', async () => {
    expect(await askToKeep(undefined, undefined, NOW)).toEqual({ kept: null, asked: false });
    expect(await askToKeep({}, undefined, NOW)).toEqual({ kept: null, asked: false });
    expect(await askToKeep({ persisted: async () => false }, undefined, NOW)).toEqual({ kept: null, asked: false });
    expect(await askToKeep(browser(false, new Error('not allowed')), undefined, NOW)).toEqual({ kept: null, asked: true });
    const broken = { persisted: async (): Promise<boolean> => Promise.reject(new Error('no')), persist: async () => true };
    expect(await askToKeep(broken, undefined, NOW)).toEqual({ kept: null, asked: false });
  });
});

describe('the Music library’s note of the last backup', () => {
  const at = (daysAgo: number, h = 9) => new Date(2026, 10, 15 - daysAgo, h).getTime();

  it('says nothing until there is a song or a session of the user’s own', () => {
    expect(backupNote({ now: NOW })).toEqual({ text: '', due: false });
    expect(backupNote({ last: at(3), now: NOW })).toEqual({ text: '', due: false });
  });

  it('says how long ago everything was backed up, by the calendar', () => {
    const say = (last: number) => backupNote({ last, oldest: at(60), newest: at(40), now: NOW }).text;
    expect(say(at(0, 1))).toBe('Backed up today');
    expect(say(at(1, 23))).toBe('Backed up yesterday');
    expect(say(at(12))).toBe('Backed up 12 days ago');
    // A clock set back since: today, not a time to come.
    expect(say(NOW + 3 * DAY)).toBe('Backed up today');
  });

  it('asks for another when work a fortnight old is in no backup, and not when nothing is new', () => {
    expect(BACKUP_DUE_DAYS).toBe(14);
    expect(backupNote({ last: at(13), oldest: at(60), newest: at(0), now: NOW })).toEqual({ text: 'Backed up 13 days ago', due: false });
    expect(backupNote({ last: at(14), oldest: at(60), newest: at(0), now: NOW })).toEqual({ text: 'Backed up 14 days ago: time for another', due: true });
    // Nothing sung or changed since: the backup holds it all, however old.
    expect(backupNote({ last: at(90), oldest: at(200), newest: at(120), now: NOW })).toEqual({ text: 'Backed up 90 days ago', due: false });
  });

  it('says so when there has never been one, and asks once the work is a fortnight old', () => {
    expect(backupNote({ oldest: at(2), newest: at(0), now: NOW })).toEqual({ text: 'Not backed up yet', due: false });
    expect(backupNote({ oldest: at(14), newest: at(0), now: NOW })).toEqual({ text: 'Not backed up yet: save a copy with Back up or export', due: true });
  });

  it('is this browser’s own: kept with the settings, never written to a backup or taken from one', () => {
    const S = new Map<string, string>([[STORE_KEYS.prefs, JSON.stringify({ lastBackup: at(3), keepAsked: at(40) })]]);
    const store = { getItem: (k: string) => S.get(k) ?? null, setItem: () => {}, removeItem: () => {} };
    const p = loadPrefs(store);
    expect([p.lastBackup, p.keepAsked]).toEqual([at(3), at(40)]);
    S.set(STORE_KEYS.prefs, JSON.stringify({ lastBackup: 'yesterday', keepAsked: -1 }));
    expect(loadPrefs(store)).not.toHaveProperty('lastBackup');
    expect(loadPrefs(store)).not.toHaveProperty('keepAsked');
    expect(DEVICE_PREFS).toEqual(expect.arrayContaining(['lastBackup', 'keepAsked']));
    const file = backupFile({ at: NOW, songs: [], routines: [], log: [], prefs: { ...DEFAULT_PREFS, lastBackup: at(3), keepAsked: at(40) } }, []).parts.join('');
    expect(readBackup(file)!.prefs).not.toHaveProperty('lastBackup');
    expect(readBackup(file)!.prefs).not.toHaveProperty('keepAsked');
    // Restored with its settings on a browser that was backed up last week: that stays so.
    const here = { ...DEFAULT_PREFS, lastBackup: at(7) } as Record<string, unknown>;
    expect(restoredPrefs(here, { theme: 'dark', lastBackup: at(300) }).lastBackup).toBe(at(7));
  });
});

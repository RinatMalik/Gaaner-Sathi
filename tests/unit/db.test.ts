// The browser's database, opened once (src/app/db.ts → openOnce), for the sessions' and the
// takes' stores.
import { describe, expect, it } from 'vitest';
import { openOnce } from '../../src/app/db';

describe('openOnce', () => {
  it('gives every caller at the same moment the store, opening it once', async () => {
    // A day of 29 sessions read together, as a day's file for AI does, while the store opens:
    // Rinat's file of 27 October got the detail of its first session only.
    let opened = 0;
    const store = { name: 'sessions' };
    const open = openOnce(async () => {
      opened++;
      await new Promise((r) => setTimeout(r, 5));
      return store;
    });
    const got = await Promise.all(Array.from({ length: 29 }, () => open()));
    expect(got.filter((s) => s === store)).toHaveLength(29);
    expect(opened).toBe(1);
    expect(await open()).toBe(store);
    expect(opened).toBe(1);
  });

  it('gives null to every caller where there is no database', async () => {
    const open = openOnce(async () => null);
    expect(await Promise.all([open(), open()])).toEqual([null, null]);
  });
});

// Round sixty-one (Rinat, 2026-11-13: "currently when a line is clicked it expands. would like to
// have a way, maybe a button, to expand all"): Expand all at the head of the Practice lines'
// settings, remembered on the device.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { loadPrefs, STORE_KEYS, type KeyValueStore } from '../../src/app/store';

class Memory implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

describe('Expand all', () => {
  it('is the first of the lines’ settings, under the lines', () => {
    const sets = page.slice(page.indexOf('<div class="psets"'), page.indexOf('</section>', page.indexOf('<div class="psets"')));
    expect(sets).toMatch(/^<div class="psets"[^>]*>\s*<div class="mx"><button type="button" class="btn" id="plAllBtn" aria-controls="plList"[^>]*>Expand all<\/button><\/div>/);
  });

  it('is remembered on the device when on, and only as on', () => {
    const S = new Memory();
    expect(loadPrefs(S)).not.toHaveProperty('plOpen');
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ plOpen: true }));
    expect(loadPrefs(S).plOpen).toBe(true);
    for (const bad of [false, 'true', 1, null]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ plOpen: bad }));
      expect(loadPrefs(S)).not.toHaveProperty('plOpen');
    }
  });
});

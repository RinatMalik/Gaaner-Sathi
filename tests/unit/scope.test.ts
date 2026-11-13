// Round fifty-seven (Rinat, 2026-11-09): what is the song's and what is every song's. A Sa for a
// whole rewaz, never saved to its songs; how loud the rhythm and the drone are, the same for every
// song; the routines dragged into an order.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { metaText, routineHTML, routinesInOrder, type ItemSong } from '../../src/app/rewaz';
import { DEFAULT_PREFS, loadPrefs, RoutineStore, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { beatLevel, DEFAULT_SOUND, droneLevelOf, droneLevels } from '../../src/audio/sound';
import { cleanRoutine, STARTER, type Routine } from '../../src/core/practice/routine';
import { cleanTake } from '../../src/core/practice/take';
import { normalize } from '../../src/core/song/model';
import { cleanSound, SONG_SOUND_KEYS, soundOf } from '../../src/core/song/sound';

class Memory implements KeyValueStore {
  private m = new Map<string, string>();
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
const prefsOf = (saved: object) => {
  const S = new Memory();
  S.setItem(STORE_KEYS.prefs, JSON.stringify(saved));
  return loadPrefs(S);
};

describe('how loud the rhythm and the drone are', () => {
  it('is not kept with a song: a rhythm level saved with one is ignored', () => {
    expect(SONG_SOUND_KEYS).not.toContain('tablaVol');
    expect(cleanSound({ tablaVol: 0.2 })).toBeUndefined();
    expect(cleanSound({ tablaVol: 0.2, speed: 'half' })).toEqual({ speed: 'half' });
    expect(normalize({ id: 's', title: 's', sound: { tablaVol: 0.2, speed: 'half' } }).sound).toEqual({ speed: 'half' });
    expect(soundOf({ ...structuredClone(DEFAULT_SOUND) })).not.toHaveProperty('tablaVol');
  });

  it('the drone’s level: as last set; until then the usual sound’s, or a half where that has none', () => {
    expect(droneLevelOf({ droneLevel: 0.3, droneVol: 0.8 })).toBe(0.3);
    expect(droneLevelOf({ droneLevel: 0, droneVol: 0.8 })).toBe(0);
    expect(droneLevelOf({ droneVol: 0.8 })).toBe(0.8);
    expect(droneLevelOf({ droneVol: 0 })).toBe(0.5);
  });

  it('plays through the engine’s own sums, unchanged', () => {
    expect(droneLevels({ ...DEFAULT_SOUND, droneVol: 0 })).toEqual({ harm: 0, tan: 0 });
    expect(beatLevel({ ...DEFAULT_SOUND, beat: 'off', tablaVol: 0.7 })).toBe(0);
  });

  it('is kept on the device, read carefully', () => {
    expect(loadPrefs(new Memory())).not.toHaveProperty('droneLevel');
    expect(loadPrefs(new Memory())).not.toHaveProperty('beatMute');
    expect(prefsOf({ droneLevel: 0.4 }).droneLevel).toBe(0.4);
    expect(prefsOf({ droneLevel: 0 }).droneLevel).toBe(0);
    expect(prefsOf({ droneLevel: 7 }).droneLevel).toBe(1);
    expect(prefsOf({ droneLevel: 'loud' })).not.toHaveProperty('droneLevel');
    expect(prefsOf({ beatMute: true }).beatMute).toBe(true);
    expect(prefsOf({ beatMute: 'yes' })).not.toHaveProperty('beatMute');
  });

  it('the picker offers No rhythm, as the drone’s offers No drone', () => {
    expect(page).toContain('<option value="off">No rhythm</option>');
    expect(page).toContain('<option value="off">No drone</option>');
  });
});

describe('no Sa on a rewaz routine any more (Rinat, 2026-11-13: "that didn\'t help the way I thought it would")', () => {
  const item = [{ song: 'a', rounds: 2 }];

  it('a routine saved with one is read without it, and saved without it again', () => {
    const r = cleanRoutine('r', { name: 'R', items: item, updatedAt: 1, sa: { saKey: 0, saOct: 3 } })!;
    expect(r).not.toHaveProperty('sa');
    const S = new Memory();
    S.setItem('gaanersathi.routines.v1', JSON.stringify({ r: { name: 'R', items: item, updatedAt: 1, sa: { saKey: 0, saOct: 3 } } }));
    const store = new RoutineStore(S);
    const got = store.load().get('r')!;
    expect(got).not.toHaveProperty('sa');
    store.save(got);
    expect(JSON.parse(S.getItem('gaanersathi.routines.v1')!).r).not.toHaveProperty('sa');
  });

  it('is not offered in its settings, nor said beside its name', () => {
    const r: Routine = { id: 'r', name: 'R', items: item, updatedAt: 0 };
    expect(metaText(r, true, 300)).toBe('1 item · about 5 min');
    const html = routineHTML(r, 0, { saved: true, open: true, secs: 300, confirming: false, picking: null, openId: '', exFirst: false }, () => null, [], []);
    expect(html).not.toContain('Sa for every item');
    expect(html).not.toContain('data-act="sa"');
  });

  it('a take sung in it remembers it, to play back against the guide in that Sa', () => {
    const t = { id: 't', song: 's', at: 1, secs: 9, rate: 24000 };
    expect(cleanTake({ ...t, sa: { saKey: 0, saOct: 3 } })!.sa).toEqual({ saKey: 0, saOct: 3 });
    expect(cleanTake(t)).not.toHaveProperty('sa');
    expect(cleanTake({ ...t, sa: { saKey: 40, saOct: 3 } })).not.toHaveProperty('sa');
  });
});

describe('the routines, dragged into an order', () => {
  const R = (id: string, name: string): Routine => ({ id, name, items: [], updatedAt: 0 });
  const ids = (saved: Routine[], order?: string[]) => routinesInOrder(saved, order).map((x) => x.r.id);
  const a = R('a', 'Alpha');
  const b = R('b', 'Beta');
  const c = R('c', 'Gamma');

  it('are by name, the ready-made warm-up first, until one is dragged', () => {
    expect(ids([c, a, b])).toEqual([STARTER.id, 'a', 'b', 'c']);
    expect(routinesInOrder([a], undefined).map((x) => x.saved)).toEqual([false, true]);
  });

  it('keep the order dragged, the warm-up among them', () => {
    expect(ids([a, b, c], ['c', STARTER.id, 'a', 'b'])).toEqual(['c', STARTER.id, 'a', 'b']);
  });

  it('a new one comes after those dragged, and one deleted drops out', () => {
    expect(ids([a, b, c], ['c', STARTER.id, 'a'])).toEqual(['c', STARTER.id, 'a', 'b']);
    expect(ids([a, c], ['c', 'gone', STARTER.id, 'a'])).toEqual(['c', STARTER.id, 'a']);
  });

  it('the warm-up keeps its place once it is saved', () => {
    const saved = { ...structuredClone(STARTER), updatedAt: 5 };
    expect(routinesInOrder([a, saved], ['a', STARTER.id]).map((x) => [x.r.id, x.saved])).toEqual([['a', true], [STARTER.id, true]]);
  });

  it('each has a grip at the start of its heading, apart from its items’ handles', () => {
    const song = (): ItemSong | null => null;
    const row = { saved: true, open: false, secs: 60, confirming: false, picking: null, openId: '', exFirst: false };
    const html = routineHTML(a, 0, row, song, [], []);
    expect(html).toContain('<div class="rwhead"><button type="button" class="lgrip rwgrip" data-rmove="a"');
    expect(html.match(/data-rmove=/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Move Alpha: drag, or press the up or down arrow"');
  });

  it('are kept on the device, read carefully', () => {
    expect(loadPrefs(new Memory())).not.toHaveProperty('rewazOrder');
    expect(prefsOf({ rewazOrder: ['b', 3, '', 'a'] }).rewazOrder).toEqual(['b', 'a']);
    expect(prefsOf({ rewazOrder: 'b' })).not.toHaveProperty('rewazOrder');
    expect(prefsOf({ rewazOrder: [] })).not.toHaveProperty('rewazOrder');
    expect({ ...DEFAULT_PREFS }).not.toHaveProperty('rewazOrder');
  });
});

// Round fifty-seven (Rinat, 2026-11-09): what is the song's and what is every song's. A Sa for a
// whole rewaz, never saved to its songs; how loud the rhythm and the drone are, the same for every
// song; a tag on the deck saying whose each setting is; the routines dragged into an order.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { metaText, routineHTML, routinesInOrder, saFieldHTML, type ItemSong } from '../../src/app/rewaz';
import { DEFAULT_PREFS, loadPrefs, RoutineStore, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { SCOPE_ALL, SCOPE_NOW, scopeWords, songSoundSummary } from '../../src/app/view';
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
    expect(cleanSound({ tablaVol: 0.2, beat: 'kit' })).toEqual({ beat: 'kit' });
    expect(normalize({ id: 's', title: 's', sound: { tablaVol: 0.2, speed: 'half' } }).sound).toEqual({ speed: 'half' });
    expect(soundOf({ ...structuredClone(DEFAULT_SOUND) })).not.toHaveProperty('tablaVol');
  });

  it('keeps which songs have no drone, and which instrument, half-speed and the rest are the song’s', () => {
    expect(cleanSound({ droneVol: 0 })).toEqual({ droneVol: 0 });
    expect(cleanSound({ beat: 'off', speed: 'double' })).toEqual({ beat: 'off', speed: 'double' });
    expect(songSoundSummary({ ...DEFAULT_SOUND, droneVol: 0, beat: 'off' })).toBe('3 reeds · No drone · No rhythm');
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

describe('a Sa for a whole rewaz', () => {
  const item = [{ song: 'a', rounds: 2 }];
  const clean = (sa: unknown) => cleanRoutine('r', { name: 'R', items: item, sa });

  it('is kept with the routine, read carefully, and absent means each song’s own', () => {
    expect(clean({ saKey: 0, saOct: 3 })!.sa).toEqual({ saKey: 0, saOct: 3 });
    expect(clean({ saKey: 11, saOct: 5 })!.sa).toEqual({ saKey: 11, saOct: 5 });
    for (const bad of [undefined, null, 'C', {}, { saKey: 12, saOct: 4 }, { saKey: -1, saOct: 4 }, { saKey: 1.5, saOct: 4 }, { saKey: 1, saOct: 2 }, { saKey: '1', saOct: 4 }]) expect(clean(bad)).not.toHaveProperty('sa');
  });

  it('is saved with it and read back; taken off, it is gone', () => {
    const store = new RoutineStore(new Memory());
    const r: Routine = { id: 'r', name: 'R', items: item, updatedAt: 1, sa: { saKey: 0, saOct: 3 } };
    store.save(r);
    expect(store.load().get('r')!.sa).toEqual({ saKey: 0, saOct: 3 });
    delete r.sa;
    store.save(r);
    expect(store.load().get('r')).not.toHaveProperty('sa');
  });

  it('is picked as each song’s own, or a key and then its octave', () => {
    const own = saFieldHTML(undefined);
    expect(own).toContain('<option value="" selected>Each song’s own</option>');
    expect(own).not.toContain('data-act="saoct"');
    const c = saFieldHTML({ saKey: 0, saOct: 3 });
    expect(c).toContain('<option value="">Each song’s own</option>');
    expect(c).toContain('<option value="0" selected>C · White 1</option>');
    expect(c).toContain('data-act="saoct"');
    expect(c).toContain('<option value="3" selected>C3 · low</option>');
  });

  it('is said beside the routine’s name, so it shows when folded', () => {
    const r: Routine = { id: 'r', name: 'R', items: item, updatedAt: 0 };
    expect(metaText(r, true, 300)).toBe('1 item · about 5 min');
    expect(metaText({ ...r, sa: { saKey: 1, saOct: 3 } }, true, 300)).toBe('1 item · about 5 min · Sa C♯3');
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

describe('the tags saying whose each setting is', () => {
  it('say so for a song, an exercise of your own and a built-in exercise', () => {
    expect(scopeWords({}).song.text).toBe('this song');
    expect(scopeWords({}).tempo.text).toBe('this song');
    expect(scopeWords({ exercise: true }).song.text).toBe('this exercise');
    expect(scopeWords({ example: true }).song.text).toBe('all exercises');
    // A built-in exercise cannot be changed: a tempo changed on one goes with it.
    expect(scopeWords({ example: true }).tempo).toEqual({ text: 'for now', title: SCOPE_NOW });
  });

  /** The tag next after a control's id in the page: its group's. */
  const tagAfter = (id: string) => page.slice(page.indexOf('id="' + id + '"')).match(/class="scope[^"]*"[^>]*>([^<]*)</)![1];
  /** The tag next before a control's id in the page. */
  const tagBefore = (id: string) => Array.from(page.slice(0, page.indexOf('id="' + id + '"')).matchAll(/class="scope[^"]*"[^>]*>([^<]*)</g)).at(-1)![1];

  it('on every group of the deck', () => {
    expect(tagBefore('fromLine')).toBe('for now');
    expect(tagBefore('taalPick')).toBe('for now');
    expect(tagAfter('pOct')).toBe('all songs');
    expect(tagBefore('keysChk')).toBe('all songs');
    expect(tagBefore('guideVol')).toBe('all songs');
    expect(tagBefore('tablaVol')).toBe('all songs');
    expect(tagBefore('tempoRange')).toBe('this song');
    expect(tagBefore('saKey')).toBe('this song');
    expect(tagBefore('reedSeg')).toBe('this song');
    expect(tagBefore('droneSel')).toBe('this song');
    expect(tagAfter('droneVol')).toBe('all songs');
    expect(tagBefore('countIn')).toBe('all songs');
    expect(tagBefore('guideLoopSel')).toBe('all songs');
    expect(tagBefore('rampChk')).toBe('all songs');
    expect(tagBefore('beatSel')).toBe('this song');
    expect(tagBefore('speedSel')).toBe('this song');
    expect(tagBefore('fillsChk')).toBe('this song');
  });

  it('with what they mean when pointed at, the same words as the code', () => {
    expect(page).toContain('title="' + SCOPE_ALL + '">all songs<');
    expect(page).toContain('title="' + SCOPE_NOW + '">for now<');
  });
});

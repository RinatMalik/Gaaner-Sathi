// Round fifty-eight (Rinat, 2026-11-10): the top panel for now, a song's own settings in Edit
// notation; one list of Sa from C2 to B5; the virtual keyboard folding; no speed-up setting.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { DEFAULT_PREFS, loadPrefs, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { saFromValue, saKeyName, saOptionsHTML, saValue, saWords } from '../../src/app/view';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { saMidi } from '../../src/audio/dsp/pitch';
import { cleanSa } from '../../src/core/practice/routine';
import { cleanTake } from '../../src/core/practice/take';
import { trimForNow } from '../../src/core/song/fornow';
import { normalize } from '../../src/core/song/model';
import { soundOf } from '../../src/core/song/sound';

const own = { sa: { saKey: 1, saOct: 4 }, tempo: 100, sound: soundOf(structuredClone(DEFAULT_SOUND)) };

describe('what the top panel has changed', () => {
  it('keeps only what differs from the song’s own', () => {
    expect(trimForNow({}, own)).toEqual({});
    expect(trimForNow({ tempo: 100 }, own)).toEqual({});
    expect(trimForNow({ tempo: 90 }, own)).toEqual({ tempo: 90 });
    expect(trimForNow({ sa: { saKey: 1, saOct: 4 } }, own)).toEqual({});
    expect(trimForNow({ sa: { saKey: 1, saOct: 3 } }, own)).toEqual({ sa: { saKey: 1, saOct: 3 } });
    expect(trimForNow({ sa: { saKey: 0, saOct: 4 } }, own)).toEqual({ sa: { saKey: 0, saOct: 4 } });
  });

  it('a control put back is no longer a change, whichever control', () => {
    expect(trimForNow({ sound: { beat: 'tabla', reeds: 3 } }, own)).toEqual({});
    expect(trimForNow({ sound: { beat: 'kit', reeds: 3 } }, own)).toEqual({ sound: { beat: 'kit' } });
    expect(trimForNow({ sound: { layers: { tabla: [], dholak: [], kit: [] } } }, own)).toEqual({});
    expect(trimForNow({ sound: { layers: { tabla: ['manjira'], dholak: [], kit: [] } } }, own)).toEqual({ sound: { layers: { tabla: ['manjira'], dholak: [], kit: [] } } });
  });

  it('keeps a taal picked, and takes off what was cleared', () => {
    expect(trimForNow({ taal: 'dadra' }, own)).toEqual({ taal: 'dadra' });
    expect(trimForNow({ taal: undefined, tempo: undefined, sa: undefined, sound: undefined }, own)).toEqual({});
  });

  it('changes nothing it is given', () => {
    const now = { tempo: 90, sound: { beat: 'kit' as const } };
    const before = structuredClone(now);
    trimForNow(now, own);
    expect(now).toEqual(before);
  });
});

describe('one list of Sa', () => {
  const values = Array.from(saOptionsHTML().matchAll(/<option value="(\d+)">([^<]*)<\/option>/g), (m) => [m[1]!, m[2]!] as const);

  it('runs from C2 to B5, a note at a time', () => {
    expect(values).toHaveLength(48);
    expect(values[0]).toEqual(['36', 'C2']);
    expect(values[1]).toEqual(['37', 'C♯2']);
    expect(values[2]).toEqual(['38', 'D2']);
    expect(values[12]).toEqual(['48', 'C3']);
    expect(values[47]).toEqual(['83', 'B5']);
    expect(values.map((v) => +v[0])).toEqual(Array.from({ length: 48 }, (_, i) => 36 + i));
  });

  it('reads back as the Sa it names, and is the MIDI note that Sa plays', () => {
    for (const [v, name] of values) {
      const s = saFromValue(v);
      expect(saKeyName(s.saKey, s.saOct)).toBe(name);
      expect(saValue(s)).toBe(v);
      expect(String(saMidi(s))).toBe(v);
    }
  });

  it('marks the Sa picked', () => {
    expect(saOptionsHTML({ saKey: 1, saOct: 2 })).toContain('<option value="37" selected>C♯2</option>');
    expect(saOptionsHTML({ saKey: 1, saOct: 2 }).match(/ selected/g)).toHaveLength(1);
  });

  it('octave 2 is kept wherever a Sa is, and what was never allowed still is not', () => {
    expect(normalize({ id: 's', saOct: 2 }).saOct).toBe(2);
    expect(normalize({ id: 's', saOct: 1 }).saOct).toBe(4);
    expect(normalize({ id: 's', saOct: 6 }).saOct).toBe(4);
    expect(cleanSa({ saKey: 0, saOct: 2 })).toEqual({ saKey: 0, saOct: 2 });
    expect(cleanSa({ saKey: 0, saOct: 6 })).toBeNull();
    expect(cleanTake({ id: 't', song: 's', at: 1, secs: 9, rate: 24000, sa: { saKey: 3, saOct: 2 } })!.sa).toEqual({ saKey: 3, saOct: 2 });
  });

  it('says C2 in words as it says the others', () => {
    expect(saWords({ saKey: 0, saOct: 2 })).toBe('C2 (White 1), lowest octave');
    expect(saWords({ saKey: 1, saOct: 3 })).toBe('C♯3 (Black 1), low octave');
  });

  it('is one picker at the top, one in Edit notation', () => {
    expect(page).toContain('id="saPick"');
    expect(page).toContain('id="edSa"');
    expect(page).not.toContain('id="saKey"');
    expect(page).not.toContain('id="saOct"');
  });
});

describe('the top panel and Edit notation', () => {
  const deck = page.slice(page.indexOf('class="deck'), page.indexOf('id="fileBar"'));
  const edit = page.slice(page.indexOf('id="edSet"'), page.indexOf('id="exNote"'));

  it('has no tags', () => {
    expect(page).not.toMatch(/class="[^"]*\bscope\b/);
    expect(page).not.toContain('data-scope');
    expect(page).not.toContain('>all songs<');
    expect(page).not.toContain('>for now<');
    expect(page).not.toContain('>this song<');
  });

  it('has Revert, off until something is changed, and says where a song’s own are changed', () => {
    expect(deck).toMatch(/<button[^>]*id="revertBtn"[^>]* disabled>Revert to this song’s settings<\/button>/);
    expect(deck).toContain('To change this <span id="nowWhat">song</span>’s own settings, go to <button type="button" class="dlink" id="nowEdit">Edit notation</button>.');
  });

  it('Edit notation has every setting of how a song plays', () => {
    for (const id of ['taalSel', 'edSa', 'edTempo', 'edReeds', 'edDrone', 'edBeat', 'edSpeed', 'edLayers', 'edFills', 'soundForget']) expect(edit).toContain('id="' + id + '"');
    expect(deck).not.toContain('id="soundForget"');
  });

  it('the two have the same choices', () => {
    const options = (id: string) => /<select id="[^"]*"[^>]*>(.*?)<\/select>/.exec(page.slice(page.indexOf('<select id="' + id + '"')))![1];
    expect(options('edDrone')).toBe(options('droneSel'));
    expect(options('edBeat')).toBe(options('beatSel'));
    expect(options('edSpeed')).toBe(options('speedSel'));
  });
});

describe('the virtual keyboard', () => {
  it('folds under its own heading, and has no tick box any more', () => {
    expect(page).not.toContain('keysChk');
    expect(page).not.toContain('Show virtual keyboard');
    expect(page).toMatch(/<button id="keysBtn" class="soundbar" type="button" aria-expanded="false" aria-controls="keysBody">/);
    expect(page).toContain('>Virtual keyboard<');
    expect(page).toMatch(/id="keysBody" hidden/);
  });
});

describe('no speed-up setting', () => {
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

  it('is gone from the page and the settings', () => {
    expect(page).not.toContain('rampChk');
    expect(page).not.toContain('Speed up each round');
    expect(DEFAULT_SOUND).not.toHaveProperty('ramp');
    expect(DEFAULT_PREFS).not.toHaveProperty('rampMax');
  });

  it('an old device’s settings and takes are read without it', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ ramp: true, rampStep: 10, rampMax: 200, tablaVol: 0.4 }));
    const p = loadPrefs(S);
    expect(p).not.toHaveProperty('ramp');
    expect(p.tablaVol).toBe(0.4);
    expect(cleanTake({ id: 't', song: 's', at: 1, secs: 9, rate: 24000, ramp: true, rampStep: 10, rampMax: 200 })).not.toHaveProperty('ramp');
  });
});

// Each song's own sound (src/core/song/sound.ts): its Melody and Rhythm settings, kept in
// storage and song files as an optional field, read back carefully, laid over the device's.
import { describe, expect, it } from 'vitest';
import { bodyOf, DEFAULT_PREFS, SongStore, type KeyValueStore } from '../../src/app/store';
import { soundSummary } from '../../src/app/view';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { songFileText, songForFile, songsFromFile } from '../../src/core/song/file';
import { normalize } from '../../src/core/song/model';
import { cleanSound, SONG_SOUND_KEYS, SOUND_CHOICES, soundOf, type SongSound } from '../../src/core/song/sound';

const OWN: SongSound = {
  guide: 'soft', reeds: 2, droneType: 'harmonium', droneVol: 0.4, tanTune: 'M',
  beat: 'dholak', tablaVol: 0.55, speed: 'double', fills: false, layers: { tabla: [], dholak: ['manjira', 'tambourine'], kit: [] },
};

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

describe('a song’s own sound', () => {
  it('keeps every Melody and Rhythm setting the controls can make', () => {
    expect(cleanSound(OWN)).toEqual(OWN);
    for (const [k, values] of Object.entries(SOUND_CHOICES)) {
      for (const v of values) expect(cleanSound({ [k]: v }), k + ' ' + v).toEqual({ [k]: v });
    }
    expect(SONG_SOUND_KEYS.slice().sort()).toEqual(Object.keys(OWN).sort());
  });

  it('leaves out what it cannot read, so the device’s setting shows through', () => {
    expect(cleanSound({ guide: 'loud', reeds: 4, beat: 'Tabla', speed: 1, fills: 'yes', tanTune: 'S', droneType: 'sitar', droneVol: 'half' })).toBeUndefined();
    expect(cleanSound({ guide: 'loud', beat: 'kit' })).toEqual({ beat: 'kit' });
    expect(cleanSound({ droneVol: 3, tablaVol: -1 })).toEqual({ droneVol: 1, tablaVol: 0 });
    expect(cleanSound({ droneVol: NaN, tablaVol: Infinity })).toBeUndefined();
    for (const junk of [null, undefined, 'tabla', 5, [], [OWN], true]) expect(cleanSound(junk)).toBeUndefined();
    // The prototype's practice settings are not part of a song's sound.
    expect(cleanSound({ countIn: false, ramp: true, guideLoop: 'alt' })).toBeUndefined();
  });

  it('keeps only known layers that fit each style, each once', () => {
    expect(cleanSound({ layers: { tabla: ['manjira', 'manjira', 'claps', 'nonsense', 7], kit: ['claps', 'ride'], dholak: 'shaker', extra: ['x'] } })).toEqual({
      layers: { tabla: ['manjira'], dholak: [], kit: ['claps', 'ride'] },
    });
    expect(cleanSound({ layers: [] })).toBeUndefined();
    expect(cleanSound({ layers: { tabla: ['constructor', '__proto__', 'toString'] } })).toEqual({ layers: { tabla: [], dholak: [], kit: [] } });
  });

  it('takes a copy of the Melody and Rhythm settings out of all of them', () => {
    const all = { ...structuredClone(DEFAULT_SOUND), ...structuredClone(OWN), countIn: false, ramp: true };
    const s = soundOf(all);
    expect(s).toEqual(OWN);
    expect(Object.keys(s).sort()).toEqual([...SONG_SOUND_KEYS].sort());
    s.layers.dholak.push('kartal');
    expect(all.layers.dholak).toEqual(['manjira', 'tambourine']);
  });

  it('lies over the device’s settings, field by field', () => {
    const shown = { ...DEFAULT_PREFS, ...cleanSound({ beat: 'kit', speed: 'half', droneVol: 0.5 }) };
    expect(soundSummary(shown)).toBe('Drums, half speed · Guide full · Tanpura');
  });
});

describe('a song with its own sound', () => {
  const song = normalize({ id: 's1', title: 'গান', taal: 'jhampak', text: 'সা রা গা', updatedAt: 9, sound: OWN });

  it('keeps it through normalize; songs without one stay as they were', () => {
    expect(song.sound).toEqual(OWN);
    expect(normalize({ id: 'x', title: 'x' })).not.toHaveProperty('sound');
    expect(normalize({ id: 'x', title: 'x', sound: { beat: 'bongo' } })).not.toHaveProperty('sound');
    expect(normalize({ id: 'x', title: 'x', sound: { beat: 'click', extra: 1 } }).sound).toEqual({ beat: 'click' });
  });

  it('is stored with it, and read back the same', () => {
    expect(bodyOf(song).sound).toEqual(OWN);
    expect(bodyOf(normalize({ id: 'x', title: 'x' }))).not.toHaveProperty('sound');
    const S = new Memory();
    const store = new SongStore(S);
    expect(store.save([song])).toBe('ok');
    expect(store.load().get('s1')).toEqual(song);
  });

  it('travels in song files (still version 1) and comes back on import', () => {
    expect(songForFile(song).sound).toEqual(OWN);
    expect(songForFile(normalize({ id: 'x', title: 'x' }))).not.toHaveProperty('sound');
    const text = songFileText([song], '2026-10-10');
    expect(JSON.parse(text).version).toBe(1);
    const [back] = songsFromFile(text, 'backup.json');
    expect(normalize({ ...back!, id: 'new' }).sound).toEqual(OWN);
  });
});

// A song's own sound (src/core/song/sound.ts): its rhythm's speed, kept in storage and song files
// as an optional field, read back carefully, laid over the device's. Everything else about the
// sound is the device's, the same for every song (Rinat, 2026-11-10).
import { describe, expect, it } from 'vitest';
import { bodyOf, DEFAULT_PREFS, SongStore, type KeyValueStore } from '../../src/app/store';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { songFileText, songForFile, songsFromFile } from '../../src/core/song/file';
import { normalize } from '../../src/core/song/model';
import { cleanSound, SONG_SOUND_KEYS, soundOf, SPEED_CHOICES, type SongSound } from '../../src/core/song/sound';

const OWN: SongSound = { speed: 'double' };
/** What a song saved before 2026-11-10 holds. */
const OLD = { reeds: 2, droneType: 'harmonium', droneVol: 0.4, tanTune: 'M', beat: 'dholak', speed: 'double', fills: false, layers: { tabla: [], dholak: ['manjira'], kit: [] } };

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
  it('is the rhythm’s speed, each one the control can make', () => {
    expect(SONG_SOUND_KEYS).toEqual(['speed']);
    for (const speed of SPEED_CHOICES) expect(cleanSound({ speed }), speed).toEqual({ speed });
    expect(cleanSound(OWN)).toEqual(OWN);
  });

  it('ignores the reeds, drone, instrument, side instruments and fills an older song saved', () => {
    expect(cleanSound(OLD)).toEqual(OWN);
    expect(cleanSound({ ...OLD, speed: undefined })).toBeUndefined();
    expect(normalize({ id: 'old', title: 'old', sound: OLD }).sound).toEqual(OWN);
  });

  it('leaves out what it cannot read, so the device’s setting shows through', () => {
    expect(cleanSound({ speed: 1 })).toBeUndefined();
    expect(cleanSound({ speed: 'Half' })).toBeUndefined();
    for (const junk of [null, undefined, 'half', 5, [], [OWN], true]) expect(cleanSound(junk)).toBeUndefined();
    expect(cleanSound({ guide: 'off', countIn: false, guideLoop: 'alt', tablaVol: 0.2 })).toBeUndefined();
  });

  it('takes the song’s own out of all the settings', () => {
    const s = soundOf({ ...structuredClone(DEFAULT_SOUND), speed: 'half' });
    expect(s).toEqual({ speed: 'half' });
  });

  it('lies over the device’s settings, and only the speed does', () => {
    const shown = { ...DEFAULT_PREFS, ...cleanSound({ beat: 'kit', speed: 'half', droneVol: 0.5, reeds: 1 }) };
    expect([shown.speed, shown.beat, shown.droneVol, shown.reeds]).toEqual(['half', DEFAULT_PREFS.beat, DEFAULT_PREFS.droneVol, DEFAULT_PREFS.reeds]);
  });
});

describe('a song with its own speed', () => {
  const song = normalize({ id: 's1', title: 'গান', taal: 'jhampak', text: 'সা রা গা', updatedAt: 9, sound: OWN });

  it('keeps it through normalize; songs without one stay as they were', () => {
    expect(song.sound).toEqual(OWN);
    expect(normalize({ id: 'x', title: 'x' })).not.toHaveProperty('sound');
    expect(normalize({ id: 'x', title: 'x', sound: { speed: 'fast' } })).not.toHaveProperty('sound');
    expect(normalize({ id: 'x', title: 'x', sound: { beat: 'click' } })).not.toHaveProperty('sound');
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

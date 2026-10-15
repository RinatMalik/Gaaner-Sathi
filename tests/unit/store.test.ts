// What the app keeps in the browser: preferences, and songs read from the prototype's key
// with this app's changes kept under its own (src/app/store.ts). Also the settings bars'
// summary lines, which are new.
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs, SongStore, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { practiceSummary, songSoundSummary } from '../../src/app/view';
import { normalize, type Song } from '../../src/core/song/model';

/** localStorage in memory; it can be made full or blocked. */
class Memory implements KeyValueStore {
  m = new Map<string, string>();
  mode: 'ok' | 'full' | 'blocked' = 'ok';
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.mode !== 'ok') {
      const e = new Error(this.mode);
      e.name = this.mode === 'full' ? 'QuotaExceededError' : 'SecurityError';
      throw e;
    }
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  json(k: string) {
    return JSON.parse(this.m.get(k) ?? 'null');
  }
}
const song = (id: string, title: string, updatedAt: number, text = 'সা রা গা'): Song => normalize({ id, title, updatedAt, text, taal: 'keherwa' });
const body = (s: Song) => ({ title: s.title, taal: s.taal, tempo: s.tempo, saKey: s.saKey, saOct: s.saOct, startOn: s.startOn, text: s.text, updatedAt: s.updatedAt });

describe('preferences', () => {
  it('start from the prototype’s defaults, on exercise 3', () => {
    expect(loadPrefs(new Memory())).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS.lastSong).toBe('ex-alankar-bn');
  });

  it('come from the prototype the first time, then from this app’s own key, which is all it writes', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.legacyPrefs, JSON.stringify({ beat: 'dholak', droneVol: 0.4, script: 'lat' }));
    const p = loadPrefs(S);
    expect([p.beat, p.droneVol, p.script]).toEqual(['dholak', 0.4, 'lat']);
    p.beat = 'kit';
    p.soundOpen = false;
    expect(savePrefs(S, p)).toBe('ok');
    expect(S.json(STORE_KEYS.legacyPrefs)).toEqual({ beat: 'dholak', droneVol: 0.4, script: 'lat' });
    const q = loadPrefs(S);
    expect([q.beat, q.droneVol, q.soundOpen]).toEqual(['kit', 0.4, false]);
  });

  it('fall back to the defaults for values the controls cannot make', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ beat: 'banjo', tablaVol: 7, reeds: '3', speed: null, layers: 'x', rampMax: -5, soundOpen: 'yes', tab: 'other' }));
    const p = loadPrefs(S);
    expect([p.beat, p.tablaVol, p.reeds, p.speed, p.rampMax, p.soundOpen, p.tab]).toEqual(['tabla', 1, 3, 'normal', 30, undefined, 'practice']);
    expect(p.layers).toEqual({ tabla: [], dholak: [], kit: [] });
    S.setItem(STORE_KEYS.prefs, '{ not json');
    expect(loadPrefs(S)).toEqual(DEFAULT_PREFS);
  });

  it('keep day or night colours when chosen, and follow the device otherwise', () => {
    const S = new Memory();
    expect(loadPrefs(S)).not.toHaveProperty('theme');
    for (const t of ['light', 'dark'] as const) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ theme: t }));
      expect(loadPrefs(S).theme).toBe(t);
    }
    for (const t of ['auto', 'night', 1, null]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ theme: t }));
      expect(loadPrefs(S)).not.toHaveProperty('theme');
    }
  });

  it('keep the Music library’s folded sections and the song’s sound unfolded, when set', () => {
    const S = new Memory();
    expect(loadPrefs(S)).not.toHaveProperty('libFold');
    expect(loadPrefs(S)).not.toHaveProperty('songSoundOpen');
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ libFold: { ex: true, mine: 'yes', other: true }, songSoundOpen: true }));
    expect(loadPrefs(S).libFold).toEqual({ ex: true });
    expect(loadPrefs(S).songSoundOpen).toBe(true);
    for (const f of [{ mine: false }, [], 'ex', null]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ libFold: f, songSoundOpen: 1 }));
      expect(loadPrefs(S)).not.toHaveProperty('libFold');
      expect(loadPrefs(S)).not.toHaveProperty('songSoundOpen');
    }
    // The Music library is still stored as `songs`.
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ tab: 'songs' }));
    expect(loadPrefs(S).tab).toBe('songs');
  });

  it('keep the rewaz routines unfolded, by id; the old "routine last chosen" is dropped', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ rewazOpen: ['routine-a', 7, '', 'routine-starter'], rewazId: 'routine-a' }));
    const p = loadPrefs(S);
    expect(p.rewazOpen).toEqual(['routine-a', 'routine-starter']);
    expect(p).not.toHaveProperty('rewazId');
    for (const v of [[], 'routine-a', null, [3]]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ rewazOpen: v }));
      expect(loadPrefs(S)).not.toHaveProperty('rewazOpen');
    }
  });

  it('keep the Practice lines’ settings when they differ from 7 lines, the 3rd sung, at the normal size', () => {
    const S = new Memory();
    for (const k of ['plRows', 'plAt', 'plSize']) expect(loadPrefs(S)).not.toHaveProperty(k);
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ plRows: 9, plAt: 1, plSize: 'big' }));
    expect(loadPrefs(S)).toMatchObject({ plRows: 9, plAt: 1, plSize: 'big' });
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ plRows: 12, plAt: 5, plSize: 'small' }));
    expect(loadPrefs(S)).toMatchObject({ plRows: 12, plAt: 5, plSize: 'small' });
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ plRows: 5, plAt: 2 }));
    expect(loadPrefs(S)).toMatchObject({ plRows: 5, plAt: 2 });
    for (const [r, a, z] of [[7, 3, 'normal'], [8, 6, 'huge'], ['9', '1', 1], [null, null, null]]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ plRows: r, plAt: a, plSize: z }));
      for (const k of ['plRows', 'plAt', 'plSize']) expect(loadPrefs(S)).not.toHaveProperty(k);
    }
  });

  it('keep one line to a row only when chosen (two short lines to a row by default)', () => {
    const S = new Memory();
    expect(loadPrefs(S)).not.toHaveProperty('plOne');
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ plOne: true }));
    expect(loadPrefs(S)).toMatchObject({ plOne: true });
    for (const v of [false, 'true', 1, null]) {
      S.setItem(STORE_KEYS.prefs, JSON.stringify({ plOne: v }));
      expect(loadPrefs(S)).not.toHaveProperty('plOne');
    }
  });
});

describe('your own exercises in storage', () => {
  it('keep their mark through a save and a load', () => {
    const S = new Memory();
    const store = new SongStore(S);
    const ex = normalize({ id: 'song-x', title: 'My sargam', text: 'সা রা গা', updatedAt: 3, exercise: true });
    expect(store.save([ex, song('song-y', 'plain', 4)])).toBe('ok');
    const back = store.load();
    expect(back.get('song-x')!.exercise).toBe(true);
    expect(back.get('song-y')).not.toHaveProperty('exercise');
  });
});

describe('a song’s notes in storage', () => {
  it('are saved with the song only when it has some', () => {
    const S = new Memory();
    const store = new SongStore(S);
    const a = normalize({ id: 'a', title: 'A', text: 'S', notes: 'From my teacher' });
    const b = normalize({ id: 'b', title: 'B', text: 'S' });
    expect(store.save([a, b])).toBe('ok');
    const raw = S.json(STORE_KEYS.songs);
    expect(raw.a.notes).toBe('From my teacher');
    expect(raw.b).not.toHaveProperty('notes');
    expect(store.load().get('a')).toEqual(a);
  });
});

describe('songs', () => {
  it('show the prototype’s songs, and keep this app’s changes under its own key', () => {
    const S = new Memory();
    const a = song('song-a', 'A', 100);
    const b = song('song-b', 'B', 100);
    S.setItem(STORE_KEYS.legacySongs, JSON.stringify({ [a.id]: body(a), [b.id]: body(b) }));
    const legacyBefore = S.m.get(STORE_KEYS.legacySongs);
    const store = new SongStore(S);
    expect(store.mode).toBe('local');
    expect([...store.load().values()].map((s) => s.title)).toEqual(['A', 'B']);
    const a2 = { ...a, title: 'A edited', updatedAt: 200 };
    const c = song('song-c', 'C', 300);
    expect(store.save([a2, c])).toBe('ok');
    expect(S.m.get(STORE_KEYS.legacySongs)).toBe(legacyBefore);
    expect(Object.keys(S.json(STORE_KEYS.songs))).toEqual(['song-a', 'song-c']);
    const m = store.load();
    expect([...m.values()].map((s) => s.title)).toEqual(['A edited', 'B', 'C']);
    expect(m.get('song-a')).toEqual(a2);
  });

  it('take the newer edit when the prototype changes a song this app also changed', () => {
    const S = new Memory();
    const store = new SongStore(S);
    store.save([song('song-a', 'ours', 200)]);
    S.setItem(STORE_KEYS.legacySongs, JSON.stringify({ 'song-a': body(song('song-a', 'prototype’s, later', 300)) }));
    expect(store.load().get('song-a')!.title).toBe('prototype’s, later');
    store.save([song('song-a', 'ours again', 400)]);
    expect(store.load().get('song-a')!.title).toBe('ours again');
  });

  it('hide a deleted prototype song without touching the prototype’s list; remove one of their own', () => {
    const S = new Memory();
    S.setItem(STORE_KEYS.legacySongs, JSON.stringify({ 'song-a': body(song('song-a', 'A', 1)), 'song-b': body(song('song-b', 'B', 1)) }));
    const legacyBefore = S.m.get(STORE_KEYS.legacySongs);
    const store = new SongStore(S);
    store.save([song('song-a', 'A edited', 5), song('song-c', 'C', 5)]);
    expect(store.remove('song-a')).toBe('ok');
    expect(store.remove('song-c')).toBe('ok');
    expect([...store.load().keys()]).toEqual(['song-b']);
    expect(S.json(STORE_KEYS.hidden)).toEqual(['song-a']);
    expect(S.json(STORE_KEYS.songs)).toEqual({});
    expect(S.m.get(STORE_KEYS.legacySongs)).toBe(legacyBefore);
  });

  it('save only the songs given, so a song another tab saved meanwhile survives', () => {
    const S = new Memory();
    const here = new SongStore(S);
    const there = new SongStore(S);
    here.save([song('song-1', 'one', 1)]);
    there.save([song('song-2', 'two', 2)]);
    here.save([song('song-1', 'one, edited', 3)]);
    expect([...here.load().values()].map((s) => s.title)).toEqual(['one, edited', 'two']);
  });

  it('keep any id as a plain key; a damaged entry becomes an untitled song, as in the prototype', () => {
    const S = new Memory();
    const store = new SongStore(S);
    store.save([song('__proto__', 'odd id', 1), song('constructor', 'odder', 1)]);
    expect([...store.load().keys()].sort()).toEqual(['__proto__', 'constructor']);
    S.setItem(STORE_KEYS.songs, JSON.stringify({ 'song-x': null, 'song-y': 'text', 'song-z': { title: 'Z', text: 'S', tempo: 999 } }));
    const m = store.load();
    expect(m.get('song-x')!.title).toBe('Untitled song');
    expect(m.get('song-z')!.tempo).toBe(240);
    S.setItem(STORE_KEYS.songs, '[1,2]');
    S.setItem(STORE_KEYS.legacySongs, 'not json');
    expect(store.load().size).toBe(0);
  });

  it('say when storage is full or blocked, and work from memory when there is none', () => {
    const S = new Memory();
    const store = new SongStore(S);
    S.mode = 'full';
    expect(store.save([song('song-1', 'one', 1)])).toBe('full');
    S.mode = 'blocked';
    expect(store.save([song('song-1', 'one', 1)])).toBe('blocked');
    expect(new SongStore(S).mode).toBe('memory');
    expect(new SongStore(null).mode).toBe('memory');
    expect(new SongStore(null).load().size).toBe(0);
    expect(new SongStore(null).save([song('song-1', 'one', 1)])).toBe('blocked');
  });

  it('notice changes from other tabs to the songs only', () => {
    expect([STORE_KEYS.songs, STORE_KEYS.legacySongs, STORE_KEYS.hidden, null].map(SongStore.isSongKey)).toEqual([true, true, true, true]);
    expect([STORE_KEYS.prefs, STORE_KEYS.legacyPrefs, 'other'].map(SongStore.isSongKey)).toEqual([false, false, false]);
  });
});

describe('the settings bars’ summaries', () => {
  it('Practice settings: the guide, then the count-in and tempo trainer only when they differ from the defaults', () => {
    expect(practiceSummary(DEFAULT_PREFS)).toBe('Guide full');
    expect(practiceSummary({ ...DEFAULT_PREFS, guide: 'soft', guideLoop: 'alt', countIn: false, ramp: true, rampStep: 6, rampMax: 140 }))
      .toBe('Guide soft, every other round when looping · No count-in · Speeds up by 6 to 140');
    expect(practiceSummary({ ...DEFAULT_PREFS, guideLoop: 'first' })).toBe('Guide full, first round only when looping');
    expect(practiceSummary({ ...DEFAULT_PREFS, guide: 'off', guideLoop: 'first' })).toBe('Guide off');
    // The lines, the keys and the octave rule, named only when changed.
    expect(practiceSummary(DEFAULT_PREFS, { plRows: 7, plAt: 3, plSize: 'normal', showKeys: false, pitchOctave: false })).toBe('Guide full');
    expect(practiceSummary(DEFAULT_PREFS, { plRows: 12, plAt: 4, plSize: 'big', showKeys: true, pitchOctave: true }))
      .toBe('Guide full · Keys shown · 12 lines, the 4th being sung · Bigger words · Octave must match');
    expect(practiceSummary(DEFAULT_PREFS, { plRows: 9 })).toBe('Guide full · 9 lines');
    expect(practiceSummary(DEFAULT_PREFS, { plAt: 1, plSize: 'small' })).toBe('Guide full · 7 lines, the 1st being sung · Smaller words');
    expect(practiceSummary(DEFAULT_PREFS, { plOne: true })).toBe('Guide full · One line to a row');
    // A song's sound is not in it.
    expect(practiceSummary({ ...DEFAULT_PREFS, beat: 'kit', droneVol: 0.5 })).toBe('Guide full');
  });

  it('a song’s sound: the harmonium, the drone, then the rhythm with its speed and added layers', () => {
    expect(songSoundSummary(DEFAULT_PREFS)).toBe('3 reeds · No drone · Tabla');
    expect(songSoundSummary({ ...DEFAULT_PREFS, reeds: 1, beat: 'off', droneVol: 0.5, tanTune: 'M' })).toBe('1 reed · Tanpura, 1st string Ma · No rhythm');
    expect(songSoundSummary({ ...DEFAULT_PREFS, beat: 'click', speed: 'half', droneType: 'harmonium', droneVol: 0.2, layers: { tabla: [], dholak: [], kit: ['claps'] } }))
      .toBe('3 reeds · Harmonium drone · Click, half speed');
    expect(songSoundSummary({ ...DEFAULT_PREFS, reeds: 2, beat: 'kit', speed: 'double', layers: { tabla: ['manjira'], dholak: [], kit: ['shaker', 'claps'] } }))
      .toBe('2 reeds · No drone · Drums, double speed, with shaker, claps');
    // The guide is not part of it.
    expect(songSoundSummary({ ...DEFAULT_PREFS, guide: 'off' })).toBe(songSoundSummary(DEFAULT_PREFS));
  });
});

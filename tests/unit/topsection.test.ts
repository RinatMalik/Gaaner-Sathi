// The top section (Rinat, 2026-10-22): the Lines to practise from one line to another, looped
// or not (src/audio/transport.ts → upTo); a taal picked to play the song in, until another song
// opens (src/core/notation/taalmap.ts → inOneTaal); the guide's volume and mute
// (src/audio/sound.ts); Back up or export → Everything, and its restore (src/app/backup.ts).
import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupParts, backupWords, readBackup, restoredPrefs, restorePlan, type Backup } from '../../src/app/backup';
import { DEFAULT_PREFS, loadPrefs, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { taalPickHTML } from '../../src/app/view';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND, guideLevel, guideSlider } from '../../src/audio/sound';
import { Transport, type BeatEntry } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { inOneTaal, placeIn, taalMap } from '../../src/core/notation/taalmap';
import type { LogEntry } from '../../src/core/practice/log';
import type { SessionDetail } from '../../src/core/practice/session';
import { songsFromFile } from '../../src/core/song/file';
import { normalize } from '../../src/core/song/model';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

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

describe('the Lines to practise, from one line to another', () => {
  const TEXT = 'সা রা গা মা\nপা ধা না র্সা\nর্সা না ধা পা\nমা গা রা সা';
  function lines(opts: { from: number; to: number; loop: boolean; rounds?: number; upTo?: boolean }): number[] {
    const P = parseSong(TEXT);
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
    const beats: BeatEntry[] = [];
    T.onBeat = (q) => beats.push(q);
    T.start({ parsed: P, taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 240, startOn: 1 }, sound: { ...structuredClone(DEFAULT_SOUND), countIn: false } }, opts);
    for (let i = 1; i * 0.025 <= 30 && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    return Array.from(new Set(beats.filter((q) => q.pass >= 0).map((q) => P.lineOfBeat[q.s]!)));
  }

  it('without Loop, plays them once and stops at the last: not on to the end of the song', () => {
    expect(lines({ from: 1, to: 2, loop: false, upTo: true })).toEqual([1, 2]);
    // Elsewhere (a line number, "play from here") a play without a loop still goes to the end.
    expect(lines({ from: 1, to: 2, loop: false })).toEqual([1, 2, 3]);
    expect(lines({ from: 1, to: 2, loop: true, rounds: 2, upTo: true })).toEqual([1, 2]);
  });
});

describe('a taal picked at the top', () => {
  it('plays the whole song in it, sections and all, with sam where the song’s own has it', () => {
    const text = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\nপা ধা না র্সা | না ধা পা মা';
    const P = parseSong(text);
    const own = taalMap(text, P, 'dadra', 1, undefined);
    expect(own.runs.map((r) => r.T.id)).toEqual(['dadra', 'keherwa']);
    const t = inOneTaal(own, taalInfo('teentaal'));
    expect(t.runs.map((r) => r.T.id)).toEqual(['teentaal']);
    expect(t.changes).toBe(false);
    // The song's first beat is on sam, as in its own taal; the antara's first beat follows on.
    expect(placeIn(t.beat(0), 0).p).toBe(0);
    expect(placeIn(t.beat(6), 6).p).toBe(6);
  });

  it('keeps the beats before sam: from the 13th of Teentaal, the 5th of Keherwa; from Dadra’s 4th, Keherwa’s 6th', () => {
    const P = parseSong('সা রা গা মা | পা ধা না র্সা');
    const at = (taal: string, startOn: number, to: string) => inOneTaal(taalMap('সা রা গা মা', P, taal, startOn), taalInfo(to)).runs[0]!.off + 1;
    expect(at('teentaal', 13, 'keherwa')).toBe(5);
    expect(at('teentaal', 1, 'keherwa')).toBe(1);
    expect(at('dadra', 4, 'keherwa')).toBe(6);
    expect(at('keherwa', 5, 'dadra')).toBe(3);
    // More beats before sam than the new taal has (15 before Teentaal's sam): the same place in its
    // cycle, 3 before a sam of Dadra.
    expect(at('teentaal', 2, 'dadra')).toBe(4);
  });

  it('is offered after the song’s own, which comes first and names its taals', () => {
    const html = taalPickHTML('Dadra, Keherwa');
    expect(html.startsWith('<option value="">Dadra, Keherwa (song’s own)</option>')).toBe(true);
    expect(html).toContain('<option value="teentaal">');
  });
});

describe('the guide’s volume', () => {
  it('a slider’s level of Full, or muted; as Full and Soft were until one was set', () => {
    expect(guideLevel({ ...DEFAULT_SOUND })).toBeCloseTo(0.9);
    expect(guideLevel({ ...DEFAULT_SOUND, guide: 'soft' })).toBeCloseTo(0.3);
    expect(guideLevel({ ...DEFAULT_SOUND, guide: 'full', guideVol: 0.5 })).toBeCloseTo(0.45);
    expect(guideLevel({ ...DEFAULT_SOUND, guide: 'off', guideVol: 0.5 })).toBe(0);
    expect(guideSlider({ ...DEFAULT_SOUND, guide: 'soft' })).toBeCloseTo(1 / 3);
    expect(guideSlider({ ...DEFAULT_SOUND })).toBe(1);
    expect(guideSlider({ ...DEFAULT_SOUND, guide: 'off', guideVol: 0.6 })).toBe(0.6);
  });

  it('is kept on the device, between 0 and 1', () => {
    const S = new Memory();
    expect(loadPrefs(S)).not.toHaveProperty('guideVol');
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ guideVol: 0.4 }));
    expect(loadPrefs(S).guideVol).toBe(0.4);
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ guideVol: 3 }));
    expect(loadPrefs(S).guideVol).toBe(1);
    S.setItem(STORE_KEYS.prefs, JSON.stringify({ guideVol: 'loud' }));
    expect(loadPrefs(S)).not.toHaveProperty('guideVol');
  });
});

const song = (id: string, title: string) => normalize({ id, title, taal: 'keherwa', tempo: 100, text: 'সা রা গা মা', updatedAt: 5 });
const entry = (at: number, s: string): LogEntry => ({ at, secs: 60, song: s, title: s, from: 0, to: 0, loop: false, rounds: 1, tempo: 100, top: 100 });
const detail = (at: number, s: string): SessionDetail => ({
  at, song: s,
  played: { title: s, taal: 'keherwa', tempo: 100, text: 'সা রা গা মা', saHz: 138.59, sa: 'C♯3' },
  settings: { guide: 'full', guideLoop: 'all', countIn: true, ramp: false, rampStep: 4, rampMax: 160 },
  pitch: { lag: 0.1, measured: true, anyOctave: true, octave: 0, notes: [], lines: [[0, 0, 72, 1]], readings: [0.0123456, 138.5912, 0.0234567, 0], beats: [[0, 0, 0, 0.6]] },
});
const BACKUP: Backup = {
  at: Date.UTC(2026, 9, 22, 10),
  songs: [{ ...song('song-a', 'Amar sonar bangla'), sound: { reeds: 2 }, tags: ['Tagore'] }, { ...song('song-b', 'Ekla cholo'), exercise: true }],
  routines: [{ id: 'rw-1', name: 'Morning', items: [{ song: 'song-a', rounds: 2 }], updatedAt: 9, gap: 6 }],
  log: [entry(1000, 'song-a'), entry(2000, 'song-b')],
  sessions: [detail(1000, 'song-a')],
  prefs: { ...DEFAULT_PREFS, plRows: 9, theme: 'dark', deviceLag: 0.12, midi: { route: 'kb', sound: 'keep' }, lastSong: 'song-a', tab: 'edit' },
};
const fileOf = (b: Backup) => backupParts(b).join('');

describe('Back up or export → Everything', () => {
  it('reads back what it wrote: songs with their ids, routines, the log, sessions and the singer’s settings', () => {
    const b = readBackup(fileOf(BACKUP))!;
    expect(b.at).toBe(BACKUP.at);
    expect(b.songs.map((s) => [s.id, s.title, s.exercise ?? false, s.example])).toEqual([['song-a', 'Amar sonar bangla', false, false], ['song-b', 'Ekla cholo', true, false]]);
    expect(b.songs[0]!.sound).toEqual({ reeds: 2 });
    expect(b.songs[0]!.tags).toEqual(['Tagore']);
    expect(b.routines).toEqual(BACKUP.routines);
    expect(b.log).toEqual(BACKUP.log);
    // Readings to the millisecond and the hundredth of a hertz.
    expect(b.sessions[0]!.pitch!.readings).toEqual([0.012, 138.59, 0.023, 0]);
    expect(b.prefs.plRows).toBe(9);
    // This device's own settings are not in it.
    for (const k of ['deviceLag', 'midi', 'lastSong', 'tab']) expect(b.prefs).not.toHaveProperty(k);
  });

  it('is told from a file of songs, which an import of songs still reads from it', () => {
    expect(readBackup('{"format":"gaaner-sathi","version":1,"songs":[]}')).toBeNull();
    expect(readBackup('not json')).toBeNull();
    expect(readBackup('[]')).toBeNull();
    const txt = fileOf(BACKUP);
    expect(JSON.parse(txt).format).toBe(BACKUP_FORMAT);
    expect(songsFromFile(txt).map((s) => s.title)).toEqual(['Amar sonar bangla', 'Ekla cholo']);
  });

  it('skips what it cannot read', () => {
    const o = JSON.parse(fileOf(BACKUP));
    o.songs.push({ title: 'no text' }, 7);
    o.routines.push({ name: 'no id', items: [] });
    o.log.push({ at: 'yesterday' });
    o.sessions.push({ song: 'x' });
    const b = readBackup(JSON.stringify(o))!;
    expect([b.songs.length, b.routines.length, b.log.length, b.sessions.length]).toEqual([2, 1, 2, 1]);
  });

  it('restores what is not here, never changing what is: by id, or a session’s time; titles kept apart', () => {
    const plan = restorePlan(readBackup(fileOf(BACKUP))!, {
      songIds: new Set(['song-a']),
      titles: ['Amar sonar bangla, edited', 'Ekla cholo'],
      routineIds: new Set(),
      logAts: new Set([1000]),
      sessionAts: new Set([1000]),
    });
    expect(plan.songs.map((s) => [s.id, s.title])).toEqual([['song-b', 'Ekla cholo (2)']]);
    expect(plan.routines.map((r) => r.id)).toEqual(['rw-1']);
    expect(plan.log.map((e) => e.at)).toEqual([2000]);
    expect(plan.sessions).toEqual([]);
    expect(backupWords(plan)).toBe('1 song, 1 routine and 1 practice session');
    expect(backupWords(BACKUP)).toBe('2 songs, 1 routine and 2 practice sessions');
  });

  it('with its settings: the backup’s over these, this device’s delay and keyboard kept', () => {
    const here = { ...DEFAULT_PREFS, plRows: 5, deviceLag: 0.08, midi: { route: 'app', sound: 'organ' }, tab: 'practice' } as Record<string, unknown>;
    const p = restoredPrefs(here, { ...BACKUP.prefs });
    expect(p.plRows).toBe(9);
    expect(p.theme).toBe('dark');
    expect(p.deviceLag).toBe(0.08);
    expect(p.midi).toEqual({ route: 'app', sound: 'organ' });
    expect(p.tab).toBe('practice');
    // A device setting this device never had is not taken from the backup either.
    expect(restoredPrefs({ ...DEFAULT_PREFS }, { deviceLag: 0.3, plRows: 12 })).not.toHaveProperty('deviceLag');
  });
});

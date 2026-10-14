// The port against the prototype's built-in exercises, song normalising, file reading and
// writing, and the tanpura string (sample for sample, with the same random numbers).
import { describe, expect, it, vi } from 'vitest';
import { loadPrefs } from '../../src/app/store';
import { ksPluck } from '../../src/audio/dsp/ksPluck';
import { REFERENCE_EXERCISES as EXERCISES } from '../reference-exercises';
import { fileName, songFileText, songForFile, songsFromFile, stripExamplePrefix } from '../../src/core/song/file';
import { normalize } from '../../src/core/song/model';
import { canon, seeded } from '../helpers';
import { protoExamples, protoFile, protoKsPluck, protoNormalize, protoPrefs, protoStripExamplePrefix } from './prototype';

/** Settings only this app has, always present (the prototype never saved them). */
const APP_ONLY_PREFS = ['libSort'];

describe('data matches the prototype', () => {
  it('the 13 built-in exercises', () => {
    expect(canon(EXERCISES)).toBe(canon(protoExamples));
  });

  it('normalize on 600 random songs', () => {
    // Taal values here avoid the prototype's one known flaw (see tests/unit/song.test.ts).
    const VALUES = [undefined, null, '', '  ', 'x', '0', '7', '120', '4', '5', '3', '-3', '1e3', 0, 1, 2.5, 3, 4, 5, 6, 11, 12, 13, -1, 30, 29,
      240, 241, 100.4, NaN, Infinity, -Infinity, true, false, [], [100], [3], {}, 'dadra', 'rupak', 'teentaal', 'Dadra', 'S R G', ' My song '];
    const rand = seeded(5);
    const pick = () => VALUES[Math.floor(rand() * VALUES.length)];
    for (let i = 0; i < 600; i++) {
      const s = { id: 'id-' + i, example: pick(), title: pick(), taal: pick(), tempo: pick(), saKey: pick(), saOct: pick(), startOn: pick(), text: pick(), updatedAt: pick() };
      expect(canon(normalize(s))).toBe(canon(protoNormalize(s)));
    }
  });

  it('songsFromFile on envelopes, arrays, single songs, plain text and junk', () => {
    const long = 'স'.repeat(250_000);
    const files: [string, string | undefined][] = [
      [JSON.stringify({ format: 'gaaner-sathi', version: 1, exported: '2026-10-09', songs: [{ title: 'A', taal: 'rupak', tempo: 90, text: 'সা রা' }, { title: '', text: 'S' }] }), 'backup.json'],
      [JSON.stringify({ format: 'swaralipi-player', version: 1, songs: [{ title: 'Old', text: 'গা' }] }), 'old.json'],
      [JSON.stringify([{ title: 'x', text: 'S' }, { text: 5 }, null, 3, { title: '   ', text: 'R' }]), 'list.json'],
      [JSON.stringify({ title: 'One', text: 'P D N' }), 'one.json'],
      [JSON.stringify({ title: 'T'.repeat(300), text: long }), 'big.json'],
      [JSON.stringify({ songs: 'nope' }), 'x.json'],
      [JSON.stringify({ songs: [{ text: 'S', id: 'keep?', updatedAt: 9 }] }), 'ids.json'],
      ['{}', 'empty.json'], ['[]', 'arr.json'], ['null', 'null.txt'], ['42', 'n.txt'], ['"str"', 's.txt'], ['true', 't.txt'],
      ['{ broken json', 'broken.json'], ['সা রা গা\n> সা রে গা', 'my song.txt'], ['   \n\t ', 'blank.txt'], ['', 'empty.txt'],
      [long, 'long.txt'], ['S R G', undefined], ['S R G', ''], ['S', 'a.b.c.json'], ['S', '.hidden'], ['S', 'noext'],
    ];
    for (const [txt, name] of files) expect(canon(songsFromFile(txt, name))).toBe(canon(protoFile.songsFromFile(txt, name)));
  });

  it('fileName, songForFile, the export text and the exercise-title clean-up', () => {
    const rand = seeded(3);
    const chars = ['a', 'Z', ' ', '\t', '/', '\\', ':', '*', '?', '"', '<', '>', '|', '\u0000', '\u001f', '\n', 'স', 'া', '·', '.', '-'];
    for (let i = 0; i < 400; i++) {
      const name = Array.from({ length: Math.floor(rand() * 120) }, () => chars[Math.floor(rand() * chars.length)]).join('');
      expect(fileName(name)).toBe(protoFile.fileName(name));
    }
    const song = normalize({ id: 'x', title: 'Song', taal: 'ektal', tempo: 77, saKey: 2, saOct: 5, startOn: 3, text: 'S R G', updatedAt: 5 });
    expect(canon(songForFile(song))).toBe(canon(protoFile.songForFile(song)));
    expect(songFileText([song], '2026-10-10')).toBe(
      JSON.stringify({ format: 'gaaner-sathi', version: 1, exported: '2026-10-10', songs: [protoFile.songForFile(song)] }, null, 2),
    );
    for (const t of ['Example · A', 'Typing example · Sa Re Ga letters', 'উদাহরণ · গান', '১ · লম্বা স্বর', 'Example·B', 'Examples · C', 'My song']) {
      expect(stripExamplePrefix(t)).toBe(protoStripExamplePrefix(t));
    }
  });

  it("device preferences as the prototype saved them, old keys included", () => {
    // Every value the prototype's own controls can save, plus its two retired keys.
    const VALUES: Record<string, unknown[]> = {
      script: ['bn', 'lat'], guide: ['full', 'soft', 'off'], beat: ['tabla', 'dholak', 'kit', 'click', 'off'], tablaVol: [0, 0.35, 1],
      speed: ['half', 'normal', 'double'], fills: [true, false], reeds: [1, 2, 3], droneType: ['tanpura', 'harmonium'], droneVol: [0, 0.5, 1],
      tanTune: ['P', 'M', 'N'], countIn: [true, false], guideLoop: ['all', 'first', 'alt'], ramp: [true, false], rampStep: [2, 4, 6, 8, 10],
      rampMax: [30, 160, 240], lastSong: ['ex-alankar-bn', 'song-abc'], tab: ['practice', 'edit'], extra: [true, false], dropGuide: [true, false],
      layers: [{ tabla: ['manjira', 'shaker'], dholak: [], kit: ['claps'] }, { tabla: [], dholak: ['tambourine'], kit: [] }],
    };
    const rand = seeded(8);
    for (let i = 0; i < 400; i++) {
      const saved: Record<string, unknown> = {};
      for (const [k, vs] of Object.entries(VALUES)) if (rand() < 0.6) saved[k] = vs[Math.floor(rand() * vs.length)];
      const store = new Map([['swaralipi.prefs.v1', JSON.stringify(saved)]]);
      const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
      // The prototype's settings read the same; the app's own settings come on top.
      const mine = loadPrefs(ls) as unknown as Record<string, unknown>;
      const proto = protoPrefs(ls) as Record<string, unknown>;
      expect(canon(Object.fromEntries(Object.keys(proto).map((k) => [k, mine[k]])))).toBe(canon(proto));
      expect(Object.keys(mine).filter((k) => !(k in proto)).sort()).toEqual(APP_ONLY_PREFS);
    }
  });

  it('ksPluck, sample for sample, given the same random numbers', () => {
    for (const [f, sr, seed] of [[98, 48000, 1], [130.81, 44100, 2], [196, 48000, 3], [261.63, 44100, 4], [293.66, 48000, 5], [440, 48000, 6]] as const) {
      const spy = vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
      const before: Float32Array = protoKsPluck(f, sr, 1);
      spy.mockRestore();
      const after = ksPluck(f, sr, 1, seeded(seed));
      expect(after.length).toBe(before.length);
      expect(after.findIndex((v, i) => !Object.is(v, before[i]))).toBe(-1);
    }
  });
});

// Takes in one file (src/app/takefile.ts, src/app/zip.ts): written and read back, as a ZIP any
// computer opens; the review of 2026-11-14 found takes could leave only one at a time and were
// in no backup.
import { describe, expect, it } from 'vitest';
import { wavFile } from '../../src/audio/dsp/pcm';
import { readTakes, TAKES_LIST, TakesZip, takesRestoredWords, wavSamples } from '../../src/app/takefile';
import { crc32, isZip, zipData, zipFiles, ZipWriter, type ReadBytes } from '../../src/app/zip';
import type { Take } from '../../src/core/practice/take';

const join = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const reader = (b: Uint8Array): ReadBytes => async (at, len) => b.slice(at, at + len);
const take = (id: string, at: number, title = 'নিশা লাগিল রে'): Take => ({
  id, song: 'song-1', title, at, secs: 0.5, rate: 24000, from: 0, to: 3, loop: false, rounds: 1, tempo: 100, countIn: true, lag: 0.1, sig: 'abc:12',
});
const tone = (n: number, seed: number) => Int16Array.from({ length: n }, (_, i) => Math.round(8000 * Math.sin((i * seed) / 50)));

describe('ZIP files', () => {
  it('checks contents as every ZIP tool does', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('reads back what it wrote, names in Bengali included', async () => {
    const z = new ZipWriter();
    const a = new TextEncoder().encode('first');
    const b = new Uint8Array([0, 1, 2, 255]);
    const file = join([...z.add('একটি.txt', a, Date.UTC(2026, 10, 16)), ...z.add('b.bin', b, 0), ...z.finish()]);
    expect(isZip(file)).toBe(true);
    const files = (await zipFiles(reader(file), file.length))!;
    expect(files.map((f) => f.name)).toEqual(['একটি.txt', 'b.bin']);
    expect(await zipData(reader(file), files[0]!)).toEqual(a);
    expect(await zipData(reader(file), files[1]!)).toEqual(b);
  });

  it('gives nothing for a damaged file', async () => {
    const z = new ZipWriter();
    const file = join([...z.add('a.txt', new TextEncoder().encode('hello'), 0), ...z.finish()]);
    const files = (await zipFiles(reader(file), file.length))!;
    file[30 + 5] ^= 0xff; // the first byte of a.txt's contents
    expect(await zipData(reader(file), files[0]!)).toBeNull();
    expect(await zipFiles(reader(new Uint8Array(40)), 40)).toBeNull();
  });
});

describe('a file of takes', () => {
  it('holds each take’s WAV and the list to bring them back', async () => {
    const z = new TakesZip();
    const t1 = take('take-1', new Date(2026, 10, 16, 19, 35, 41).getTime());
    const t2 = take('take-2', new Date(2026, 10, 16, 19, 35, 41).getTime());
    const p1 = tone(12000, 3);
    const p2 = tone(6000, 7);
    const file = join([...z.add(t1, p1), ...z.add(t2, p2), ...z.finish()]);
    const names = (await zipFiles(reader(file), file.length))!.map((f) => f.name);
    // Named as a take downloaded alone is; two at the same second told apart.
    expect(names).toEqual(['2026.11.16_19.35.41 - নিশা লাগিল রে - Recording.wav', '2026.11.16_19.35.41 - নিশা লাগিল রে (2) - Recording.wav', TAKES_LIST]);
    const got = (await readTakes(reader(file), file.length))!;
    expect(got.takes.map((x) => x.take)).toEqual([t1, t2]);
    const s2 = await got.sound(got.takes[1]!.file);
    expect(s2?.rate).toBe(24000);
    expect(Array.from(s2!.samples)).toEqual(Array.from(p2));
  });

  it('is not taken for one when it is another ZIP', async () => {
    const z = new ZipWriter();
    const other = join([...z.add('notes.txt', new TextEncoder().encode('{}'), 0), ...z.finish()]);
    expect(await readTakes(reader(other), other.length)).toBeNull();
    const text = new TextEncoder().encode('{"format":"gaaner-sathi-backup"}');
    expect(await readTakes(reader(text), text.length)).toBeNull();
  });

  it('leaves out a take whose sound is damaged, and keeps the rest', async () => {
    const z = new TakesZip();
    const file = join([...z.add(take('a', 1000), tone(4000, 2)), ...z.add(take('b', 2000), tone(4000, 5)), ...z.finish()]);
    const got = (await readTakes(reader(file), file.length))!;
    const first = (await zipFiles(reader(file), file.length))![0]!;
    file[first.offset + 30 + new TextEncoder().encode(first.name).length + 100] ^= 0x55;
    expect(await got.sound(got.takes[0]!.file)).toBeNull();
    expect(await got.sound(got.takes[1]!.file)).not.toBeNull();
  });

  it('says what Import did with it, a file imported twice included', () => {
    const f = 'x.zip';
    expect(takesRestoredWords(f, 2, 0, 0)).toBe('Restored 2 takes from x.zip');
    expect(takesRestoredWords(f, 1, 1, 2)).toBe('Restored 1 take from x.zip; 1 was here already; 2 were damaged, left out');
    // Found in the app: the second import of a file said "Restored 0 takes …; 2 were here already".
    expect(takesRestoredWords(f, 0, 2, 0)).toBe('All 2 takes in x.zip are here already');
    expect(takesRestoredWords(f, 0, 1, 0)).toBe('The take in x.zip is here already');
    expect(takesRestoredWords(f, 0, 1, 1)).toBe('No take restored from x.zip: 1 was here already; 1 was damaged, left out');
    expect(takesRestoredWords(f, 0, 0, 0)).toBe('x.zip holds no takes');
  });
});

describe('WAV files', () => {
  it('reads back the samples of a take’s WAV', () => {
    const s = tone(1000, 4);
    const w = wavSamples(wavFile(s, 24000))!;
    expect(w.rate).toBe(24000);
    expect(Array.from(w.samples)).toEqual(Array.from(s));
  });

  it('refuses a WAV that is not mono 16-bit', () => {
    const b = wavFile(tone(10, 1), 24000);
    new DataView(b.buffer).setUint16(22, 2, true); // two channels
    expect(wavSamples(b)).toBeNull();
    expect(wavSamples(new TextEncoder().encode('not a wav file at all'))).toBeNull();
  });
});

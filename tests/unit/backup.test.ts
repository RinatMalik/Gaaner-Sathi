import { describe, expect, it } from 'vitest';
import { BACKUP_BYTES, BACKUP_FORMAT, backupFile, fileBytes, readBackup, sessionLine, type Backup } from '../../src/app/backup';
import { KEEP_SESSIONS } from '../../src/app/db';
import { fromBase64, packReadings, toBase64, unpackReadings } from '../../src/core/practice/pack';
import type { NoteRow, SessionDetail } from '../../src/core/practice/session';

/** The same numbers every run. */
function dice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/**
 * A session as the app keeps one (src/app/pitch.ts → runDetail, then 32-bit floats in the
 * browser's store): `secs` of singing at 46.875 readings a second from 1.5 s before the first
 * beat, a voice with vibrato moving from note to note, a breath now and then, and a note sung
 * every 0.45 s.
 */
function sung(at: number, secs: number, seed = 1): SessionDetail {
  const rnd = dice(seed);
  const hop = 1024 / 48000;
  const n = Math.round((secs + 1.5) / hop);
  const readings: number[] = [];
  const levels: number[] = [];
  let semi = 0;
  for (let i = 0; i < n; i++) {
    const t = -1.5 + i * hop;
    if (i % 21 === 0) semi = [0, 2, 4, 5, 7, 9, 11, 12][Math.floor(rnd() * 8)]!;
    const breath = i % 190 > 170;
    const hz = breath ? 0 : 138.59 * 2 ** (semi / 12) * (1 + 0.004 * Math.sin(t * 31) + 0.002 * (rnd() - 0.5));
    const level = breath ? -58 + 6 * rnd() : -24 + 5 * Math.sin(t * 2) + 2 * rnd();
    readings.push(r3(t), r1(hz));
    levels.push(Math.max(-120, r1(level)), Math.max(-120, r1(level + 9 + 3 * rnd())));
  }
  const notes: NoteRow[] = [];
  for (let k = 0; k * 0.45 < secs; k++) {
    notes.push({
      t0: r3(k * 0.45), t1: r3(k * 0.45 + 0.45), semi: Math.floor(rnd() * 12), oct: 0, g: k, line: k >> 4, pass: 0, status: 'sung',
      score: Math.round(60 + 40 * rnd()), cents: r1(40 * rnd() - 20), arrive: r3(0.2 * rnd()), wobble: r1(12 * rnd()),
    });
  }
  const f32 = (v: number[]) => Array.from(Float32Array.from(v));
  return {
    at, song: 'song-a',
    played: { title: 'আমার সোনার বাংলা', taal: 'dadra', tempo: 133, text: 'সা রা গা | মা পা ধা\nআ মা র | সো না র\n'.repeat(12), saHz: 138.59, sa: 'C♯ (Black 1), low octave' },
    settings: { guide: 'full', guideLoop: 'all', countIn: true },
    pitch: {
      lag: 0.1, measured: true, anyOctave: true, octave: 0, notes,
      lines: Array.from({ length: 12 }, (_, l) => [l, 0, 70 + l, 0.9] as [number, number, number | null, number]),
      readings: f32(readings), levels: f32(levels),
      beats: Array.from({ length: Math.round(secs / 0.45) }, (_, k) => [r3(k * 0.45), k, 0, 0.4511] as [number, number, number, number]),
    },
  };
}

/** A session's line as a backup wrote it until 2026-11-15: every reading as numbers. */
function oldLine(d: SessionDetail): string {
  const p = d.pitch!;
  const readings = p.readings.map((x, i) => (i % 2 ? r2(x) : r3(x)));
  return JSON.stringify({ ...d, pitch: { ...p, readings, levels: p.levels!.map(r1) } });
}

const HEAD: Omit<Backup, 'sessions'> = { at: Date.UTC(2026, 10, 15, 9), songs: [], routines: [], log: [], prefs: {} };
const fileOf = (lines: string[], most?: number) => backupFile(HEAD, lines, most);

describe('readings packed for a backup', () => {
  it('come back exactly as a backup kept them: times to the millisecond, pitches to the hundredth of a hertz, levels to a tenth of a decibel', () => {
    const d = sung(1000, 40).pitch!;
    const got = unpackReadings(packReadings(d.readings, d.levels))!;
    expect(got.readings).toEqual(d.readings.map((x, i) => (i % 2 ? r2(x) : r3(x))));
    expect(got.levels).toEqual(d.levels!.map(r1));
    // Before the first beat times are below zero; no voice is 0 Hz; silence is −120 dB.
    expect(got.readings[0]).toBe(-1.5);
    expect(got.readings.filter((x, i) => i % 2 && x === 0).length).toBeGreaterThan(50);
    const odd = unpackReadings(packReadings([-0.0004, 0, 3600.001, 1046.5, 3600.001, 0.01], [-120, -120, 0, 0, -0.04, 3.2]))!;
    expect(odd).toEqual({ readings: [0, 0, 3600.001, 1046.5, 3600.001, 0.01], levels: [-120, -120, 0, 0, 0, 3.2] });
  });

  it('go without levels when there are none, or when they do not match the readings', () => {
    expect(unpackReadings(packReadings([0.5, 220, 0.521, 221.3]))).toEqual({ readings: [0.5, 220, 0.521, 221.3] });
    expect(unpackReadings(packReadings([0.5, 220, 0.521, 221.3], [-20, -10]))).toEqual({ readings: [0.5, 220, 0.521, 221.3] });
    expect(unpackReadings(packReadings([]))).toEqual({ readings: [] });
    // A number that is not one is kept as nothing heard, never as a hole.
    expect(unpackReadings(packReadings([NaN, Infinity, 1, 200]))).toEqual({ readings: [0, 0, 1, 200] });
  });

  it('are not read from text that is not theirs, or is cut short', () => {
    const text = packReadings(sung(1, 5).pitch!.readings, sung(1, 5).pitch!.levels);
    expect(unpackReadings(text)).not.toBeNull();
    expect(unpackReadings(text.slice(0, -8))).toBeNull();
    expect(unpackReadings(text + 'AAAA')).toBeNull();
    expect(unpackReadings('not base64!')).toBeNull();
    expect(unpackReadings('')).toBeNull();
    expect(unpackReadings(toBase64(Uint8Array.from([9, 1, 0, 0, 0])))).toBeNull();
  });

  it('are written as base64, as everything else writes it', () => {
    const rnd = dice(7);
    for (const n of [0, 1, 2, 3, 4, 5, 255, 8191, 8192, 8193, 30000]) {
      const b = Uint8Array.from({ length: n }, () => Math.floor(rnd() * 256));
      const text = toBase64(b);
      expect(text).toBe(btoa(Array.from(b, (x) => String.fromCharCode(x)).join('')));
      expect(Array.from(fromBase64(text)!)).toEqual(Array.from(b));
    }
    expect(fromBase64('AB=A')).toBeNull();
    expect(fromBase64('ABC')).toBeNull();
    expect(fromBase64('AB€=')).toBeNull();
  });
});

describe('a backup against what Import reads', () => {
  it('holds a session in under a third of the room: three minutes with the pitch check in under 85 KB', () => {
    const d = sung(1000, 180);
    const now = fileBytes(sessionLine(d));
    const before = fileBytes(oldLine(d));
    // Measured 2026-11-15: 267,855 bytes before, 75,496 now.
    expect(before).toBeGreaterThan(250_000);
    expect(now).toBeLessThan(85_000);
    expect(now).toBeLessThan(before / 3);
  });

  it('fits every session the app keeps, each of five minutes, in what Import reads', () => {
    // 1,000 sessions are kept (db.ts) and Import reads 200 MB: the two are held together here.
    const line = fileBytes(sessionLine(sung(1000, 300)));
    expect(line * KEEP_SESSIONS).toBeLessThan(BACKUP_BYTES);
  });

  it('reads back each session as it was kept', () => {
    const a = sung(1000, 20, 3);
    const b = sung(2000, 20, 4);
    delete b.pitch;
    const got = readBackup(fileOf([sessionLine(a), sessionLine(b)]).parts.join(''))!;
    expect(got.sessions.map((s) => s.at)).toEqual([1000, 2000]);
    const back = got.sessions[0]!.read()!;
    expect(back.pitch!.readings).toEqual(a.pitch!.readings.map((x, i) => (i % 2 ? r2(x) : r3(x))));
    expect(back.pitch!.levels).toEqual(a.pitch!.levels!.map(r1));
    expect(back.pitch!.notes).toEqual(a.pitch!.notes);
    expect(back.pitch!.beats).toEqual(a.pitch!.beats);
    expect(back.played).toEqual(a.played);
    expect(got.sessions[1]!.read()).toEqual(b);
  });

  it('still reads a backup made before the readings were packed', () => {
    const a = sung(1000, 20, 5);
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exported: '2026-11-01T10:00:00.000Z', songs: [], routines: [], prefs: {}, log: [] }).slice(0, -1) +
      ',"sessions":[\n' + oldLine(a) + '\n]}\n';
    const back = readBackup(text)!.sessions[0]!.read()!;
    expect(back.pitch!.readings).toEqual(a.pitch!.readings.map((x, i) => (i % 2 ? r2(x) : r3(x))));
    expect(back.pitch!.levels).toEqual(a.pitch!.levels!.map(r1));
  });

  it('keeps a session whose packed readings are damaged, without them', () => {
    const line = sessionLine(sung(1000, 5)).replace(/"packed":"[^"]{20}/, '"packed":"!!!!');
    const back = readBackup(fileOf([line]).parts.join(''))!.sessions[0]!.read()!;
    expect(back.pitch!.readings).toEqual([]);
    expect(back.pitch!.notes.length).toBeGreaterThan(5);
  });

  it('is never bigger than Import reads: the oldest sessions’ detail is left out until it fits, and it says how many', () => {
    const lines = [1, 2, 3, 4, 5].map((k) => sessionLine(sung(k * 1000, 30, k)));
    const sizes = lines.map(fileBytes);
    const whole = fileOf(lines);
    expect(whole.dropped).toBe(0);
    const all = fileBytes(whole.parts.join(''));
    // Room for all but the two oldest.
    const most = all - sizes[0]! - sizes[1]! + 100;
    const cut = fileOf(lines, most);
    expect(cut.dropped).toBe(2);
    const text = cut.parts.join('');
    expect(fileBytes(text)).toBeLessThanOrEqual(most);
    expect(readBackup(text)!.sessions.map((s) => s.at)).toEqual([3000, 4000, 5000]);
    // Exactly at the limit nothing goes; a byte under it, the oldest does.
    expect(fileOf(lines, all).dropped).toBe(0);
    expect(fileOf(lines, all - 1).dropped).toBe(1);
    // With no room for any, it is still a backup: the songs and the log are never left out.
    const none = fileOf(lines, 10);
    expect(none.dropped).toBe(5);
    expect(readBackup(none.parts.join(''))!.sessions).toEqual([]);
  });

  it('counts the bytes a file takes, where Bengali letters take three each', () => {
    for (const s of ['', 'plain', 'আমার সোনার বাংলা', 'C♯ é 𝄞 end', '\ud83c', '\ud83cx', sessionLine(sung(1, 3))]) expect(fileBytes(s)).toBe(new TextEncoder().encode(s).length);
  });
});

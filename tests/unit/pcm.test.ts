// Takes' samples (src/audio/dsp/pcm.ts): halving the rate, 16-bit samples, WAV files.
import { describe, expect, it } from 'vitest';
import { fromInt16, halfRate, HalfRateStream, rmsDb, toInt16, wavFile } from '../../src/audio/dsp/pcm';
import { seeded } from '../helpers';

const SR = 48000;
const tone = (f: number, secs: number, amp = 0.5) => Float32Array.from({ length: Math.round(secs * SR) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / SR));

describe('take samples', () => {
  it('halving the rate keeps a voice and drops what would fold back', () => {
    const voice = halfRate(tone(440, 0.5));
    const high = halfRate(tone(18000, 0.5)); // above the new 12 kHz limit
    expect(voice.length).toBe(12000);
    expect(rmsDb(voice, 200, 11800)).toBeCloseTo(rmsDb(tone(440, 0.5)), 1);
    expect(rmsDb(high, 200, 11800) - rmsDb(tone(18000, 0.5))).toBeLessThan(-40);
  });

  it('as the samples arrive in blocks, gives the same as all at once', () => {
    const r = seeded(4);
    const x = Float32Array.from({ length: 30001 }, () => (r() - 0.5) * 0.8);
    const whole = toInt16(halfRate(x));
    const s = new HalfRateStream();
    for (let i = 0; i < x.length; ) {
      const n = 1 + Math.floor(r() * 4000);
      s.push(x.subarray(i, i + n));
      i += n;
    }
    const got = s.finish();
    expect(got.length).toBe(whole.length);
    let worst = 0;
    for (let i = 0; i < got.length; i++) worst = Math.max(worst, Math.abs(got[i]! - whole[i]!));
    expect(worst).toBeLessThanOrEqual(1);
  });

  it('16-bit samples and a WAV file a player can read', () => {
    const x = Float32Array.from([0, 0.5, -0.5, 1, -1, 2]);
    const i16 = toInt16(x);
    expect(Array.from(i16)).toEqual([0, 16384, -16383, 32767, -32767, 32767]);
    expect(fromInt16(i16)[1]).toBeCloseTo(0.5, 4);
    const w = wavFile(i16, 24000);
    const v = new DataView(w.buffer);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    expect([v.getUint32(4, true), v.getUint16(22, true), v.getUint32(24, true), v.getUint16(34, true), v.getUint32(40, true)]).toEqual([36 + 12, 1, 24000, 16, 12]);
    expect(v.getInt16(44 + 2, true)).toBe(16384);
  });
});

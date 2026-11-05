// How loud the voice sings (Rinat, 2026-11-04): the microphone overloading, the level the voice
// has been singing at, the loudness gauge (its fixed middle, scale, zones, steadied needle, where
// the microphone cuts off and the panel's tint), and the voice line's thickness.
import { describe, expect, it } from 'vitest';
import { blockClip, CLIP_RUN, GAUGE_MIDDLE, GAUGE_REACH, GaugeLevel, gaugeY, levelDb, LevelRef, loudTint, loudZone, micLimit, Overload, OVERLOAD_BLOCKS, OVERLOAD_HOLD, OVERLOAD_WITHIN, widthStep, ZONE_EDGES, ZONE_WORD, ZONES } from '../../src/core/pitch/loudness';

describe('a reading’s level', () => {
  it('is dB of full scale', () => {
    expect(levelDb(1)).toBe(0);
    expect(levelDb(0.1)).toBeCloseTo(-20);
    expect(levelDb(0)).toBe(-Infinity);
  });
});

describe('the microphone overloading', () => {
  /** A hop's worth (1024 samples at 48 kHz) of a tone, cut off at `cut`, then scaled by `vol`. */
  const tone = (hz: number, amp: number, cut = 1, vol = 1, bits = 0) =>
    Float32Array.from({ length: 1024 }, (_, i) => {
      let v = Math.max(-cut, Math.min(cut, amp * Math.sin((2 * Math.PI * hz * i) / 48000))) * vol;
      if (bits) v = Math.round(v * 2 ** (bits - 1)) / 2 ** (bits - 1);
      return v;
    });

  it('is a sample at full scale', () => {
    expect(blockClip(tone(277, 0.995))).toBe('full');
    expect(blockClip(tone(277, 0.9))).toBe(null);
  });

  it('is a flat top, turned down after the cut', () => {
    // Cut off at full scale, then a volume of 0.976 (headless Edge's fake microphone).
    expect(blockClip(tone(277, 1.4, 1, 0.976))).toBe('down');
    // Cut off by a tenth of a decibel, then turned down by half.
    expect(blockClip(tone(277, 1.012, 1, 0.5))).toBe('down');
  });

  it('is never a voice, however low or plain, nor a quiet hum', () => {
    expect(blockClip(tone(60, 0.25))).toBe(null);
    expect(blockClip(tone(60, 0.25, 1, 1, 16))).toBe(null);
    expect(blockClip(tone(100, 0.8, 1, 1, 16))).toBe(null);
    expect(blockClip(tone(60, 0.2, 0.1))).toBe(null);
    expect(CLIP_RUN).toBe(6);
  });

  it('is told once the voice is cut off again and again, for a while after', () => {
    expect([OVERLOAD_BLOCKS, OVERLOAD_WITHIN, OVERLOAD_HOLD]).toEqual([3, 2, 3]);
    const o = new Overload();
    o.add(10, 'full', true);
    o.add(10.5, 'full', true);
    expect(o.now(10.5)).toBe(null);
    o.add(11.9, 'full', true);
    expect(o.now(11.9)).toBe('full');
    expect(o.now(14.8)).toBe('full');
    expect(o.now(14.95)).toBe(null);
    // Cut off after the computer's level was turned down: said so.
    o.add(20, 'down', true);
    o.add(20.1, 'down', true);
    o.add(20.2, 'down', true);
    expect(o.now(20.3)).toBe('down');
    // With no reading since the microphone opened (stopped; going on after a pause): not told.
    expect(o.now(-Infinity)).toBe(null);
    o.clear();
    expect(o.now(20.3)).toBe(null);
  });

  it('is not told for one cut, cuts far apart, or a knock with no voice in it', () => {
    const o = new Overload();
    o.add(1, 'full', true);
    o.add(3.5, 'full', true);
    o.add(6, 'full', true);
    expect(o.now(6)).toBe(null);
    for (let i = 0; i < 10; i++) o.add(8 + i * 0.02, 'full', false);
    expect(o.now(8.2)).toBe(null);
  });
});

describe('the level the voice has been singing at', () => {
  it('is the median of the last ten seconds, the guide in the rests left out', () => {
    const R = new LevelRef();
    expect(R.value()).toBeNull();
    for (let i = 0; i < 100; i++) R.push(i * 0.02, -12 + (i % 3));
    expect(R.value()).toBe(-11);
    for (let i = 0; i < 40; i++) R.push(2 + i * 0.02, -40);
    expect(R.value()).toBe(-11);
    // Ten seconds on, only what came since counts.
    for (let i = 0; i < 50; i++) R.push(13 + i * 0.02, -6);
    expect(R.value()).toBe(-6);
    R.push(14, -Infinity);
    expect(R.value()).toBe(-6);
  });
});

describe('the loudness gauge (Rinat’s pick, 2026-11-04)', () => {
  it('has its middle fixed at −18 dB of full scale, a usual level to record a voice at, louder above, 12 dB to each end (Rinat, 2026-11-05)', () => {
    // Not the voice's own level of the last 10 s: singing too loud for 10 s no longer becomes the norm.
    expect(GAUGE_MIDDLE).toBe(-18);
    expect(GAUGE_REACH).toBe(12);
    expect([0, 6, 12, 20, -3, -12, -30].map(gaugeY)).toEqual([50, 25, 0, 0, 62.5, 100, 100]);
  });

  it('is just right within 3 dB, a little to 6, too loud or too soft beyond', () => {
    expect(ZONE_EDGES).toEqual([-6, -3, 3, 6]);
    expect([0, 3, -3, 3.5, 6, 6.5, -4, -6, -7].map((d) => loudZone(d, null))).toEqual(['ok', 'ok', 'ok', 'loud1', 'loud1', 'loud2', 'soft1', 'soft1', 'soft2']);
    expect(ZONES.map((z) => ZONE_WORD[z])).toEqual(['Too soft', 'A little soft', 'Just right', 'A little loud', 'Too loud']);
  });

  it('holds a zone a decibel past its edge, so the word does not flicker', () => {
    expect(loudZone(3.6, 'ok')).toBe('ok');
    expect(loudZone(4.1, 'ok')).toBe('loud1');
    expect(loudZone(2.4, 'loud1')).toBe('loud1');
    expect(loudZone(1.9, 'loud1')).toBe('ok');
    expect(loudZone(-6.8, 'soft1')).toBe('soft1');
    expect(loudZone(-7.2, 'soft1')).toBe('soft2');
    // A jump past two edges is not held.
    expect(loudZone(9, 'ok')).toBe('loud2');
  });

  it('moves its needle steadily: about two thirds of the way to a new level in a third of a second', () => {
    const g = new GaugeLevel();
    expect(g.value()).toBeNull();
    expect(g.push(0, -20)).toBe(-20);
    let v = -20;
    for (let i = 1; i <= 16; i++) v = g.push(i * 0.021, -10);
    // 16 readings of 21 ms: 0.336 s, about one time constant (0.35 s).
    expect(v).toBeGreaterThan(-14.2);
    expect(v).toBeLessThan(-13.4);
    for (let i = 17; i <= 120; i++) v = g.push(i * 0.021, -10);
    expect(v).toBeCloseTo(-10, 1);
  });

  it('starts afresh after half a second without the voice', () => {
    const g = new GaugeLevel();
    g.push(0, -20);
    g.push(0.02, -20);
    expect(g.push(0.7, -8)).toBe(-8);
    g.clear();
    expect(g.value()).toBeNull();
  });

  it('marks where the microphone cuts off: the loudest moments at full scale', () => {
    // A voice at −10 dB of full scale, its peaks 8 dB above: they reach full scale 2 dB louder
    // (Rinat's takes of 25–27 Oct sat about there).
    expect(micLimit(-10, 8)).toBe(2);
    // At −18 with the same peaks there are 10 dB to spare.
    expect(micLimit(-18, 8)).toBe(10);
    // Beyond the gauge's reach above: not marked.
    expect(micLimit(-24, 8)).toBeNull();
    // Already cut off as the voice usually sings: under the middle.
    expect(micLimit(-4, 8)).toBe(-4);
    // Against the fixed middle: Rinat's takes of 26–27 Oct, peaks about 9 dB above the level,
    // cut off 9 dB above −18, near the gauge's top.
    expect(micLimit(GAUGE_MIDDLE, 9)).toBe(9);
  });

  it('tints the panel red when loud and blue when soft, the further the stronger (Rinat, 2026-11-05)', () => {
    expect(loudTint(0, 'ok')).toBeNull();
    expect(loudTint(3.5, 'ok')).toBeNull();
    // From a tenth at the zone's edge to all of it at the gauge's end, and no further.
    expect(loudTint(3.5, 'loud1')).toEqual({ hot: true, k: 0.1 });
    expect(loudTint(7.5, 'loud2')).toEqual({ hot: true, k: 0.5 });
    expect(loudTint(12, 'loud2')).toEqual({ hot: true, k: 1 });
    expect(loudTint(20, 'loud2')).toEqual({ hot: true, k: 1 });
    expect(loudTint(-7.5, 'soft2')).toEqual({ hot: false, k: 0.5 });
    expect(loudTint(-12, 'soft2')).toEqual({ hot: false, k: 1 });
    // A zone held past its edge still tints, faintly.
    expect(loudTint(2.5, 'loud1')).toEqual({ hot: true, k: 0.1 });
    expect(loudTint(-4, 'soft1')!.hot).toBe(false);
  });
});

describe('the voice line’s thickness', () => {
  it('goes from 0 (soft) to 4 (loud), 2 as usual', () => {
    expect([-9, -4, 0, 4, 9].map((d) => widthStep(d, null))).toEqual([0, 1, 2, 3, 4]);
  });

  it('holds until a decibel past the next edge, so it does not flicker', () => {
    expect(widthStep(2.5, 2)).toBe(2);
    expect(widthStep(3, 2)).toBe(3);
    expect(widthStep(1.5, 3)).toBe(3);
    expect(widthStep(0.9, 3)).toBe(2);
    expect(widthStep(-2.5, 2)).toBe(2);
    expect(widthStep(-3.1, 2)).toBe(1);
    // A jump far past the edges goes straight there.
    expect(widthStep(10, 1)).toBe(4);
  });
});

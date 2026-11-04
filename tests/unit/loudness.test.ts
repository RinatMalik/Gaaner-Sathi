// How loud the voice sings (Rinat, 2026-11-04): each note's level in a line, the line's rise
// for each octave up and its words, the level the voice has been singing at, and the voice
// line's thickness.
import { describe, expect, it } from 'vitest';
import { blockClip, CLIP_RUN, EVEN, levelDb, LevelRef, lineLevel, LineLevels, MIN_READINGS, Overload, OVERLOAD_BLOCKS, OVERLOAD_HOLD, OVERLOAD_WITHIN, riseText, riseWord, risePerOctave, widthStep, type NoteLevel } from '../../src/core/pitch/loudness';

/** A note sung for `n` readings at `db`, a little either side. */
const sing = (L: LineLevels, cents: number, db: number, n = 20, clip = false) => {
  for (let i = 0; i < n; i++) L.add(cents, db + (i % 2 ? 0.5 : -0.5), clip && i === 3);
};
const note = (cents: number, db: number): NoteLevel => ({ cents, db, n: 20, clip: false });

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

describe('each note of a line', () => {
  it('has the median level of the voice on it, low to high, a note sung twice once', () => {
    const L = new LineLevels();
    sing(L, 700, -9);
    sing(L, 0, -14);
    sing(L, 700, -9, 10);
    expect(L.levels().map((x) => [x.cents, x.db, x.n])).toEqual([[0, -14, 20], [700, -9, 30]]);
  });

  it('leaves out a note sung too briefly, and readings far under the voice (the guide in a rest)', () => {
    const L = new LineLevels();
    sing(L, 0, -10);
    sing(L, 200, -10, MIN_READINGS - 1);
    // A note not sung: the guide heard faintly through it.
    sing(L, 400, -34);
    sing(L, 700, -8);
    expect(L.levels().map((x) => x.cents)).toEqual([0, 700]);
  });

  it('marks a note the microphone overloaded on', () => {
    const L = new LineLevels();
    sing(L, 0, -10);
    sing(L, 1200, -1, 20, true);
    expect(L.levels().map((x) => x.clip)).toEqual([false, true]);
  });

  it('is shown against the line’s own level: the mean of its notes, each once', () => {
    expect(lineLevel([note(0, -14), note(700, -8), note(1200, -8)])).toBe(-10);
    expect(lineLevel([])).toBeNull();
  });
});

describe('the line’s rise for each octave up', () => {
  it('is the slope across its notes, each note once', () => {
    // 1 dB a semitone: 12 dB an octave.
    expect(risePerOctave([0, 200, 400, 500, 700].map((c) => note(c, -20 + c / 100)))).toBeCloseTo(12);
    // As loud all the way up.
    expect(risePerOctave([0, 400, 700, 1200].map((c) => note(c, -10)))).toBe(0);
    // Softer going up.
    expect(risePerOctave([note(0, -8), note(700, -11.5), note(1200, -14)])).toBeCloseTo(-6);
  });

  it('needs three notes a fourth apart at least', () => {
    expect(risePerOctave([note(0, -10), note(1200, -4)])).toBeNull();
    expect(risePerOctave([note(0, -10), note(200, -8), note(400, -6)])).toBeNull();
    expect(risePerOctave([note(0, -10), note(200, -8), note(500, -6)])).not.toBeNull();
  });

  it('is said in words, and as a number', () => {
    expect([null, 0, EVEN, -EVEN, EVEN + 0.5, -(EVEN + 0.5)].map(riseWord)).toEqual(['', 'Even', 'Even', 'Even', 'Louder going up', 'Softer going up']);
    expect([8.4, -5.2, 0.3].map(riseText)).toEqual(['+8 dB an octave', '−5 dB an octave', '0 dB an octave']);
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

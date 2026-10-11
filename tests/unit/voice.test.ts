// The Voice view's sums (src/core/pitch/voice.ts): steady notes, the range finder's Sa, and
// timing a held note.
import { describe, expect, it } from 'vitest';
import { HOLD_CENTS, loadPrefs, STORE_KEYS } from '../../src/app/store';
import { holdResultHTML, holdText, HOLD_NOTES, rangeResultHTML } from '../../src/app/voice';
import { parseSong } from '../../src/core/notation/parse';
import type { Reading } from '../../src/core/pitch/track';
import { HoldTimer, midiOf, noteName, RangeListener, songSpan, steadiness, steadyPitch, suggestSa } from '../../src/core/pitch/voice';

const RATE = 45; // readings a second, as the microphone gives them
const hzOf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
/** Readings for a stretch of singing: a pitch (MIDI) with a vibrato, or silence (null). */
function sing(t0: number, secs: number, midi: number | null, vib = 0.15): Reading[] {
  const out: Reading[] = [];
  for (let i = 0; i < secs * RATE; i++) {
    const t = t0 + i / RATE;
    out.push({ t, hz: midi == null ? 0 : hzOf(midi + vib * Math.sin(2 * Math.PI * 5.5 * t)) });
  }
  return out;
}

describe('notes and steady pitches', () => {
  it('names notes as on a keyboard', () => {
    expect([noteName(60), noteName(61), noteName(47.6), noteName(69), noteName(83)]).toEqual(['C4', 'C♯4', 'C3', 'A4', 'B5']);
    expect(midiOf(440)).toBeCloseTo(69, 9);
  });

  it('hears a held note through vibrato and a stray reading, but not a slide or near silence', () => {
    const held = sing(0, 1, 50.3);
    held[20] = { t: held[20]!.t, hz: hzOf(62) }; // one reading an octave up
    expect(steadyPitch(held, held[held.length - 1]!.t)).toBeCloseTo(50.3, 1);
    const slide: Reading[] = Array.from({ length: 45 }, (_, i) => ({ t: i / RATE, hz: hzOf(48 + i * 0.12) }));
    expect(steadyPitch(slide, slide[44]!.t)).toBeNull();
    const sparse = sing(0, 1, 55).map((r, i) => (i % 2 ? { ...r, hz: 0 } : r));
    expect(steadyPitch(sparse, sparse[44]!.t)).toBeNull();
  });

  it('the range finder keeps the lowest (or highest) note held, not one only passed through', () => {
    const low = new RangeListener('low');
    let t = 0;
    for (const [m, secs] of [[55, 0.8], [52, 0.8], [47, 0.2], [50, 0.9], [53, 0.6]] as const) {
      for (const r of sing(t, secs, m)) low.add(r);
      t += secs;
    }
    expect(low.best).toBeCloseTo(50, 1);
    const high = new RangeListener('high');
    for (const r of [...sing(0, 0.8, 64), ...sing(0.8, 0.8, 69), ...sing(1.6, 0.6, null)]) high.add(r);
    expect(high.best).toBeCloseTo(69, 1);
    expect(high.now).toBeNull();
  });
});

describe('suggesting a Sa', () => {
  it('puts mandra Pa to taar Ga in the middle of the range', () => {
    // A man's range C3–G4: Sa E3, low octave; the range runs 4 below to 15 above.
    expect(suggestSa(48, 67)).toEqual({ sa: 52, saKey: 4, saOct: 3, clamped: false, low: -4, high: 15, short: 2 });
    // A woman's G3–F5: Sa C♯4, middle octave, and the usual span fits.
    expect(suggestSa(77, 55)).toMatchObject({ sa: 61, saKey: 1, saOct: 4, short: 0, low: -6, high: 16 });
  });

  it('keeps to the Sa the app can play, and says when it had to', () => {
    expect(suggestSa(36, 55)).toMatchObject({ sa: 48, saKey: 0, saOct: 3, clamped: true });
    expect(suggestSa(90, 100)).toMatchObject({ sa: 83, saOct: 5, clamped: true });
  });

  it('for a song, centres its own notes in the range', () => {
    const P = parseSong('.পা .ধা সা | রা গা মা\nপা ধা না | র্সা - -');
    expect(songSpan(P)).toEqual({ lo: -5, hi: 12 });
    expect(songSpan(parseSong('# only a heading'))).toBeNull();
    expect(suggestSa(48, 67, { lo: -5, hi: 12 })).toMatchObject({ sa: 54, saKey: 6, saOct: 3, short: 0 });
  });
});

describe('holding a note', () => {
  it('times the hold from the first sound to the last, and measures how steady it was', () => {
    const h = new HoldTimer(700, hzOf(50)); // Pa above a Sa of D3
    const rs = [...sing(0, 0.5, null), ...sing(0.5, 6, 57.05, 0.1), ...sing(6.5, 0.6, null)];
    let res = null;
    for (const r of rs) res = h.add(r) ?? res;
    expect(res).not.toBeNull();
    expect(res!.secs).toBeCloseTo(6, 1);
    expect(res!.cents).toBeCloseTo(5, 0);
    expect(res!.wobble).toBeGreaterThan(5);
    expect(res!.wobble).toBeLessThan(9);
    expect(res!.onNote).toBe(1);
    expect(steadiness(res!.wobble)).toBe('very steady');
  });

  it('a short breath does not end it; a longer gap does; any octave counts', () => {
    const h = new HoldTimer(0, hzOf(48));
    for (const r of [...sing(0, 2, 36), ...sing(2, 0.2, null), ...sing(2.2, 2, 36)]) h.add(r);
    expect(h.result).toBeNull();
    expect(h.held()).toBeGreaterThan(4);
    for (const r of sing(4.2, 0.5, null)) h.add(r);
    expect(h.result!.secs).toBeCloseTo(4.2, 1);
    expect(Math.abs(h.result!.cents)).toBeLessThan(2);
  });

  it('Stop ends it where it is; a wobbly voice says so', () => {
    const h = new HoldTimer(0, hzOf(48));
    for (const r of sing(0, 3, 48, 0.6)) h.add(r);
    const res = h.finish()!;
    expect(res.secs).toBeCloseTo(3, 1);
    expect(steadiness(res.wobble)).toBe('unsteady');
    expect(new HoldTimer(0, 100).finish()).toBeNull();
  });
});

describe('the Voice view', () => {
  it('says the range, your Sa and the song’s, and offers to use them', () => {
    const html = rangeResultHTML({ lo: 48, hi: 67 }, 'lat', undefined, { title: 'আমার <গান>', own: true, span: { lo: -5, hi: 12 }, sa: { saKey: 0, saOct: 4 } });
    expect(html).toContain('Your range: <b>C3 · White 1</b> to <b>G4 · White 5</b>, 1 octave and 7 semitones.');
    expect(html).toContain('Your Sa: <b>E (White 3), low octave</b>');
    expect(html).toContain('a little more than your range');
    expect(html).toContain('data-act="mysa" data-key="4" data-oct="3"');
    expect(html).toContain('For <b class="vtitle">আমার &lt;গান&gt;</b>: <b>F♯ (Black 3), low octave</b>');
    expect(html).toContain('which fits your range');
    expect(html).toContain('data-act="songsa" data-key="6" data-oct="3"');
    // Already chosen: no buttons, a note instead. An exercise gets no song part.
    const done = rangeResultHTML({ lo: 48, hi: 67 }, 'bn', { saKey: 4, saOct: 3 }, { title: 'x', own: false, span: null, sa: { saKey: 4, saOct: 3 } });
    expect(done).toContain('Exercises and new songs use it.');
    expect(done).not.toContain('data-act');
  });

  it('says how a hold went, and whether it is the longest yet', () => {
    const r = { secs: 12.43, cents: 14, wobble: 6.2, onNote: 0.95 };
    expect(holdResultHTML(r, undefined)).toContain('Held <b>12.4 s</b>');
    expect(holdResultHTML(r, undefined)).toContain('very steady (it moved ±6 cents), 14 cents sharp.');
    expect(holdResultHTML(r, 10)).toContain('Your longest yet (before: 10.0 s).');
    expect(holdResultHTML(r, 20)).toContain('Your longest: 20.0 s.');
    expect(holdResultHTML({ ...r, cents: -3, onNote: 0.5 }, 20)).toContain('in tune, and off the note 50% of the time.');
  });

  it('plays each note it offers as written notation', () => {
    expect(HOLD_NOTES.map(([c]) => holdText(c))).toEqual(['.P - - -', '.D - - -', '.N - - -', 'S - - -', 'R - - -', 'G - - -', 'M - - -', 'P - - -', 'D - - -', 'N - - -', "S' - - -"]);
    expect(HOLD_NOTES.map(([c]) => c)).toEqual(HOLD_CENTS);
  });

  it('keeps your Sa, your range and your longest holds with the device settings, checked', () => {
    const S = new Map<string, string>();
    const store = { getItem: (k: string) => S.get(k) ?? null, setItem: (k: string, v: string) => void S.set(k, v), removeItem: (k: string) => void S.delete(k) };
    S.set(STORE_KEYS.prefs, JSON.stringify({ mySa: { saKey: 4, saOct: 3 }, voiceRange: { lo: 48.2, hi: 67 }, holdNote: 700, holdBest: { '700': 12.4, '0': 8, x: 3, '650': 2 }, tab: 'voice' }));
    const p = loadPrefs(store);
    expect([p.mySa, p.voiceRange, p.holdNote, p.holdBest, p.tab]).toEqual([{ saKey: 4, saOct: 3 }, { lo: 48.2, hi: 67 }, 700, { '700': 12.4, '0': 8 }, 'voice']);
    S.set(STORE_KEYS.prefs, JSON.stringify({ mySa: { saKey: 12, saOct: 3 }, voiceRange: { lo: 'x' }, holdNote: 650, holdBest: [] }));
    const q = loadPrefs(store);
    expect([q.mySa, q.voiceRange, q.holdNote, q.holdBest]).toEqual([undefined, undefined, undefined, undefined]);
  });
});

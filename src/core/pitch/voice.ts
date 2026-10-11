/**
 * The Voice view's sums (docs/ENGINE.md → The Voice tab): the range finder, which hears the
 * lowest and highest notes held and suggests a Sa, and the hold-a-note trainer, which times
 * one held note and says how steady it was. Pure (no DOM, no audio), so it is tested in Node.
 * Pitches are MIDI note numbers with fractions (60 is middle C, 69 is A 440).
 */
import type { ParsedSong } from '../notation/types';
import { foldOctave, type Reading } from './track';

export const midiOf = (hz: number): number => 69 + 12 * Math.log2(hz / 440);

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
/** A note's name with its octave, as on a keyboard: 60 → "C4". */
export const noteName = (m: number): string => {
  const r = Math.round(m);
  return NAMES[((r % 12) + 12) % 12]! + (Math.floor(r / 12) - 1);
};

function median(v: readonly number[]): number {
  const s = v.slice().sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k]! : (s[k - 1]! + s[k]!) / 2;
}

/**
 * The note being held at time `now`, or null: over the last `win` seconds, most readings have
 * a pitch, and those pitches (leaving out the odd stray one) lie within a semitone. Returns
 * its median, a MIDI number.
 */
export function steadyPitch(readings: readonly Reading[], now: number, win = 0.5): number | null {
  const r = readings.filter((x) => x.t > now - win && x.t <= now);
  if (r.length < 6) return null;
  const voiced = r.filter((x) => x.hz > 0).map((x) => midiOf(x.hz));
  if (voiced.length < 0.75 * r.length) return null;
  const s = voiced.slice().sort((a, b) => a - b);
  const cut = Math.floor(s.length * 0.1);
  const core = s.slice(cut, s.length - cut);
  if (core[core.length - 1]! - core[0]! > 1) return null;
  return median(core);
}

/** The lowest or highest note held while listening. */
export class RangeListener {
  readonly readings: Reading[] = [];
  /** The extreme note held so far, and the note held now. */
  best: number | null = null;
  now: number | null = null;
  constructor(readonly want: 'low' | 'high') {}

  add(r: Reading): void {
    this.readings.push(r);
    if (this.readings.length > 400) this.readings.splice(0, 100);
    this.now = steadyPitch(this.readings, r.t);
    if (this.now == null) return;
    if (this.best == null || (this.want === 'low' ? this.now < this.best : this.now > this.best)) this.best = this.now;
  }
}

/** The notes a song usually spans around its Sa, in semitones: mandra Pa to taar Ga. */
export const TYPICAL_SPAN: Readonly<{ lo: number; hi: number }> = { lo: -5, hi: 16 };
/** The lowest and highest Sa the app plays: C3 to B5 (Low, Middle and High octaves). */
export const SA_RANGE: readonly [number, number] = [48, 83];

export interface SaSuggestion {
  /** Sa as a MIDI number, and as the app sets it. */
  sa: number;
  saKey: number;
  saOct: 3 | 4 | 5;
  /** True when the best Sa is outside what the app plays, so the nearest was taken. */
  clamped: boolean;
  /** The singer's range around that Sa, in semitones (lowest below, highest above). */
  low: number;
  high: number;
  /** Semitones the span needs beyond the range (0 when it fits). */
  short: number;
}

/**
 * The Sa that puts a span of notes (a song's, or the usual one) in the middle of the singer's
 * range: lowest and highest held, MIDI numbers.
 */
export function suggestSa(lowest: number, highest: number, span: { lo: number; hi: number } = TYPICAL_SPAN): SaSuggestion {
  const lo = Math.min(lowest, highest);
  const hi = Math.max(lowest, highest);
  const ideal = Math.round((lo + hi) / 2 - (span.lo + span.hi) / 2);
  const sa = Math.max(SA_RANGE[0], Math.min(SA_RANGE[1], ideal));
  const oct = Math.floor(sa / 12) - 1;
  return {
    sa,
    saKey: ((sa % 12) + 12) % 12,
    saOct: (oct <= 3 ? 3 : oct >= 5 ? 5 : 4) as 3 | 4 | 5,
    clamped: sa !== ideal,
    low: Math.round(lo - sa),
    high: Math.round(hi - sa),
    short: Math.max(0, Math.round(span.hi - span.lo - (hi - lo))),
  };
}

/** A song's lowest and highest notes, semitones from its Sa; null when it has none. */
export function songSpan(P: ParsedSong): { lo: number; hi: number } | null {
  if (!P.events.length) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of P.events) {
    const s = e.semi + 12 * e.oct;
    lo = Math.min(lo, s);
    hi = Math.max(hi, s);
  }
  return { lo, hi };
}

// ── Holding a note ───────────────────────────────────────────────────────────

/** A gap in the voice longer than this ends the hold (a breath). */
export const HOLD_GAP = 0.35;

export interface HoldResult {
  /** Seconds held, from the first sound to the last. */
  secs: number;
  /** The median distance from the note, cents (sharp positive), any octave. */
  cents: number;
  /** How much the pitch moved after the first moments: standard deviation, cents. */
  wobble: number;
  /** The share of the hold within 50 cents of the note. */
  onNote: number;
}

/**
 * Times one held note. Readings come in as they are heard; the hold starts with the first
 * pitch and ends at the first gap longer than HOLD_GAP. `target` is the note in cents from Sa.
 */
export class HoldTimer {
  private t0 = NaN;
  private last = NaN;
  private errs: { t: number; c: number }[] = [];
  result: HoldResult | null = null;
  constructor(readonly target: number, readonly saHz: number) {}

  get started(): boolean {
    return !Number.isNaN(this.t0);
  }
  /** Seconds held so far. */
  held(): number {
    return this.started ? this.last - this.t0 : 0;
  }
  /** The distance of the latest pitch from the note, cents, or null. */
  latest: number | null = null;

  add(r: Reading): HoldResult | null {
    if (this.result) return this.result;
    if (r.hz > 0) {
      const c = foldOctave(1200 * Math.log2(r.hz / this.saHz) - this.target);
      this.latest = c;
      if (!this.started) this.t0 = r.t;
      this.last = r.t;
      this.errs.push({ t: r.t, c });
      return null;
    }
    this.latest = null;
    if (this.started && r.t - this.last > HOLD_GAP) this.finish();
    return this.result;
  }

  /** End the hold now (the singer pressed Stop). */
  finish(): HoldResult | null {
    if (this.result || !this.started) return this.result;
    const settled = this.errs.filter((e) => e.t >= this.t0 + 0.3).map((e) => e.c);
    const all = this.errs.map((e) => e.c);
    const use = settled.length >= 5 ? settled : all;
    const m = median(use);
    const sd = Math.sqrt(use.reduce((a, c) => a + (c - m) ** 2, 0) / use.length);
    this.result = { secs: this.last - this.t0, cents: m, wobble: sd, onNote: all.filter((c) => Math.abs(c) <= 50).length / all.length };
    return this.result;
  }
}

/** Words for how steady a hold was, from its wobble. */
export function steadiness(wobble: number): string {
  return wobble <= 8 ? 'very steady' : wobble <= 15 ? 'steady' : wobble <= 30 ? 'a little unsteady' : 'unsteady';
}

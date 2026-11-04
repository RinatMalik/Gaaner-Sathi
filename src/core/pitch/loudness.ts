/**
 * How loud the voice sings (Rinat, 2026-11-04: "I automatically take it as higher pitches comes
 * with louder volume ... a loudness gauge or some sort of visualisation of my loudness might be
 * better to have instead of pitch gauge"). Each note of a line is given the level the voice sang
 * it at, to be shown against the line's own level: nothing is set up, and moving nearer the
 * microphone or further from it between lines does not matter (within a line it does: twice as
 * far reads about 6 dB softer). How much louder the line got for each octave up is worked out
 * across its notes, each note once. Rinat's takes of 25–27 October rose 3 dB an octave in the
 * exercises and 7 in the songs (CONTEXT.md). The voice line is drawn thicker when louder than the
 * voice has been singing. Levels are dB of full scale, from each reading's root mean square
 * (the browser's automatic gain is off, src/audio/mic.ts). Pure: tested in Node.
 */

/** A reading's level in dB of full scale (−Infinity for silence). */
export const levelDb = (rms: number): number => (rms > 0 ? 20 * Math.log10(rms) : -Infinity);

/** A sample this near full scale: the microphone is overloading (its input gain too high). */
export const CLIP = 0.99;

/** Samples in a row at a block's loudest that mean its top was cut off. */
export const CLIP_RUN = 6;

/** How a block of samples was cut off at the top: at full scale ('full'), or below it ('down':
 * cut off, then turned down by a volume after the cut, the computer's input level for the device
 * set under 100, which cannot undo the cut); null when it was not. */
export type Clip = 'full' | 'down' | null;

/**
 * Whether a block of samples was cut off at the top, and how: a sample at full scale, or (from a
 * quarter of full scale) six or more in a row at the block's loudest, the flat top of a waveform
 * cut off and then turned down. A voice never holds its peak that long: even at 60 Hz, sampled at
 * 48 kHz, its top changes within two samples.
 */
export function blockClip(data: ArrayLike<number>): Clip {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
  if (peak >= CLIP) return 'full';
  if (peak < 0.25) return null;
  const top = peak - 1e-6;
  let run = 0;
  for (let i = 0; i < data.length; i++) {
    run = Math.abs(data[i]!) >= top ? run + 1 : 0;
    if (run >= CLIP_RUN) return 'down';
  }
  return null;
}

/** The overload is told once the voice has been cut off this many times (blocks, about 21 ms
 * each) within `OVERLOAD_WITHIN` seconds, and for `OVERLOAD_HOLD` seconds after the last. */
export const OVERLOAD_BLOCKS = 3;
export const OVERLOAD_WITHIN = 2;
export const OVERLOAD_HOLD = 3;

/** The microphone overloading while the voice sings (Rinat, 2026-11-04: "I kept reducing the mic
 * volume but i kep getting notification that it is still too loud"): only blocks of the voice
 * count (a knock, a breath or a "p" into the microphone does not), and only cut off again and
 * again, not once. */
export class Overload {
  private at: number[] = [];
  private until = -Infinity;
  private kind: Clip = null;

  /** A block at time `t` (seconds), how it was cut off, and whether the voice was heard in it. */
  add(t: number, clip: Clip, voiced: boolean): void {
    if (!clip || !voiced) return;
    this.at.push(t);
    while (this.at.length && this.at[0]! < t - OVERLOAD_WITHIN) this.at.shift();
    if (this.at.length >= OVERLOAD_BLOCKS) {
      this.until = t + OVERLOAD_HOLD;
      this.kind = clip;
    }
  }

  /** How the voice was being cut off at time `t`, null when it is not being told. */
  now(t: number): Clip {
    return t < this.until ? this.kind : null;
  }

  clear(): void {
    this.at = [];
    this.until = -Infinity;
    this.kind = null;
  }
}

/** Readings this far under the voice's loud ones are taken for the guide heard in a rest, or a
 * note not sung, not the voice. */
const BELOW = 20;

/** A note counts once this many readings of the voice are on it (about an eighth of a second). */
export const MIN_READINGS = 6;

/** A line's rise is worked out from 3 notes at least, spanning a fourth at least. */
const MIN_NOTES = 3;
const MIN_SPAN = 500;

/** A rise this small either way is even. */
export const EVEN = 4;

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const quantile = (sorted: readonly number[], q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;

/** The level the voice has been singing at: the median of the last `secs` of its readings, those
 * far under its loud ones left out; null before any. */
export class LevelRef {
  private xs: { t: number; db: number }[] = [];
  constructor(readonly secs = 10) {}

  push(t: number, db: number): void {
    if (!Number.isFinite(db)) return;
    this.xs.push({ t, db });
    let k = 0;
    while (k < this.xs.length && this.xs[k]!.t < t - this.secs) k++;
    if (k) this.xs.splice(0, k);
  }

  value(): number | null {
    if (!this.xs.length) return null;
    const s = this.xs.map((x) => x.db).sort((a, b) => a - b);
    const floor = quantile(s, 0.9) - BELOW;
    return median(s.filter((v) => v >= floor));
  }

  clear(): void {
    this.xs = [];
  }
}

/** A note of a line as sung: its pitch (cents from Sa, as written), the level of the voice on it
 * (dB), how many readings that is from, and whether the microphone overloaded on it. */
export interface NoteLevel {
  cents: number;
  db: number;
  n: number;
  clip: boolean;
}

/** The notes of one line as they are sung, each note's readings together (a note sung twice in
 * the line is one note). */
export class LineLevels {
  private by = new Map<number, { dbs: number[]; clip: boolean }>();

  add(cents: number, db: number, clip: boolean): void {
    if (!Number.isFinite(db)) return;
    let x = this.by.get(cents);
    if (!x) this.by.set(cents, (x = { dbs: [], clip: false }));
    if (x.dbs.length < 2000) x.dbs.push(db);
    if (clip) x.clip = true;
  }

  /** Each note sung enough, low to high: the median of its readings, those far under the line's
   * loud ones left out. */
  levels(): NoteLevel[] {
    const all = [...this.by.values()].flatMap((x) => x.dbs).sort((a, b) => a - b);
    if (!all.length) return [];
    const floor = quantile(all, 0.9) - BELOW;
    const out: NoteLevel[] = [];
    for (const [cents, x] of this.by) {
      const v = x.dbs.filter((d) => d >= floor);
      if (v.length >= MIN_READINGS) out.push({ cents, db: median(v), n: v.length, clip: x.clip });
    }
    return out.sort((a, b) => a.cents - b.cents);
  }
}

/** The line's own level, that each note is shown against: the mean of its notes' (each note
 * once, so a long note does not count for more). */
export function lineLevel(levels: readonly NoteLevel[]): number | null {
  return levels.length ? levels.reduce((s, x) => s + x.db, 0) / levels.length : null;
}

/** How much louder the line got for each octave up, dB (the least-squares slope across its
 * notes, each note once); null with fewer than 3 notes or less than a fourth between them. */
export function risePerOctave(levels: readonly NoteLevel[]): number | null {
  if (levels.length < MIN_NOTES) return null;
  const xs = levels.map((x) => x.cents / 1200);
  if (Math.max(...levels.map((x) => x.cents)) - Math.min(...levels.map((x) => x.cents)) < MIN_SPAN) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = levels.reduce((s, x) => s + x.db, 0) / levels.length;
  let sxy = 0;
  let sxx = 0;
  levels.forEach((l, i) => {
    sxy += (xs[i]! - mx) * (l.db - my);
    sxx += (xs[i]! - mx) ** 2;
  });
  return sxy / sxx;
}

/** A line's rise in words: even within EVEN dB an octave, else louder or softer going up. */
export function riseWord(rise: number | null): string {
  if (rise == null) return '';
  return Math.abs(rise) <= EVEN ? 'Even' : rise > 0 ? 'Louder going up' : 'Softer going up';
}

/** A line's rise as a number: "+8 dB an octave", "−5 dB an octave", "0 dB an octave". */
export function riseText(rise: number): string {
  const n = Math.round(rise);
  return (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0') + ' dB an octave';
}

/** The edges between the voice line's thicknesses, dB against the level the voice has been
 * singing at: thinnest under −6, then −2, as usual to +2, then +6, thickest beyond. */
const WIDTH_EDGES = [-6, -2, 2, 6];
/** A thickness holds until the level is this far past the next one's edge, so it does not
 * flicker on an edge. */
const HOLD = 1;

/** The voice line's thickness, 0 (softest) to 4 (loudest; 2 as usual), for a level `d` dB against
 * the level the voice has been singing at, given the thickness before (null: none). */
export function widthStep(d: number, prev: number | null): number {
  let s = WIDTH_EDGES.filter((e) => d >= e).length;
  if (prev != null) {
    if (s > prev && d < WIDTH_EDGES[prev]! + HOLD) s = prev;
    else if (s < prev && d >= WIDTH_EDGES[prev - 1]! - HOLD) s = prev;
  }
  return s;
}

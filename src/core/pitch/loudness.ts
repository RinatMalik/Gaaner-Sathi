/**
 * How loud the voice sings (Rinat, 2026-11-04: "I automatically take it as higher pitches comes
 * with louder volume"), shown on an upright gauge (Rinat's pick of eight designs, 2026-11-04: "go
 * with 2 but use green instead of gold. you can also show mic limit in number 2"): its middle is
 * the level the voice has been singing at (the last 10 s), louder above, softer below, so nothing
 * is set up and moving about between phrases does not matter. Its needle is steadied over about a
 * third of a second, its zones (just right, a little, too) hold a decibel past their edges, and a
 * line marks where the microphone cuts the voice off, from how far its loudest moments stand above
 * its level. The voice line is drawn thicker when louder than the voice has been singing. Levels
 * are dB of full scale, from each reading's root mean square (the browser's automatic gain is
 * off, src/audio/mic.ts). Pure: tested in Node.
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

  /** How the voice was being cut off at time `t`, null when it is not being told, or with no time
   * (no reading since the microphone opened: stopped, or just going on after a pause). */
  now(t: number): Clip {
    return Number.isFinite(t) && t < this.until ? this.kind : null;
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

/** A zone of the gauge, or a thickness of the voice line, holds until the level is this far past
 * its edge, so it does not flicker on an edge. */
const HOLD = 1;

/** The level the loudness gauge's middle stands for, dB of full scale (Rinat, 2026-11-05: with
 * the middle the level of the last 10 s, "if I am being too loud for ten or more seconds, it
 * becomes the norm … maybe a fixed range of db? That would also help me understand if I am too
 * far or too close to the mic"): where a voice is set to sit on average when it is recorded,
 * leaving room above it for its loudest moments (a desk's 0 VU, −18 dB of full scale). Until
 * 2026-11-05 the middle was the voice's own level over the last 10 s (`LevelRef`), which the
 * voice line's thickness still follows. */
export const GAUGE_MIDDLE = -18;

/** The loudness gauge's reach either way, dB against its middle: beyond it the needle stays at
 * the end (−30 to −6 dB of full scale). */
export const GAUGE_REACH = 12;

/** Where the gauge's needle (or the microphone's limit) sits for `d` dB against its middle,
 * percent from the top: louder above the middle. */
export const gaugeY = (d: number): number => 50 - (Math.max(-GAUGE_REACH, Math.min(GAUGE_REACH, d)) / GAUGE_REACH) * 50;

/** The gauge's zones, softest first: within 3 dB of its middle just right, to 6 dB a little soft
 * or loud, beyond that too soft or too loud. */
export type LoudZone = 'soft2' | 'soft1' | 'ok' | 'loud1' | 'loud2';
export const ZONES: readonly LoudZone[] = ['soft2', 'soft1', 'ok', 'loud1', 'loud2'];
/** The edge above each zone but the last, dB. */
export const ZONE_EDGES = [-6, -3, 3, 6];
export const ZONE_WORD: Readonly<Record<LoudZone, string>> = { soft2: 'Too soft', soft1: 'A little soft', ok: 'Just right', loud1: 'A little loud', loud2: 'Too loud' };

/** The gauge's zone for a level `d` dB against its middle (±3 dB itself just right), given the
 * zone before (null: none): a zone holds until the level is a decibel past its edge, so the word
 * does not flicker on an edge. */
export function loudZone(d: number, prev: LoudZone | null): LoudZone {
  let s = ZONE_EDGES.filter((e) => (e < 0 ? d >= e : d > e)).length;
  if (prev) {
    const p = ZONES.indexOf(prev);
    if (s > p && d < ZONE_EDGES[p]! + HOLD) s = p;
    else if (s < p && d > ZONE_EDGES[p - 1]! - HOLD) s = p;
  }
  return ZONES[s]!;
}

/** The gauge's level, steadied (the pitch gauge before it "moves too quickly for me to take that
 * as feedback"): eased towards each reading over about `tau` seconds, started afresh after half a
 * second without the voice. */
export class GaugeLevel {
  private v: number | null = null;
  private t = -Infinity;
  constructor(readonly tau = 0.35) {}

  push(t: number, db: number): number {
    if (!Number.isFinite(db)) return this.v ?? db;
    if (this.v == null || t - this.t > 0.5) this.v = db;
    else this.v += (1 - Math.exp(-Math.max(0, t - this.t) / this.tau)) * (db - this.v);
    this.t = t;
    return this.v;
  }

  value(): number | null {
    return this.v;
  }

  clear(): void {
    this.v = null;
    this.t = -Infinity;
  }
}

/** Where the microphone cuts the voice off, dB against a level `ref` dB of full scale (the
 * gauge's middle): the voice's loudest moments stand `crest` dB above its level (the median of
 * the last 10 s), so they reach full scale once its level is −`crest` dB of full scale. Null
 * when that is above the gauge's reach (plenty of room). */
export function micLimit(ref: number, crest: number): number | null {
  const d = -crest - ref;
  return d > GAUGE_REACH ? null : d;
}

/** How strongly the loudness panel is tinted, 0 to 1, red when loud and blue when soft (Rinat,
 * 2026-11-05: "if it is to loud, the background colour of the panel will go progressively red to
 * bright red. and blue when its to flat"), for a level `d` dB against the gauge's middle in
 * `zone`: none while just right; from a tenth at the zone's edge (3 dB) to all of it at the
 * gauge's end (12 dB). */
export function loudTint(d: number, zone: LoudZone): { hot: boolean; k: number } | null {
  if (zone === 'ok') return null;
  return { hot: zone === 'loud1' || zone === 'loud2', k: Math.max(0.1, Math.min(1, (Math.abs(d) - 3) / (GAUGE_REACH - 3))) };
}

/** The edges between the voice line's thicknesses, dB against the level the voice has been
 * singing at: thinnest under −6, then −2, as usual to +2, then +6, thickest beyond. */
const WIDTH_EDGES = [-6, -2, 2, 6];

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

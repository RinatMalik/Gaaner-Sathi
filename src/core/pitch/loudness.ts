/**
 * How loud the voice sings (Rinat, 2026-11-04: "I automatically take it as higher pitches comes
 * with louder volume"), shown on an upright gauge (Rinat's pick of eight designs, 2026-11-04: "go
 * with 2 but use green instead of gold. you can also show mic limit in number 2"): how near the
 * voice's loudest moments come to the most the microphone's input can carry, as the ring round the
 * Gain knob on an audio interface shows it (Rinat, 2026-11-05: with the gauge on the voice's
 * average, "if i increase the gain enough to have the app show just right, it is too high for
 * scarlett"), louder above, softer below. Its needle rises quickly and falls slowly, as a peak
 * meter's does; its zones (just right, a little, too) hold a decibel past their edges; its top is
 * where the microphone cuts the voice off. Levels are dB of full scale (the browser's automatic
 * gain is off, src/audio/mic.ts). Pure: tested in Node.
 */

/** A reading's level (its root mean square) or its loudest sample, 0 to 1, in dB of full scale
 * (−Infinity for silence). */
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

/** A zone of the gauge holds until the level is this far past its edge, so it does not flicker on
 * an edge. */
const HOLD = 1;

/** Where the voice's loudest moments are best kept, dB of full scale, the loudness gauge's middle:
 * a usual aim when recording a voice (peaks about −12, under −6), leaving room for a louder note
 * before the microphone cuts it off (Rinat, 2026-11-05: "maybe a fixed range of db? That would
 * also help me understand if I am too far or too close to the mic"). Against the loudest moments,
 * as the ring round an audio interface's Gain knob is, from round fifty-six: in round fifty-five
 * the middle was −18 dB of full scale for the voice's average, and a voice's loudest moments
 * stand about 16 dB over its average (Rinat's takes of 25–27 Oct: 9 dB within 43 ms, and its loud
 * notes 5 to 7 dB over its usual), so green on the gauge was red on the ring; before that, the
 * middle was the voice's own average over the last 10 s. */
export const GAUGE_MIDDLE = -12;

/** The loudness gauge's reach either way, dB against its middle (−24 to 0 dB of full scale): its
 * top is the most the microphone's input can carry, where it cuts the voice off. */
export const GAUGE_REACH = 12;

/** Where the gauge's needle sits for `d` dB against its middle, percent from the top: louder above
 * the middle. */
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

/** The gauge's needle on the voice's loudest moments, as a peak meter's: it rises to a louder
 * reading over about `rise` seconds and falls `fall` dB a second (a peak programme meter falls 24
 * dB in about 3 s), so it shows how near the loudest of the last moments came to the top, and it
 * moves no more than the needle on the average did (the pitch gauge before it "moves too quickly
 * for me to take that as feedback"); started afresh after half a second without the voice. */
export class GaugeLevel {
  private v: number | null = null;
  private t = -Infinity;
  constructor(readonly rise = 0.05, readonly fall = 8) {}

  push(t: number, db: number): number {
    if (!Number.isFinite(db)) return this.v ?? db;
    const dt = Math.max(0, t - this.t);
    if (this.v == null || dt > 0.5) this.v = db;
    else if (db > this.v) this.v += (1 - Math.exp(-dt / this.rise)) * (db - this.v);
    else this.v = Math.max(db, this.v - this.fall * dt);
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

/** How strongly the loudness panel is tinted, 0 to 1, red when loud and blue when soft (Rinat,
 * 2026-11-05: "if it is to loud, the background colour of the panel will go progressively red to
 * bright red. and blue when its to flat"), for a level `d` dB against the gauge's middle in
 * `zone`: none while just right; from a tenth at the zone's edge (3 dB) to all of it at the
 * gauge's end (12 dB). */
export function loudTint(d: number, zone: LoudZone): { hot: boolean; k: number } | null {
  if (zone === 'ok') return null;
  return { hot: zone === 'loud1' || zone === 'loud2', k: Math.max(0.1, Math.min(1, (Math.abs(d) - 3) / (GAUGE_REACH - 3))) };
}

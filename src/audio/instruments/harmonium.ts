/**
 * The harmonium guide and drone (docs/ENGINE.md → Harmonium, Drones). Reed sets as on a
 * real 1-, 2- or 3-reed harmonium: bass (an octave down), male (as written), female (an
 * octave up). Each reed is a few cents off the others, the way real reeds are, which gives
 * the slow beating that makes a harmonium sound full. Gains even out loudness across sets.
 */
import type { Engine } from '../engine';
import type { Session } from '../session';

/** [frequency ratio, detune in cents, level, pan] per reed. */
export type Reed = readonly [number, number, number, number];
export interface ReedSet {
  gain: number;
  /** Lowpass cutoff (Hz) and low-shelf boost (dB) of the melody chain. */
  lp: number;
  warm: number;
  reeds: readonly Reed[];
}

export const REED_SETS: Record<1 | 2 | 3, ReedSet> = {
  1: { gain: 0.72, lp: 3300, warm: 0, reeds: [[1, 0, 1, 0]] },
  2: { gain: 1, lp: 3800, warm: 2.5, reeds: [[1, -2, 0.78, -0.12], [0.5, 2.5, 0.62, 0.12]] },
  3: { gain: 0.89, lp: 4000, warm: 2.5, reeds: [[0.5, 0, 0.55, -0.2], [1, -2.5, 0.66, 0], [1, 3.5, 0.3, 0.08], [2, 4, 0.2, 0.22]] },
};
export const reedSet = (reeds: number): ReedSet => REED_SETS[reeds as 1 | 2 | 3] || REED_SETS[3];

/** One guide note: 28 ms attack, settles to 82 %, releases 25 ms before the note ends, with a
 * time constant of `release` seconds (a key let go; longer for the last note of a song). */
export function reed(E: Engine, sess: Session, set: ReedSet, t: number, dur: number, freq: number, vel: number, release = 0.04): void {
  const ctx = E.ctx;
  const g = ctx.createGain();
  const v = vel * set.gain;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.028);
  g.gain.setTargetAtTime(v * 0.82, t + 0.03, 0.12);
  const off = t + Math.max(0.06, dur - 0.025);
  g.gain.setTargetAtTime(0, off, release);
  g.connect(sess.mel);
  const stopAt = off + Math.max(0.35, release * 8);
  for (const [ratio, cents, amp, pan] of set.reeds) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(E.reed);
    o.frequency.value = freq * ratio;
    o.detune.value = cents;
    const og = ctx.createGain();
    og.gain.value = amp;
    o.connect(og);
    if (pan && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = pan;
      og.connect(pn);
      pn.connect(g);
    } else og.connect(g);
    o.start(t);
    o.stop(stopAt);
  }
}

/** Retune the melody chain's tone when the number of reeds changes mid-play. */
export function applyReedTone(E: Engine, sess: Session | null, set: ReedSet): void {
  if (!sess) return;
  const now = E.ctx.currentTime;
  sess.lp.frequency.setTargetAtTime(set.lp, now, 0.05);
  sess.warm.gain.setTargetAtTime(set.warm, now, 0.05);
}

/** The harmonium drone: Sa an octave down, lower Pa and Sa, fading in over 1.2 s. */
export function startDrone(E: Engine, sess: Session, saHz: number): void {
  const ctx = E.ctx;
  const now = ctx.currentTime;
  const sa = saHz;
  [[0.5, 0.5], [0.7492, 0.34], [1, 0.26]].forEach(([r, a]) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(E.reed);
    o.frequency.value = sa * r!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(a!, now + 1.2);
    o.connect(g);
    g.connect(sess.dr);
    o.start(now);
    sess.drone.push({ o, r: r! });
  });
}

/**
 * The tanpura (docs/ENGINE.md → Drones → Tanpura): four Karplus-Strong strings, the 1st
 * at lower Pa, Ma or Ni, the 2nd and 3rd at Sa (one detuned by +1.5 cents), the 4th at
 * kharaj Sa. Plucked in its own free rhythm, independent of the taal.
 */
import { ksPluck } from '../dsp/ksPluck';
import type { Engine } from '../engine';
import type { Session } from '../session';
import type { TanTune } from '../sound';

/** The 1st string, relative to Sa: lower-octave Pa, Ma or Ni. */
export const TAN_FIRST: Record<TanTune, number> = { P: 0.7492, M: 0.6674, N: 0.9439 };
/** Seconds after strings 1–4: a 2.7 s cycle. */
export const TAN_GAPS = [0.62, 0.36, 0.36, 1.36];

export interface TanString {
  buf: AudioBuffer;
  pan: number;
}

/** One string, rendered once per frequency and sample rate. */
export function tanString(E: Engine, freq: number): AudioBuffer {
  const key = freq.toFixed(2) + '@' + E.ctx.sampleRate;
  let b = E.tanCache.get(key);
  if (!b) {
    const data = ksPluck(freq, E.ctx.sampleRate, 5, E.rand);
    b = E.ctx.createBuffer(1, data.length, E.ctx.sampleRate);
    b.copyToChannel(data, 0);
    E.tanCache.set(key, b);
  }
  return b;
}

export function makeTanBufs(E: Engine, saHz: number, tune: TanTune): TanString[] {
  const sa = saHz;
  return [
    { buf: tanString(E, sa * (TAN_FIRST[tune] || TAN_FIRST.P)), pan: -0.25 },
    { buf: tanString(E, sa), pan: 0.1 },
    { buf: tanString(E, sa * 1.0009), pan: 0.2 },
    { buf: tanString(E, sa * 0.5), pan: -0.1 },
  ];
}

/** One pluck: the bridge's brightness sweeps down from 2600 to 900 Hz over 2.4 s. */
export function pluck(E: Engine, sess: Session, str: TanString, t: number): void {
  const ctx = E.ctx;
  const src = ctx.createBufferSource();
  src.buffer = str.buf;
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking';
  pk.Q.value = 2.5;
  pk.gain.value = 6;
  pk.frequency.setValueAtTime(2600, t);
  pk.frequency.exponentialRampToValueAtTime(900, t + 2.4);
  const g = ctx.createGain();
  g.gain.value = 0.55 * (0.92 + E.rand() * 0.12);
  src.connect(pk);
  pk.connect(g);
  if (ctx.createStereoPanner) {
    const pn = ctx.createStereoPanner();
    pn.pan.value = str.pan;
    g.connect(pn);
    pn.connect(sess.tb);
  } else g.connect(sess.tb);
  src.start(t);
  src.stop(t + str.buf.duration);
}

/**
 * One play-through's mixing graph (docs/ENGINE.md → Harmonium → Melody chain): the guide
 * melody chain, the rhythm bus, the tanpura bus and the harmonium-drone bus, each with a
 * reverb send. Made when playback starts and faded out when it stops.
 */
import { tablaPitch } from './dsp/pitch';
import type { Engine } from './engine';
import { reedSet } from './instruments/harmonium';
import type { TanString } from './instruments/tanpura';
import { beatLevel, droneLevels, guideLevel, type SoundSettings } from './sound';

export interface Session {
  out: GainNode;
  send: GainNode;
  /** Guide melody in: lowpass → low shelf → body peak → out. */
  mel: GainNode;
  lp: BiquadFilterNode;
  warm: BiquadFilterNode;
  /** Rhythm bus. */
  tab: GainNode;
  /** Harmonium drone bus. */
  dr: GainNode;
  /** Tanpura bus. */
  tb: GainNode;
  drone: { o: OscillatorNode; r: number }[];
  /** The dayan's pitch. */
  tf: number;
  tanBufs: TanString[] | null;
}

export function makeSession(E: Engine, sound: SoundSettings, saHz: number): Session {
  const ctx = E.ctx;
  const out = ctx.createGain();
  out.connect(E.master);
  const send = ctx.createGain();
  send.connect(E.verb);
  const mel = ctx.createGain();
  mel.gain.value = guideLevel(sound);
  const set = reedSet(sound.reeds);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = set.lp;
  lp.Q.value = 0.5;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowshelf';
  warm.frequency.value = 260;
  warm.gain.value = set.warm;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 850;
  body.gain.value = 3;
  body.Q.value = 0.8;
  mel.connect(lp);
  lp.connect(warm);
  warm.connect(body);
  body.connect(out);
  const ms = ctx.createGain();
  ms.gain.value = 0.22;
  body.connect(ms);
  ms.connect(send);
  const tab = ctx.createGain();
  tab.gain.value = beatLevel(sound);
  tab.connect(out);
  const ts = ctx.createGain();
  ts.gain.value = 0.1;
  tab.connect(ts);
  ts.connect(send);
  const dl = droneLevels(sound);
  const tb = ctx.createGain();
  tb.gain.value = dl.tan;
  tb.connect(out);
  const tbs = ctx.createGain();
  tbs.gain.value = 0.18;
  tb.connect(tbs);
  tbs.connect(send);
  const dr = ctx.createGain();
  dr.gain.value = dl.harm;
  const dlp = ctx.createBiquadFilter();
  dlp.type = 'lowpass';
  dlp.frequency.value = 1300;
  dr.connect(dlp);
  dlp.connect(out);
  const dsend = ctx.createGain();
  dsend.gain.value = 0.25;
  dlp.connect(dsend);
  dsend.connect(send);
  return { out, send, mel, lp, warm, tab, dr, tb, drone: [], tf: tablaPitch(saHz), tanBufs: null };
}

/** Fade the session out, then stop its drones and disconnect it. */
export function endSession(E: Engine, sess: Session, later: (fn: () => void, ms: number) => unknown = setTimeout): void {
  const t = E.ctx.currentTime;
  sess.out.gain.setTargetAtTime(0, t, 0.025);
  sess.send.gain.setTargetAtTime(0, t, 0.025);
  later(() => {
    sess.drone.forEach((d) => {
      try {
        d.o.stop();
      } catch {
        // already stopped
      }
    });
    try {
      sess.out.disconnect();
      sess.send.disconnect();
    } catch {
      // already disconnected
    }
  }, 450);
}

/**
 * The audio engine's shared parts (docs/ENGINE.md → Master): master gain → compressor →
 * output, a synthetic reverb, the free-reed waveform and a noise buffer. Works on a live
 * AudioContext or an OfflineAudioContext (measurement renders). Everything is ported from
 * the prototype in the same order of calls; tests compare the two call for call.
 */

export interface Engine {
  ctx: BaseAudioContext;
  master: GainNode;
  verb: ConvolverNode;
  reed: PeriodicWave;
  noise: AudioBuffer;
  /** Randomness for noise offsets, human timing and plucks; tests pass a seeded one. */
  rand: () => number;
  /** Rendered tanpura strings, by frequency and sample rate. */
  tanCache: Map<string, AudioBuffer>;
}

/** The free-reed spectrum: bright, every harmonic present, gently falling. */
export const REED_HARMONICS = [0, 1, 0.74, 0.58, 0.47, 0.39, 0.31, 0.26, 0.21, 0.17, 0.14, 0.12, 0.1, 0.085, 0.072, 0.06, 0.05, 0.042, 0.035, 0.029, 0.024, 0.02];

export function createEngine(ctx: BaseAudioContext, rand: () => number = Math.random): Engine {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(comp);
  comp.connect(ctx.destination);
  const len = Math.floor(ctx.sampleRate * 1.7);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3.4);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const vg = ctx.createGain();
  vg.gain.value = 0.55;
  conv.connect(vg);
  vg.connect(master);
  const real = new Float32Array(REED_HARMONICS.length);
  const imag = new Float32Array(REED_HARMONICS.length);
  REED_HARMONICS.forEach((v, i) => {
    imag[i] = v;
  });
  const reed = ctx.createPeriodicWave(real, imag);
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rand() * 2 - 1;
  return { ctx, master, verb: conv, reed, noise: nb, rand, tanCache: new Map() };
}

/** A live context for playback. Browsers start it only after a user gesture. */
export function createLiveContext(): AudioContext {
  const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AC = g.AudioContext || g.webkitAudioContext;
  if (!AC) throw new Error('This browser has no Web Audio support.');
  return new AC({ latencyHint: 'interactive' });
}

/** Glide a level to a new value (live controls while playing). */
export function liveGain(E: Engine, node: GainNode | null | undefined, v: number): void {
  if (node) node.gain.setTargetAtTime(v, E.ctx.currentTime, 0.03);
}

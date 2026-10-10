/**
 * Dev only: renders the same practice sessions through the prototype's engine (cut out of
 * reference/gaaner-sathi.html) and the port's, each in an OfflineAudioContext in the
 * browser's real Web Audio, and compares the audio sample by sample, with loudness figures.
 * Not part of the app build. Open /dev/render.html on the dev server (`npm run dev`).
 */
import { createEngine } from '../src/audio/engine';
import { DEFAULT_SOUND, type SoundSettings } from '../src/audio/sound';
import { Transport } from '../src/audio/transport';
import { EXERCISES } from '../src/core/exercises';
import { parseSong } from '../src/core/notation/parse';
import { taalInfo } from '../src/core/taal/taals';
import { proto, protoAudioWorld, protoRhythm } from '../tests/differential/prototype';
import { seeded } from '../tests/helpers';

const SR = 48000;
const ALL_LAYERS = { tabla: ['manjira', 'kartal', 'ghungroo', 'shaker'], dholak: ['manjira', 'kartal', 'ghungroo', 'shaker', 'tambourine'], kit: ['shaker', 'tambourine', 'claps', 'cowbell', 'congas', 'ride'] };
const ex = (id: string) => EXERCISES.find((e) => e.id === id)!.text;

interface Case {
  name: string;
  text: string;
  taal: string;
  tempo: number;
  sound: Partial<SoundSettings>;
  secs: number;
  seed: number;
}
const CASES: Case[] = [
  { name: 'Dadra · tabla · 3 reeds · tanpura', text: ex('ex-alankar-bn'), taal: 'dadra', tempo: 110, sound: { droneVol: 0.5 }, secs: 10, seed: 1 },
  { name: 'Keherwa · drums with every layer · double speed', text: ex('ex-scale'), taal: 'keherwa', tempo: 96, sound: { beat: 'kit', speed: 'double', layers: ALL_LAYERS }, secs: 10, seed: 2 },
  { name: 'Rupak · dholak with every layer · harmonium drone · 2 reeds', text: ex('ex-rupak'), taal: 'rupak', tempo: 120, sound: { beat: 'dholak', layers: ALL_LAYERS, droneType: 'harmonium', droneVol: 0.6, reeds: 2 }, secs: 10, seed: 3 },
  { name: 'Keherwa · click · 1 reed · soft guide', text: ex('ex-leaps'), taal: 'keherwa', tempo: 90, sound: { beat: 'click', reeds: 1, guide: 'soft' }, secs: 8, seed: 4 },
  { name: 'Tabla with every layer, guide off', text: ex('ex-alankar-4'), taal: 'keherwa', tempo: 120, sound: { guide: 'off', layers: ALL_LAYERS }, secs: 8, seed: 5 },
];

/** The offline context with a clock we move ourselves, so both engines schedule as if playing. */
function timed(off: OfflineAudioContext) {
  let now = 0;
  const ctx = new Proxy(off, {
    get(target, prop) {
      if (prop === 'currentTime') return now;
      if (prop === 'state') return 'running';
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  return { ctx: ctx as OfflineAudioContext, setNow: (t: number) => (now = t) };
}
const settings = (c: Case): SoundSettings => structuredClone({ ...DEFAULT_SOUND, ...c.sound });
const song = (c: Case) => ({ tempo: c.tempo, saKey: 0, saOct: 4, startOn: 1 });

async function renderPrototype(c: Case): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, SR * c.secs, SR);
  const { ctx, setNow } = timed(off);
  const realRandom = Math.random;
  Math.random = seeded(c.seed);
  try {
    const els: Record<string, Record<string, unknown>> = { '#fromLine': { value: '0' }, '#toLine': { value: '0' }, '#loopChk': { checked: false } };
    const W = protoAudioWorld({
      window: { AudioContext: function () { return ctx; } }, prefs: settings(c) as unknown as Record<string, unknown>, current: song(c),
      parsed: proto.parseSong(c.text), taal: protoRhythm.taalInfo(c.taal), $: (sel) => els[sel], setTimeout: () => 0,
    });
    W.play!(0);
    for (let i = 1; i * 0.025 <= c.secs; i++) {
      setNow(i * 0.025);
      W.tick!();
    }
  } finally {
    Math.random = realRandom;
  }
  return off.startRendering();
}

async function renderPort(c: Case): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, SR * c.secs, SR);
  const { ctx, setNow } = timed(off);
  const T = new Transport(createEngine(ctx, seeded(c.seed)), () => 0);
  T.start({ parsed: parseSong(c.text), taal: taalInfo(c.taal), song: song(c), sound: settings(c) }, { from: 0, to: 0, loop: false });
  for (let i = 1; i * 0.025 <= c.secs; i++) {
    setNow(i * 0.025);
    T.tick();
  }
  return off.startRendering();
}

function maxDiff(a: AudioBuffer, b: AudioBuffer): number {
  let m = 0;
  for (let ch = 0; ch < a.numberOfChannels; ch++) {
    const x = a.getChannelData(ch);
    const y = b.getChannelData(ch);
    for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]! - y[i]!));
  }
  return m;
}
function loudness(a: AudioBuffer) {
  let sum = 0;
  let peak = 0;
  for (let ch = 0; ch < a.numberOfChannels; ch++) {
    for (const v of a.getChannelData(ch)) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
  }
  const db = (v: number) => Math.round(20 * Math.log10(v) * 10) / 10;
  return { rmsDb: db(Math.sqrt(sum / (a.length * a.numberOfChannels))), peakDb: db(peak) };
}

async function main() {
  const out = document.getElementById('out')!;
  const results = [];
  for (const c of CASES) {
    const a = await renderPrototype(c);
    const control = await renderPrototype(c); // the prototype again, same inputs: Chrome's own run-to-run variation
    const b = await renderPort(c);
    results.push({ name: c.name, seconds: c.secs, portVsPrototype: maxDiff(a, b), prototypeVsItself: maxDiff(a, control), ...loudness(a) });
    out.textContent = JSON.stringify(results, null, 2) + '\n\nRendering…';
  }
  out.textContent = JSON.stringify(results, null, 2);
  document.title = 'Audio check: done';
}
main().catch((e: unknown) => {
  document.getElementById('out')!.textContent = 'Failed: ' + String(e instanceof Error ? e.stack : e);
  document.title = 'Audio check: failed';
});

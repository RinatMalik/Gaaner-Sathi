/**
 * Dev only: renders the same practice sessions through the prototype's engine (cut out of
 * reference/gaaner-sathi.html) and the port's, each in an OfflineAudioContext in the
 * browser's real Web Audio, and compares the audio sample by sample, with loudness figures.
 * Then renders the taals the prototype never had, through the port alone: their loudness in
 * each rhythm style, and which beats of the tabla's theka start silent. Then the end of a song,
 * with the port's gentle ending and with the prototype's short one.
 * Not part of the app build. Open /dev/render.html on the dev server (`npm run dev`).
 */
import { createEngine } from '../src/audio/engine';
import { DEFAULT_SOUND, type SoundSettings } from '../src/audio/sound';
import { Transport } from '../src/audio/transport';
import { EXERCISES } from '../src/core/exercises';
import { parseSong } from '../src/core/notation/parse';
import { TAAL_GROUPS, taalInfo } from '../src/core/taal/taals';
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
  T.endFade = 0; // the prototype's ending, to compare like with like
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

// ── Taals added after the prototype (2026-10-10) ─────────────────────────────

const NEW_TAALS = TAAL_GROUPS.slice(1).flatMap((g) => g.ids);

/** One cycle of a taal's rhythm alone (no guide or drone, no count-in or fill) at 80 matras
 * a minute, starting 0.12 s in. Returns the audio and when each matra starts. */
async function renderRhythm(id: string, beat: SoundSettings['beat']): Promise<{ buf: AudioBuffer; starts: number[] }> {
  const T0 = taalInfo(id);
  const spb = 60 / 80;
  const secs = 0.12 + T0.cycle * spb + 1;
  const off = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
  const { ctx, setNow } = timed(off);
  const T = new Transport(createEngine(ctx, seeded(7)), () => 0);
  const sound: SoundSettings = structuredClone({ ...DEFAULT_SOUND, beat, guide: 'off', countIn: false, fills: false });
  const text = Array(T0.cycle * 2).fill('সা').join(' ');
  T.start({ parsed: parseSong(text), taal: T0, song: { tempo: 80, saKey: 0, saOct: 4, startOn: 1 }, sound }, { from: 0, to: 0, loop: false });
  for (let i = 1; i * 0.025 <= secs; i++) {
    setNow(i * 0.025);
    T.tick();
  }
  return { buf: await off.startRendering(), starts: Array.from({ length: T0.cycle }, (_, k) => 0.12 + k * spb) };
}

/** The loudest sample in the first 50 ms of each matra, in dB below the loudest of them. */
function onsets(buf: AudioBuffer, starts: number[]): number[] {
  const peaks = starts.map((t) => {
    let m = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const x = buf.getChannelData(ch);
      for (let i = Math.round(t * SR); i < Math.round((t + 0.05) * SR); i++) m = Math.max(m, Math.abs(x[i]!));
    }
    return m;
  });
  const top = Math.max(...peaks);
  return peaks.map((p) => Math.round(20 * Math.log10(p / top) * 10) / 10);
}

async function newTaals(show: (r: unknown) => void) {
  const rows = [];
  for (const id of NEW_TAALS) {
    const tabla = await renderRhythm(id, 'tabla');
    const on = onsets(tabla.buf, tabla.starts);
    // A rest leaves only the last stroke's tail (below −24 dB); light strokes (Te, Ka) sit near −16 dB.
    const row: Record<string, unknown> = { taal: id, tabla: loudness(tabla.buf), silentBeats: on.flatMap((d, k) => (d < -24 ? [k + 1] : [])), onsetDb: on };
    for (const st of ['dholak', 'kit'] as const) row[st] = loudness((await renderRhythm(id, st)).buf);
    rows.push(row);
    show(rows);
  }
  // For comparison, three of the prototype's taals: Keherwa's Ti and Ektal's TiRaKiTa are light strokes too.
  for (const id of ['dadra', 'keherwa', 'ektal']) {
    const ref = await renderRhythm(id, 'tabla');
    rows.push({ taal: id + ' (the prototype’s)', tabla: loudness(ref.buf), onsetDb: onsets(ref.buf, ref.starts) });
    show(rows);
  }
}

// ── The end of a song (2026-10-11): the last note and the tail fade over a quarter second, ──
// ── and so does a note followed by silence ──

/** RMS level (dB) of the 10 ms from time t. */
function levelAt(buf: AudioBuffer, t: number): number {
  let sum = 0;
  let n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const x = buf.getChannelData(ch);
    for (let i = Math.round(t * SR); i < Math.round((t + 0.01) * SR) && i < x.length; i++) {
      sum += x[i]! * x[i]!;
      n++;
    }
  }
  return 10 * Math.log10(sum / Math.max(1, n) + 1e-20);
}
/** How long after `from` the level first falls `drop` dB below its level just before. */
function fallMs(buf: AudioBuffer, from: number, drop: number): number {
  const ref = levelAt(buf, from - 0.06);
  for (let t = from; t < buf.duration - 0.01; t += 0.005) if (levelAt(buf, t) < ref - drop) return Math.round((t - from) * 1000);
  return -1;
}

/** "S R G M | P D N S" in Keherwa at 120, no count-in, played to its end as the app does
 * (stopping when the transport says the end has come): the guide alone, then with a
 * tanpura. The last note lets go at 4.095 s; the end comes 1.3 s after the song, at 5.42 s.
 * With "S R G x | …", Ga lets go at 1.595 s into a beat of silence (Pa comes at 2.12 s). */
async function renderEnding(endFade: number, droneVol: number, song = 'S R G M | P D N S\n'): Promise<AudioBuffer> {
  const secs = 6.2;
  const off = new OfflineAudioContext(2, SR * secs, SR);
  const { ctx, setNow } = timed(off);
  const T = new Transport(createEngine(ctx, seeded(9)), () => 0);
  T.endFade = endFade;
  const sound: SoundSettings = structuredClone({ ...DEFAULT_SOUND, beat: 'off', countIn: false, droneVol });
  T.start({ parsed: parseSong(song), taal: taalInfo('keherwa'), song: { tempo: 120, saKey: 0, saOct: 4, startOn: 1 }, sound }, { from: 0, to: 0, loop: false });
  for (let i = 1; i * 0.025 <= secs; i++) {
    setNow(i * 0.025);
    if (T.endAt && i * 0.025 >= T.endAt) T.stop();
    else T.tick();
  }
  return off.startRendering();
}

async function ending() {
  const rows = [];
  for (const endFade of [0.25, 0]) {
    const note = await renderEnding(endFade, 0);
    const tan = await renderEnding(endFade, 0.6);
    const hush = await renderEnding(endFade, 0, 'S R G x | P D N S\n');
    rows.push({
      ending: endFade ? 'gentle (the app now)' : 'short (the prototype)',
      lastNoteFalls20dBInMs: fallMs(note, 4.095, 20),
      lastNoteFalls40dBInMs: fallMs(note, 4.095, 40),
      tanpuraFalls20dBInMs: endFade ? fallMs(tan, 5.42 - endFade, 20) : fallMs(tan, 5.42, 20),
      tanpuraFalls40dBInMs: endFade ? fallMs(tan, 5.42 - endFade, 40) : fallMs(tan, 5.42, 40),
      noteBeforeSilenceFalls20dBInMs: fallMs(hush, 1.595, 20),
    });
  }
  return rows;
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
  const first = JSON.stringify(results, null, 2) + '\n\nTaals added since (port only):\n';
  await newTaals((rows) => (out.textContent = first + JSON.stringify(rows, null, 1) + '\n\nRendering…'));
  const ends = await ending();
  out.textContent = out.textContent!.replace(/\n\nRendering…$/, '') + '\n\nThe end of a song:\n' + JSON.stringify(ends, null, 1);
  document.title = 'Audio check: done';
}
main().catch((e: unknown) => {
  document.getElementById('out')!.textContent = 'Failed: ' + String(e instanceof Error ? e.stack : e);
  document.title = 'Audio check: failed';
});

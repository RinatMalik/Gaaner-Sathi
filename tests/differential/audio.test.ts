// The port's sound side against the prototype's own code, call for call: both drive a
// RecordingContext with the same random numbers, and the recordings must be identical.
// Covers whole practice sessions (every taal, rhythm style, speed, layers, fills, count-in,
// loops, guide modes, tempo trainer, drones, pickups, held notes), every percussion lane,
// the closing strokes and the live controls.
import { describe, expect, it, vi } from 'vitest';
import { saFreq } from '../../src/audio/dsp/pitch';
import { createEngine } from '../../src/audio/engine';
import { reed, reedSet } from '../../src/audio/instruments/harmonium';
import { finalHit, playHit, stroke } from '../../src/audio/instruments/percussion';
import { makeSession } from '../../src/audio/session';
import { DEFAULT_SOUND, type SoundSettings } from '../../src/audio/sound';
import { Transport, type PlaySource } from '../../src/audio/transport';
import { EXERCISES } from '../../src/core/exercises';
import { parseSong } from '../../src/core/notation/parse';
import type { Hit, Lane } from '../../src/core/taal/rhythm';
import { taalInfo } from '../../src/core/taal/taals';
import { seeded } from '../helpers';
import { randomSong } from './generate';
import { proto, protoAudioWorld, protoRhythm } from './prototype';
import { firstDifference, RecordingContext, type Entry } from './webaudio-recorder';

interface Scenario {
  name: string;
  text: string;
  taal: string;
  tempo?: number;
  saKey?: number;
  saOct?: number;
  startOn?: number;
  sound?: Partial<SoundSettings>;
  from?: number;
  to?: number;
  loop?: boolean;
  /** How long to run, in seconds of audio-clock time. */
  secs: number;
  /** Changes made while playing: at `at` seconds, on both sides. */
  live?: { at: number; sound?: Partial<SoundSettings>; song?: { saKey?: number; saOct?: number; tempo?: number }; apply: ('guide' | 'beat' | 'drone' | 'reeds' | 'retune' | 'tanpura')[] };
  seed: number;
}

const ex = (id: string) => EXERCISES.find((e) => e.id === id)!.text;
const ALL_LAYERS = { tabla: ['manjira', 'kartal', 'ghungroo', 'shaker'], dholak: ['manjira', 'kartal', 'ghungroo', 'shaker', 'tambourine'], kit: ['shaker', 'tambourine', 'claps', 'cowbell', 'congas', 'ride'] };
const TEENTAAL = 'সা রা গা মা | পা ধা না র্সা | র্সা না ধা পা | মা গা রা সা\n> সা রে গা মা | পা ধা নি সা | সা নি ধা পা | মা গা রে সা\nসা -া -া -া | -া -া -া -া | সা রা গা -া | মা -া -া -া\n';
const JHAPTAL = 'সা রা | গা মা পা | ধা না | র্সা না ধা\nপা মা | গা -া রা | সা -া | -া -া -া\n';
const EKTAL = "S R | G M | P D | N S' | S' N | D P\nM G | R S | S - | - - | x S | R S\n";
const HELD = 'সা রা গা -া | -া -া মা -া\n-া পা -া ধা | না -া র্সা -া\n> a b c d | e f g h\nপা -া মা -া | গা -া রা -া\n';

const SCENARIOS: Scenario[] = [
  { name: 'dadra exercise, defaults, to the end', text: ex('ex-alankar-bn'), taal: 'dadra', tempo: 110, secs: 40, seed: 1 },
  { name: 'dadra with tanpura (1st string Ma)', text: ex('ex-alankar-bn'), taal: 'dadra', tempo: 110, sound: { droneVol: 0.6, tanTune: 'M' }, secs: 12, seed: 2 },
  { name: 'keherwa, dholak with layers, double speed', text: ex('ex-scale'), taal: 'keherwa', tempo: 96, sound: { beat: 'dholak', speed: 'double', layers: ALL_LAYERS }, secs: 30, seed: 3 },
  { name: 'keherwa, drums with every layer, half speed, loop, call and response, tempo trainer', text: ex('ex-alankar-4'), taal: 'keherwa', tempo: 120,
    sound: { beat: 'kit', speed: 'half', layers: ALL_LAYERS, guideLoop: 'alt', ramp: true, rampStep: 10, rampMax: 140 }, from: 0, to: 1, loop: true, secs: 30, seed: 4 },
  { name: 'rupak, click, no count-in, 1 reed, soft guide', text: ex('ex-rupak'), taal: 'rupak', tempo: 120, sound: { beat: 'click', countIn: false, reeds: 1, guide: 'soft' }, secs: 40, seed: 5 },
  { name: 'teentaal, tabla with every layer, harmonium drone, 2 reeds', text: TEENTAAL, taal: 'teentaal', tempo: 140, sound: { layers: ALL_LAYERS, droneType: 'harmonium', droneVol: 0.5, reeds: 2 }, secs: 35, seed: 6 },
  { name: 'jhaptal, dholak, no fills', text: JHAPTAL, taal: 'jhaptal', tempo: 100, sound: { beat: 'dholak', fills: false }, secs: 30, seed: 7 },
  { name: 'ektal, drums, loop with the guide on the first round only', text: EKTAL, taal: 'ektal', tempo: 160, sound: { beat: 'kit', guideLoop: 'first' }, from: 0, to: 1, loop: true, secs: 30, seed: 8 },
  { name: 'pickup: starts on beat 4 of dadra', text: 'সা রা গা | মা -া -া | পা -া -া\n', taal: 'dadra', startOn: 4, tempo: 90, secs: 20, seed: 9 },
  { name: 'from line 2, a held note carried in, loop to line 3', text: HELD, taal: 'keherwa', tempo: 100, from: 1, to: 2, loop: true, sound: { guideLoop: 'all' }, secs: 25, seed: 10 },
  { name: 'rhythm off, guide off, tanpura (1st string Ni)', text: ex('ex-leaps'), taal: 'keherwa', tempo: 90, sound: { beat: 'off', guide: 'off', droneVol: 1, tanTune: 'N' }, secs: 15, seed: 11 },
  { name: 'Sa Re Ga typing example, fast', text: ex('ex-alankar-lat'), taal: 'dadra', tempo: 200, secs: 20, seed: 12 },
  { name: 'generated song with rests, holds and errors', text: randomSong(seeded(99)) + '\nS R G M | P D N S\n', taal: 'keherwa', tempo: 100, secs: 25, seed: 13 },
  { name: 'low Sa (G3): tabla pitch folds up; ends off sam', text: 'S R G M P\n', taal: 'keherwa', tempo: 80, saKey: 7, saOct: 3, sound: { droneVol: 0.4 }, secs: 15, seed: 14 },
  { name: 'high Sa, ends on sam with a final stroke', text: 'S R G M | P D N S\n', taal: 'keherwa', tempo: 120, saKey: 2, saOct: 5, sound: { beat: 'dholak' }, secs: 15, seed: 15 },
  { name: 'live changes while playing: reeds, guide, rhythm, drone, Sa, tanpura tuning', text: ex('ex-alankar-4'), taal: 'keherwa', tempo: 120,
    sound: { droneVol: 0.5 }, from: 0, to: 2, loop: true, secs: 14, seed: 16,
    live: { at: 4, sound: { reeds: 1, guide: 'soft', tablaVol: 0.3, droneVol: 0.8, tanTune: 'M', beat: 'kit' }, song: { saKey: 5, tempo: 132 }, apply: ['reeds', 'guide', 'beat', 'drone', 'retune', 'tanpura'] } },
];

function settings(sc: Scenario): SoundSettings {
  return structuredClone({ ...DEFAULT_SOUND, ...sc.sound });
}
function songOf(sc: Scenario) {
  return { tempo: sc.tempo ?? 100, saKey: sc.saKey ?? 0, saOct: sc.saOct ?? 4, startOn: sc.startOn ?? 1 };
}

/** Advance the clock in 25 ms steps, ticking each time, until `secs` or the song's end. */
function drive(rec: RecordingContext, secs: number, tick: () => void, ended: () => boolean, onTime?: (now: number) => void) {
  for (let i = 1; i * 0.025 <= secs; i++) {
    rec.currentTime = i * 0.025;
    onTime?.(rec.currentTime);
    tick();
    if (ended()) break;
  }
}

function runPrototype(sc: Scenario): { log: Entry[]; queue: unknown[] } {
  const rec = new RecordingContext();
  const spy = vi.spyOn(Math, 'random').mockImplementation(seeded(sc.seed));
  try {
    const prefs = settings(sc) as unknown as Record<string, unknown>;
    const current = songOf(sc) as Record<string, unknown>;
    const els: Record<string, Record<string, unknown>> = {
      '#fromLine': { value: String(sc.from ?? 0) }, '#toLine': { value: String(sc.to ?? 0) }, '#loopChk': { checked: !!sc.loop },
    };
    const later: (() => void)[] = [];
    const W = protoAudioWorld({
      window: { AudioContext: function () { return rec; } }, prefs, current, parsed: proto.parseSong(sc.text), taal: protoRhythm.taalInfo(sc.taal),
      $: (sel) => els[sel], setTimeout: (fn) => later.push(fn),
    });
    W.play!(sc.from ?? 0);
    let applied = false;
    drive(rec, sc.secs, () => W.tick!(), () => !!W.S.endAt, (now) => {
      if (!sc.live || applied || now < sc.live.at) return;
      applied = true;
      Object.assign(prefs, structuredClone(sc.live.sound ?? {}));
      Object.assign(current, sc.live.song ?? {});
      for (const a of sc.live.apply) {
        if (a === 'reeds') W.applyReedTone!(W.S.sess);
        if (a === 'guide') W.liveGain!(W.S.sess.mel, W.guideLevel!());
        if (a === 'beat') W.liveGain!(W.S.sess.tab, W.beatLevel!());
        if (a === 'drone') W.applyDrone!();
        if (a === 'retune') W.retune!();
        if (a === 'tanpura') W.S.sess.tanBufs = null;
      }
    });
    const queue = W.S.queue.slice();
    W.stop!(true);
    later.forEach((fn) => fn());
    return { log: rec.log, queue };
  } finally {
    spy.mockRestore();
  }
}

function runPort(sc: Scenario): { log: Entry[]; queue: unknown[] } {
  const rec = new RecordingContext();
  const later: (() => void)[] = [];
  const E = createEngine(rec as unknown as BaseAudioContext, seeded(sc.seed));
  const T = new Transport(E, (fn) => later.push(fn));
  const src: PlaySource = { parsed: parseSong(sc.text), taal: taalInfo(sc.taal), song: songOf(sc), sound: settings(sc) };
  T.start(src, { from: sc.from ?? 0, to: sc.to ?? 0, loop: !!sc.loop });
  let applied = false;
  drive(rec, sc.secs, () => T.tick(), () => !!T.endAt, (now) => {
    if (!sc.live || applied || now < sc.live.at) return;
    applied = true;
    Object.assign(src.sound, structuredClone(sc.live.sound ?? {}));
    Object.assign(src.song, sc.live.song ?? {});
    for (const a of sc.live.apply) {
      if (a === 'reeds') T.applyReeds();
      if (a === 'guide') T.applyGuide();
      if (a === 'beat') T.applyBeatLevel();
      if (a === 'drone') T.applyDrone();
      if (a === 'retune') T.retune();
      if (a === 'tanpura') T.resetTanpura();
    }
  });
  const queue = T.queue.slice();
  T.stop();
  later.forEach((fn) => fn());
  return { log: rec.log, queue };
}

describe('the sound side matches the prototype, call for call', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const a = runPrototype(sc);
      const b = runPort(sc);
      expect(a.log.length).toBeGreaterThan(100);
      expect(firstDifference(a.log, b.log)).toBeNull();
      expect(b.queue).toEqual(a.queue);
    });
  }

  it('every percussion lane, both click levels, every bol and every closing stroke', () => {
    const lanes: Lane[] = ['bol', 'click', 'k', 's', 'h', 'o', 'tH', 'tM', 'tL', 'b', 'c', 't', 'mo', 'mc', 'sh', 'ka', 'gh', 'ghS', 'tb', 'tbS', 'cl', 'cb', 'cgM', 'cgS', 'cgO', 'cgL', 'rd', 'rdB'];
    const hits: Hit[] = [
      ...lanes.map((lane, i) => ({ pos: 0, lane, vel: 0.5 + i / 100, bol: 'Dha', lvl: 2 })),
      { pos: 0, lane: 'click', vel: 1, lvl: 1 }, { pos: 0, lane: 'click', vel: 1, lvl: 0 },
    ];
    const bols = ['Dha', 'Dhin', 'Dhi', 'Na', 'Ta', 'Tin', 'Ti', 'Te', 'Ra', 'Ge', 'Ke', 'Ka', 'Ki', 'Kat', 'Tu', 'Tun', 'unknown'];
    const styles = ['tabla', 'dholak', 'kit', 'click', 'off'];

    const recA = new RecordingContext();
    const spy = vi.spyOn(Math, 'random').mockImplementation(seeded(42));
    try {
      const prefs = structuredClone(DEFAULT_SOUND) as unknown as Record<string, unknown>;
      const W = protoAudioWorld({
        window: { AudioContext: function () { return recA; } }, prefs, current: { tempo: 100, saKey: 0, saOct: 4, startOn: 1 },
        parsed: proto.parseSong(''), taal: protoRhythm.taalInfo('dadra'), $: () => undefined, setTimeout: () => 0,
      });
      W.ensureAudio!();
      const sess = W.makeSession!();
      hits.forEach((h, i) => W.playHit!(sess, h, 1 + i * 0.1));
      bols.forEach((bol, i) => W.stroke!(sess, 5 + i * 0.1, bol, 0.9));
      styles.forEach((st, i) => {
        prefs.beat = st; // the prototype's finalHit reads the style from its settings
        W.finalHit!(sess, 8 + i * 0.1);
      });
      W.reed!(sess, 9, 0.5, 261.63, 0.32);
    } finally {
      spy.mockRestore();
    }

    const recB = new RecordingContext();
    const E = createEngine(recB as unknown as BaseAudioContext, seeded(42));
    const sess = makeSession(E, structuredClone(DEFAULT_SOUND), saFreq({ saKey: 0, saOct: 4 }));
    hits.forEach((h, i) => playHit(E, sess, h, 1 + i * 0.1));
    bols.forEach((bol, i) => stroke(E, sess, 5 + i * 0.1, bol, 0.9));
    styles.forEach((st, i) => finalHit(E, sess, 8 + i * 0.1, st));
    reed(E, sess, reedSet(3), 9, 0.5, 261.63, 0.32);

    expect(recA.log.length).toBeGreaterThan(1000);
    expect(firstDifference(recA.log, recB.log)).toBeNull();
  });
});

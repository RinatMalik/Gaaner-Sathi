/**
 * The film's soundtrack (dev only): the app's own instruments, rendered in an OfflineAudioContext
 * as dev/render.ts renders its checks, on the clock of score.ts. Nothing here is recorded or
 * sampled. Runs of the app's Transport through one engine, each as the app would play it:
 *   the tanpura, from the film's first second to its last;
 *   the guide alone, playing the first line a note to a matra as each is typed;
 *   the song, harmonium and rhythm, from the sam where Play is pressed to the closing stroke, its
 *     rhythm and reeds changed on the deck as it goes (score.ts → CHANGES), as a singer would;
 * and, the film's arrangement round it, made of the same instruments:
 *   the bass, the harmonium a line below (score.ts → BASS_TEXT);
 *   the tabla again under the drums for the taan and the close;
 *   the harmonium drone under the name at the end;
 *   single strokes of the app's own drums where the picture cuts: a dholak under the typing, the
 *     tabla rising to Play, a crash on each change, toms into the taan.
 */
import { createEngine, type Engine } from '../../src/audio/engine';
import { saFreq } from '../../src/audio/dsp/pitch';
import { crash, playHit, stroke } from '../../src/audio/instruments/percussion';
import { makeSession, type Session } from '../../src/audio/session';
import { DEFAULT_SOUND, type SoundSettings } from '../../src/audio/sound';
import { Transport, type PlaySource } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { GROOVES, type Lane } from '../../src/core/taal/rhythm';
import { taalInfo } from '../../src/core/taal/taals';
import { seeded } from '../../tests/helpers';
import { AT, at, BASS_TEXT, CHANGES, DURATION, LAYERS, LINES, lineAt, PLAY_LAG, SA, SA_BASS, SONG_TEXT, SPEED, START_BEAT, START_REEDS, TAAL, TEMPO } from './score';

const SR = 48000;

/** The offline context with a clock we move ourselves (dev/render.ts). */
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

const sound = (over: Partial<SoundSettings>): SoundSettings =>
  structuredClone({ ...DEFAULT_SOUND, countIn: false, droneVol: 0, speed: SPEED, layers: LAYERS, ...over });
const source = (text: string, over: Partial<SoundSettings>, sa: { saKey: number; saOct: 2 | 3 | 4 | 5 } = SA): PlaySource => ({
  parsed: parseSong(text),
  taal: taalInfo(TAAL),
  song: { tempo: TEMPO, ...sa, startOn: 1 },
  sound: sound(over),
});

interface Run {
  T: Transport;
  /** When Play is pressed: the first beat sounds PLAY_LAG later. */
  press: number;
  src: PlaySource;
  opts: { from: number; to: number; loop: boolean };
  started: boolean;
}

export interface Soundtrack {
  wav: Uint8Array;
  stats: Record<string, unknown>;
}

function wavStereo(l: Float32Array, r: Float32Array, rate: number, gain: number): Uint8Array {
  const data = l.length * 4;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const text = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + data, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, data, true);
  const pcm = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * gain * 32767)));
  for (let i = 0; i < l.length; i++) {
    v.setInt16(44 + i * 4, pcm(l[i]!), true);
    v.setInt16(46 + i * 4, pcm(r[i]!), true);
  }
  return new Uint8Array(buf);
}

/** Single strokes of the app's own percussion, at matras: what the film adds where it cuts. */
function accents(E: Engine, A: Session): [number, () => void][] {
  const out: [number, () => void][] = [];
  const hit = (m: number, lane: Lane, vel: number) => out.push([m, () => playHit(E, A, { pos: 0, lane, vel }, at(m))]);
  const bol = (m: number, b: string, vel: number) => out.push([m, () => stroke(E, A, at(m), b, vel)]);
  const boom = (m: number, vel: number) => out.push([m, () => crash(E, A, at(m), vel)]);

  // Under the typing: Keherwa on the dholak, softly, as it goes at normal speed, and a shaker.
  const g = GROOVES.dholak.keherwa;
  for (const [c, k] of [[0, 0.5], [8, 0.62]] as const) {
    for (const lane of ['b', 'c', 't'] as const) {
      const list = g[lane];
      if (!list || list === 'all') continue;
      for (const [x, vel] of list) if (c + x - 1 < 12) hit(c + x - 1, lane, vel * k);
    }
  }
  for (let m = 0; m < 12; m += 0.5) hit(m, 'sh', m % 1 ? 0.42 : 0.26);
  // The tabla rising to Play: Na and Tin in eighths, then Ti Ra Ki Ta, then two Dhas and a breath.
  for (let k = 0; k < 8; k++) bol(8 + k * 0.5, k % 2 ? 'Tin' : 'Na', 0.34 + k * 0.035);
  for (let k = 0; k < 12; k++) bol(12 + k * 0.25, ['Ti', 'Ra', 'Ki', 'Ta'][k % 4]!, 0.5 + k * 0.04);
  for (const m of [15, 15.5]) {
    bol(m, 'Dha', 1);
    hit(m, 'k', 0.9);
  }
  // The drop, and each change of rhythm
  boom(AT.play, 0.85);
  hit(AT.play, 'k', 1);
  boom(24, 0.45);
  boom(32, 0.7);
  hit(32, 'k', 0.9);
  // Into the antara: a crash, then only a shaker and a ghungroo under the voice.
  boom(AT.sing, 0.8);
  for (let m = AT.sing; m < AT.full; m += 0.5) hit(m, 'sh', m % 1 ? 0.36 : 0.22);
  for (const m of [AT.sing, AT.sing + 4]) hit(m, 'ghS', 0.5);
  boom(AT.full, 0.6);
  hit(AT.full, 'k', 0.95);
  // Toms into the taan
  const toms: Lane[] = ['tH', 'tH', 'tM', 'tM', 'tL', 'tL'];
  for (let k = 0; k < 2; k++) hit(62 + k * 0.5, toms[k]!, 0.6 + k * 0.05);
  for (let k = 0; k < 4; k++) hit(63 + k * 0.25, toms[k + 2]!, 0.7 + k * 0.07);
  for (let k = 0; k < 4; k++) hit(63 + k * 0.25, 's', 0.45 + k * 0.12);
  boom(AT.night, 1);
  hit(AT.night, 'k', 1);
  boom(AT.phone, 0.5);
  // The close: the song's own closing strokes are on this sam too (Transport → finalHit).
  hit(AT.end, 'b', 1);
  boom(AT.end, 0.7);
  return out.sort((a, b) => a[0] - b[0]);
}

export async function renderSoundtrack(): Promise<Soundtrack> {
  const off = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const { ctx, setNow } = timed(off);
  const E = createEngine(ctx, seeded(1113));
  const mk = (endFade = 0.25) => {
    const T = new Transport(E, () => 0);
    T.endFade = endFade;
    return T;
  };
  const rests = (n: number) => Array(n).fill('x').join(' ') + '\n';

  // The tanpura under everything: a song of rests, ending off the sam so that no stroke closes it.
  const drone: Run = {
    T: mk(1.2), press: at(AT.type) - PLAY_LAG, started: false, opts: { from: 0, to: 0, loop: false },
    src: source(rests(AT.out - 1), { guide: 'off', beat: 'off', fills: false, droneType: 'tanpura', droneVol: 0.6, tanTune: 'P' }),
  };
  // The first line, as it is typed: the guide alone.
  const typed: Run = {
    T: mk(), press: at(AT.type) - PLAY_LAG, started: false, opts: { from: 0, to: 0, loop: false },
    src: source(LINES[0]![0] + '\n', { beat: 'off', fills: false }),
  };
  // The song, once through, its rhythm changed as it goes.
  const song: Run = {
    T: mk(0.9), press: at(AT.play) - PLAY_LAG, started: false, opts: { from: 0, to: LINES.length - 1, loop: false },
    src: source(SONG_TEXT, { beat: START_BEAT, reeds: START_REEDS }),
  };
  // The bass, on the same clock.
  const bass: Run = {
    T: mk(2), press: at(AT.play) - PLAY_LAG, started: false, opts: { from: 0, to: 0, loop: false },
    src: source(BASS_TEXT, { beat: 'off', fills: false, reeds: 2, guideVol: 0.72 }, SA_BASS),
  };
  // The tabla under the drums from the taan to the close: the song from line 7, its guide silent.
  const tabla: Run = {
    T: mk(0.9), press: at(lineAt(6)) - PLAY_LAG, started: false, opts: { from: 6, to: 7, loop: false },
    src: source(SONG_TEXT, { guide: 'off', beat: 'tabla', tablaVol: 0.42, layers: { tabla: ['manjira'], dholak: [], kit: [] } }),
  };
  // The harmonium drone under the name: Sa, lower Pa and Sa, swelling in before the last sam.
  const hdrone: Run = {
    T: mk(1.4), press: at(AT.end - 4), started: false, opts: { from: 0, to: 0, loop: false },
    src: source(rests(AT.out - AT.end + 3), { guide: 'off', beat: 'off', fills: false, droneType: 'harmonium', droneVol: 0.55 }),
  };
  const runs = [drone, typed, song, bass, tabla, hdrone];

  const A = makeSession(E, sound({ beat: 'tabla' }), saFreq(SA));
  const hits = accents(E, A);
  let next = 0;
  // The deck's changes reach the song before the beat they start on is scheduled (160 ms ahead).
  const changes = CHANGES.map((c) => ({ ...c, t: at(c.m) - 0.25, done: false }));

  for (let i = 0; i * 0.025 <= DURATION; i++) {
    const t = i * 0.025;
    setNow(t);
    for (const c of changes) {
      if (c.done || c.t > t) continue;
      c.done = true;
      if (c.beat) {
        song.src.sound.beat = c.beat;
        song.T.applyBeatLevel();
      }
      if (c.reeds) {
        song.src.sound.reeds = c.reeds;
        song.T.applyReeds();
      }
    }
    while (next < hits.length && at(hits[next]![0]) < t + 0.2) hits[next++]![1]();
    for (const r of runs) {
      if (!r.started && r.press <= t + 1e-9) {
        setNow(Math.max(0, r.press));
        r.T.start(r.src, r.opts, Math.max(0, r.press));
        r.started = true;
        setNow(t);
      }
    }
    for (const r of runs) {
      if (!r.started || !r.T.playing) continue;
      if (r.T.endAt && t >= r.T.endAt) r.T.stop();
      else r.T.tick(t);
    }
  }
  const buf = await off.startRendering();
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);

  // ── What was rendered, measured (nobody building this can hear it) ──
  const db = (v: number) => Math.round(20 * Math.log10(Math.max(v, 1e-9)) * 10) / 10;
  const rms = (a: number, b: number) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, Math.round(a * SR)); k < Math.min(l.length, Math.round(b * SR)); k++) {
      s += l[k]! * l[k]! + r[k]! * r[k]!;
      n += 2;
    }
    return db(Math.sqrt(s / Math.max(1, n)));
  };
  let peak = 0;
  for (let k = 0; k < l.length; k++) peak = Math.max(peak, Math.abs(l[k]!), Math.abs(r[k]!));
  // The level in the 30 ms before each of these matras, and in the 30 ms from it: a stroke or a
  // note landing on the matra shows as a step up.
  const step = (m: number) => ({ matra: m, before: rms(at(m) - 0.035, at(m) - 0.005), from: rms(at(m), at(m) + 0.03) });
  const stats = {
    seconds: Math.round(buf.duration * 1000) / 1000,
    peakDb: db(peak),
    rmsDb: rms(0, buf.duration),
    byPart: {
      typing: rms(at(0), at(AT.words)),
      rising: rms(at(AT.words), at(AT.play)),
      lines: LINES.map((_, n) => rms(at(lineAt(n)), at(lineAt(n) + 8))),
      name: rms(at(AT.end), at(AT.out)),
      lastHalfSecond: rms(DURATION - 0.5, DURATION),
    },
    steps: [0, 1, 15, AT.play, 24, 32, AT.sing, AT.full, AT.night, AT.end].map(step),
  };
  // Left as rendered unless it would clip; the final loudness is set when the film is put together.
  const gain = peak > 0.97 ? 0.97 / peak : 1;
  return { wav: wavStereo(l, r, SR, gain), stats: { ...stats, gain: Math.round(gain * 1000) / 1000 } };
}

/** The file as base64, in pieces the capture script can ask for. */
function base64(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x6000) s += btoa(String.fromCharCode(...u8.subarray(i, i + 0x6000)));
  return s;
}

declare global {
  interface Window {
    soundtrack?: Promise<Record<string, unknown>>;
    soundtrackB64?: string;
  }
}

if (document.body.dataset.page === 'sound') {
  const out = document.getElementById('out')!;
  window.soundtrack = renderSoundtrack().then((s) => {
    window.soundtrackB64 = base64(s.wav);
    out.textContent = JSON.stringify(s.stats, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([s.wav as BlobPart], { type: 'audio/wav' }));
    a.download = 'torongini-film.wav';
    a.textContent = 'Save the soundtrack (WAV)';
    document.body.append(a);
    const player = document.createElement('audio');
    player.controls = true;
    player.src = a.href;
    document.body.append(document.createElement('br'), player);
    document.title = 'Soundtrack: done';
    return s.stats;
  });
  window.soundtrack.catch((e: unknown) => {
    out.textContent = 'Failed: ' + String(e instanceof Error ? e.stack : e);
    document.title = 'Soundtrack: failed';
  });
}

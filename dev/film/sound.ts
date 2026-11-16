/**
 * The film's soundtrack (dev only): the app's own instruments, rendered in an OfflineAudioContext
 * as dev/render.ts renders its checks, on the clock of score.ts. Three runs of the app's
 * Transport through one engine:
 *   the tanpura, from the film's first second to its last;
 *   the guide alone, playing the first line, a note to a matra, as each is typed;
 *   the song, harmonium and tabla, twice round from the sam where Play is pressed, with the
 *   closing stroke on the sam after it.
 * Nothing here is recorded or sampled: it is what the app would play.
 */
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND, type SoundSettings } from '../../src/audio/sound';
import { Transport, type PlaySource } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';
import { seeded } from '../../tests/helpers';
import { AT, at, DURATION, LINES, PLAY_LAG, SA, SONG_TEXT, TAAL, TEMPO } from './score';

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

const sound = (over: Partial<SoundSettings>): SoundSettings => structuredClone({ ...DEFAULT_SOUND, countIn: false, droneVol: 0, ...over });
const source = (text: string, over: Partial<SoundSettings>): PlaySource => ({
  parsed: parseSong(text),
  taal: taalInfo(TAAL),
  song: { tempo: TEMPO, ...SA, startOn: 1 },
  sound: sound(over),
});

interface Run {
  T: Transport;
  /** When Play is pressed: the first beat sounds PLAY_LAG later. */
  press: number;
  src: PlaySource;
  opts: { from: number; to: number; loop: boolean; rounds?: number };
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

export async function renderSoundtrack(): Promise<Soundtrack> {
  const off = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const { ctx, setNow } = timed(off);
  const E = createEngine(ctx, seeded(1113));
  const mk = () => new Transport(E, () => 0);

  // The tanpura under everything: a song of rests, ending off the sam so that no stroke closes it.
  const drone: Run = {
    T: mk(), press: at(AT.open) - PLAY_LAG, started: false, opts: { from: 0, to: 0, loop: false },
    src: source(Array(AT.out - 1).fill('x').join(' ') + '\n', { guide: 'off', beat: 'off', fills: false, droneType: 'tanpura', droneVol: 0.7, tanTune: 'P' }),
  };
  drone.T.endFade = 1.2;
  // The first line, as it is typed: the guide alone.
  const typed: Run = {
    T: mk(), press: at(AT.type1) - PLAY_LAG, started: false, opts: { from: 0, to: 0, loop: false },
    src: source(LINES[0]![0] + '\n', { beat: 'off', fills: false }),
  };
  // The song, twice round.
  const song: Run = {
    T: mk(), press: at(AT.play) - PLAY_LAG, started: false, opts: { from: 0, to: LINES.length - 1, loop: true, rounds: 2 },
    src: source(SONG_TEXT, {}),
  };
  const runs = [drone, typed, song];

  for (let i = 0; i * 0.025 <= DURATION; i++) {
    const t = i * 0.025;
    for (const r of runs) {
      if (!r.started && r.press <= t + 1e-9) {
        setNow(Math.max(0, r.press));
        r.T.start(r.src, r.opts, Math.max(0, r.press));
        r.started = true;
      }
    }
    setNow(t);
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
      nameTanpuraOnly: rms(at(1), at(AT.type1)),
      typing: rms(at(AT.type1), at(AT.play)),
      round1: rms(at(AT.play), at(AT.round2)),
      round2: rms(at(AT.round2), at(AT.end)),
      ending: rms(at(AT.end), at(AT.out)),
      lastHalfSecond: rms(DURATION - 0.5, DURATION),
    },
    byCycle: Array.from({ length: AT.out / 8 }, (_, c) => rms(at(c * 8), at(c * 8 + 8))),
    steps: [AT.type1, AT.type1 + 1, AT.type2, AT.play, AT.play + 8, AT.round2, AT.end].map(step),
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

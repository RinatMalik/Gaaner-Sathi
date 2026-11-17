/**
 * The film's stage (dev only: docs/ROADMAP.md → Phase 3 → The film).
 *
 * The picture is the app itself, not a drawing of it: the real app runs in a frame on a sheet of
 * paper, and a camera moves over it, from the whole window down to a single button. The stage
 * types the film's song into it, presses Play, changes the rhythm on the deck as the song goes,
 * turns on Check my pitch and full screen, and lets it play. Nothing in the film is real time:
 * `film.seek(t)` puts every part where it is at second t. The app's audio clock is the film's
 * clock (the app times its highlight from that clock alone: ENGINE.md → One clock), so the beat
 * lit in a frame is the beat the soundtrack sounds there; the app's own animations and transitions
 * are stepped on the same clock. The singer whose pitch the app draws is a voice made here, sung
 * into the app's own microphone path and read by its own pitch detector; it is not in the
 * soundtrack. dev/film/capture.mjs steps the seconds and photographs each frame.
 *
 * It writes a song and settings into the browser's storage for the app it films, so it runs only
 * where capture.mjs opens it: in a browser profile made for the render and thrown away after.
 */
import '../../src/app/fonts.css';
import './film.css';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo, type TaalId } from '../../src/core/taal/taals';
import { logoParts } from '../../src/app/logo';
import { shapeCorners, shapePath } from '../../src/app/lines';
import type { LogEntry } from '../../src/core/practice/log';
import { AT, at, CHANGES, DURATION, filmSong, LAYERS, LINES, lineAt, lineText, matra, PLAY_LAG, SA, SONG_ID, SONG_TEXT, SPB, START_BEAT, START_REEDS } from './score';

const W = 1920;
const H = 1080;
const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
/** Play's press, in matras: its first beat sounds on the sam. */
const PRESS = AT.play - PLAY_LAG / SPB;

// ── Easing ───────────────────────────────────────────────────────────────────────────────────
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
/** Slow, fast, slow. */
const io = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** Fast, then settling. */
const out = (u: number): number => 1 - Math.pow(1 - u, 3);
/** Very fast, then settling: a snap. */
const snap = (u: number): number => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
const linear = (u: number): number => u;
/** 0 until a, 1 from b, eased between. */
const ramp = (x: number, a: number, b: number, e: (u: number) => number = io): number => e(clamp01((x - a) / (b - a)));
/** There from a to b, coming and going over d. */
const pulse = (x: number, a: number, b: number, d = 0.6): number => Math.min(ramp(x, a, a + d, out), 1 - ramp(x, b - d, b, out));

// ── The app, in frames ───────────────────────────────────────────────────────────────────────
interface App {
  card: HTMLElement;
  frame: HTMLIFrameElement;
  win: Window & typeof globalThis;
  doc: Document;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The app the film follows; a view beside it in the wall of views; the phone. */
  role: 'main' | 'wall' | 'phone';
  /** A view that keeps the day's colours, or the night's, whatever the hour. */
  look?: 'day' | 'night';
}
interface Box { x: number; y: number; w: number; h: number }

/** The film's clock, seconds: what the app's AudioContext says the time is. */
const clock = { now: 0 };
const apps: App[] = [];
let night = false;

// ── The singer: a voice made here, for the app's microphone ──────────────────────────────────
/** A microphone node as the app makes one (src/audio/mic.ts → captureStream): the stage hands it
 * the voice's samples, a block at a time, as the film's clock passes them. */
class FilmMicNode {
  port: { onmessage: ((m: { data: { end: number; data: Float32Array } }) => void) | null; postMessage(): void } = { onmessage: null, postMessage() {} };
  readonly sr: number;
  readonly hop: number;
  fed: number;
  constructor(ctx: BaseAudioContext, _name: string, o: { processorOptions: { hop: number } }) {
    this.sr = ctx.sampleRate;
    this.hop = o.processorOptions.hop;
    this.fed = Math.round(clock.now * this.sr);
    micNodes.push(this);
  }
  connect(): void {}
  disconnect(): void {}
}
const micNodes: FilmMicNode[] = [];

const SA_HZ = 440 * 2 ** ((12 * (SA.saOct + 1) + SA.saKey - 69) / 12);
/** The song's notes, in song beats, at the pitch the guide names them (the singer sings as written). */
const NOTES = parseSong(SONG_TEXT).events
  .map((e) => ({ a: e.start, b: e.start + e.dur, hz: SA_HZ * 2 ** ((e.semi + 12 * e.oct) / 12) }))
  .sort((x, y) => x.a - y.a);
/** The singer comes this far behind the guide, seconds: as singers do. */
const VOICE_LAG = 0.045;
let vIdx = 0;
let vPhase = 0;
let vSeed = 7;
const vNoise = (): number => ((vSeed = (vSeed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

/** The voice at film time t: its pitch and loudness. It sings from the antara (AT.sing) to the end:
 * sliding into each note from the last, a vibrato on held notes, a breath at each line's end. */
function voiceAt(t: number): { hz: number; amp: number } {
  const beat = matra(t - VOICE_LAG) - AT.play;
  if (beat < AT.sing - AT.play || beat >= AT.end - AT.play) return { hz: 0, amp: 0 };
  while (vIdx > 0 && NOTES[vIdx]!.a > beat) vIdx--;
  while (vIdx < NOTES.length - 1 && NOTES[vIdx]!.b <= beat) vIdx++;
  const e = NOTES[vIdx];
  if (!e || beat < e.a || beat >= e.b) return { hz: 0, amp: 0 };
  const secs = (beat - e.a) * SPB;
  const left = (e.b - beat) * SPB;
  const prev = NOTES[vIdx - 1];
  const legato = !!prev && Math.abs(prev.b - e.a) < 1e-6 && Math.abs(e.a / 8 - Math.round(e.a / 8)) > 1e-6;
  const from = legato ? 1200 * Math.log2(prev.hz / e.hz) : -45;
  const tau = Math.min(0.03, (e.b - e.a) * SPB * 0.18);
  let cents = from * Math.exp(-secs / tau);
  cents += 18 * clamp01((secs - 0.2) / 0.25) * Math.sin(2 * Math.PI * 5.6 * t);
  cents += 4 * Math.sin(2 * Math.PI * 0.8 * t + e.a * 1.7);
  // Loud enough for the gauge's middle (src/core/pitch/loudness.ts → GAUGE_MIDDLE): Just right.
  let amp = 0.4 * (legato ? 1 : clamp01(secs / 0.025));
  if (Math.abs(e.b / 8 - Math.round(e.b / 8)) < 1e-6) amp *= clamp01(left / 0.12);
  return { hz: e.hz * 2 ** (cents / 1200), amp };
}

function voiceSample(t: number, sr: number): number {
  const v = voiceAt(t);
  if (!v.amp) return 0.0006 * vNoise();
  vPhase += (2 * Math.PI * v.hz) / sr;
  if (vPhase > 2 * Math.PI) vPhase -= 2 * Math.PI;
  const p = vPhase;
  return v.amp * 0.5 * (Math.sin(p) + 0.55 * Math.sin(2 * p) + 0.36 * Math.sin(3 * p) + 0.2 * Math.sin(4 * p) + 0.1 * Math.sin(5 * p) + 0.05 * Math.sin(6 * p)) + 0.004 * v.amp * vNoise();
}

/** Hand each microphone the voice up to film time t. */
function feedVoice(t: number): void {
  for (const n of micNodes) {
    const until = Math.round(t * n.sr);
    while (n.fed + n.hop <= until) {
      const d = new Float32Array(n.hop);
      for (let i = 0; i < n.hop; i++) d[i] = voiceSample((n.fed + i) / n.sr, n.sr);
      n.fed += n.hop;
      n.port.onmessage?.({ data: { end: n.fed, data: d } });
    }
  }
}

/** The app's AudioContext with the film's clock: the app schedules and shows beats by it. Its
 * microphone input is the film's singer. */
function filmClock(win: Window & typeof globalThis): void {
  const Real = win.AudioContext;
  const worklet = { addModule: async () => {} };
  const source = () => ({ connect() {}, disconnect() {} });
  win.AudioContext = function (opts?: AudioContextOptions) {
    const real = new Real(opts);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === 'currentTime') return clock.now;
        if (prop === 'state') return 'running';
        if (prop === 'outputLatency' || prop === 'baseLatency') return 0;
        if (prop === 'audioWorklet') return worklet;
        if (prop === 'createMediaStreamSource') return source;
        const v = Reflect.get(target, prop, target) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
  } as unknown as typeof AudioContext;
  (win as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = FilmMicNode;
  const track = { getSettings: () => ({ deviceId: 'film', latency: 0.02 }), label: 'Microphone', stop() {} };
  const md = win.navigator.mediaDevices;
  if (md) {
    md.getUserMedia = async () => ({ getAudioTracks: () => [track], getTracks: () => [track] }) as unknown as MediaStream;
    md.enumerateDevices = async () => [];
  }
}

function addApp(x: number, y: number, w: number, h: number, role: App['role'] = 'main', look?: App['look']): Promise<App> {
  const card = document.createElement('div');
  card.className = role === 'phone' ? 'card phone' : 'card';
  if (role !== 'main') card.style.visibility = 'hidden';
  Object.assign(card.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  const frame = document.createElement('iframe');
  frame.width = String(w);
  frame.height = String(h);
  frame.src = '/';
  card.append(frame);
  byId('world').append(card);
  return new Promise((ok) => {
    frame.addEventListener('load', () => {
      const win = frame.contentWindow as Window & typeof globalThis;
      // The camera decides what is in the picture: the app does not scroll itself about, and what
      // it does scroll (the Practice lines) jumps there, as a smooth scroll runs on the wall clock.
      win.Element.prototype.scrollIntoView = function () {};
      win.scrollTo = (() => {}) as typeof win.scrollTo;
      const scrollTo = win.Element.prototype.scrollTo as (this: Element, a?: ScrollToOptions | number, b?: number) => void;
      win.Element.prototype.scrollTo = function (this: Element, a?: ScrollToOptions | number, b?: number) {
        if (a && typeof a === 'object') return scrollTo.call(this, { ...a, behavior: 'instant' });
        return scrollTo.call(this, a, b);
      } as typeof win.Element.prototype.scrollTo;
      const st = win.document.createElement('style');
      st.textContent = '*{scroll-behavior:auto!important}';
      win.document.head.append(st);
      const app: App = { card, frame, win, doc: win.document, x, y, w, h, role, look };
      filmClock(win);
      theme(app);
      apps.push(app);
      void win.document.fonts.ready.then(() => ok(app));
    }, { once: true });
  });
}

/** A frame given a new size (the main app goes to 1440 × 900 for full screen). */
function resize(app: App, w: number, h: number): void {
  app.w = w;
  app.h = h;
  app.frame.width = String(w);
  app.frame.height = String(h);
  Object.assign(app.card.style, { width: w + 'px', height: h + 'px' });
}

/** Day or night, chosen with the app's own control (Notes, colours and font size → Colours). */
const theme = (app: App): void => app.doc.querySelector<HTMLElement>('#themeSeg [data-v="' + ((app.look ? app.look === 'night' : night) ? 'dark' : 'light') + '"]')?.click();
const q = <T extends HTMLElement = HTMLElement>(app: App, sel: string): T => {
  const el = app.doc.querySelector<T>(sel);
  if (!el) throw new Error('The film looked for ' + sel + ' in the app and did not find it.');
  return el;
};
const click = (app: App, sel: string): void => q(app, sel).click();
/** Where a part of the app is, in the world's own measure. */
function box(app: App, el: Element): Box {
  const r = el.getBoundingClientRect();
  return { x: app.x + r.left, y: app.y + r.top, w: r.width, h: r.height };
}
const boxOf = (app: App, sel: string): Box => box(app, q(app, sel));

/** The app's own animations and transitions, stepped on the film's clock: each is held from the
 * frame it starts in and moved on as the film's seconds pass, rather than the wall clock's. */
const animFrom = new WeakMap<Animation, number>();
function stepAnimations(app: App): void {
  for (const a of app.doc.getAnimations()) {
    let s = animFrom.get(a);
    if (s === undefined) {
      s = clock.now;
      animFrom.set(a, s);
      a.pause();
    }
    const ms = (clock.now - s) * 1000;
    const end = a.effect?.getComputedTiming().endTime;
    if (typeof end === 'number' && Number.isFinite(end) && ms >= end) a.finish();
    else a.currentTime = ms;
  }
}

// ── The camera ───────────────────────────────────────────────────────────────────────────────
/** What the picture shows: the world point at its middle, and how much of the world's width. */
interface Fr { cx: number; cy: number; w: number }
interface Shot {
  m0: number;
  m1: number;
  a: () => Fr;
  b?: () => Fr;
  ease?: (u: number) => number;
  /** Matras from its start that the framing follows the app's layout, frame by frame: for a shot
   * that starts as the app moves (a line opening as it becomes the current one). */
  track?: number;
}
/** Each shot's framing, worked out on its first frame (the app laid out for that moment). */
const framed = new Map<Shot, { a: Fr; b?: Fr }>();
let shots: Shot[] = [];
let cam: Fr = { cx: 0, cy: 0, w: W };

function camera(m: number): Fr {
  const s = shots.find((x) => m >= x.m0 && m < x.m1) ?? shots[shots.length - 1]!;
  let f = framed.get(s);
  if (!f || (s.track && m < s.m0 + s.track)) framed.set(s, (f = { a: s.a(), b: s.b?.() }));
  if (!f.b) return f.a;
  const u = (s.ease ?? io)(clamp01((m - s.m0) / (s.m1 - s.m0)));
  // The width goes by ratio, so a zoom is as fast at its end as at its start.
  return { cx: lerp(f.a.cx, f.b.cx, u), cy: lerp(f.a.cy, f.b.cy, u), w: Math.exp(lerp(Math.log(f.a.w), Math.log(f.b.w), u)) };
}
/** The picture leans in on the beat: on each note typed, and with the drums on every second
 * matra, more on each sam. */
function bump(m: number): number {
  const k = (n: number) => m - Math.floor(m / n) * n;
  if (m >= AT.type && m < AT.words) return 0.008 * Math.exp(-6 * k(1));
  const drums = (m >= AT.play && m < 40) || (m >= AT.full && m < AT.end);
  return drums ? 0.012 * Math.exp(-6 * k(2)) + 0.018 * Math.exp(-6 * k(8)) : 0;
}
/** A world point, on the picture. */
const onScreen = (x: number, y: number): [number, number] => [W / 2 + ((x - cam.cx) * W) / cam.w, H / 2 + ((y - cam.cy) * W) / cam.w];

// ── Typing ───────────────────────────────────────────────────────────────────────────────────
/** What the notation box holds from each matra on: the first line a note to a matra (each one
 * sounds as it lands: sound.ts), its words quickly, then the other seven lines, pasted. */
function typingScript(): [number, string][] {
  const snaps: [number, string][] = [[-1, '']];
  let text = '';
  const put = (m: number, s: string) => {
    text += s;
    snaps.push([m, text]);
  };
  let k = 0;
  LINES[0]![0].split(' ').forEach((tok, i) => {
    const m = AT.type + k;
    if (tok === '|') return put(m - 0.36, ' |');
    if (i > 0) put(m - 0.12, ' ');
    Array.from(tok).forEach((c, j) => put(m + j * 0.06, c));
    k++;
  });
  put(AT.words - 0.25, '\n> ');
  LINES[0]![1].split(' ').forEach((g, i) => put(AT.words + i * 0.36, (i ? ' ' : '') + g));
  for (let n = 1; n < LINES.length; n++) put(AT.paste + (n - 1) * 0.12, '\n' + lineText(n).trimEnd());
  put(AT.paste + 0.9, '\n');
  return snaps;
}
const script = typingScript();
let typedNow = '';

function type(app: App, m: number): void {
  let text = '';
  for (const [at0, s] of script) {
    if (at0 > m) break;
    text = s;
  }
  if (text === typedNow) return;
  typedNow = text;
  const ta = q<HTMLTextAreaElement>(app, '#notation');
  ta.value = text;
  ta.selectionStart = ta.selectionEnd = text.length;
  ta.dispatchEvent(new app.win.Event('input', { bubbles: true }));
}

/** The text cursor after the last letter typed: drawn by the film, as a real one blinks in real
 * time and a frame would catch it anywhere. */
function caret(app: App, on: boolean): void {
  const doc = app.doc;
  let bar = doc.getElementById('filmCaret');
  if (!on) {
    if (bar) bar.style.display = 'none';
    return;
  }
  const ta = q<HTMLTextAreaElement>(app, '#notation');
  let mirror = doc.getElementById('filmMirror');
  if (!mirror || !bar) {
    mirror = doc.createElement('div');
    mirror.id = 'filmMirror';
    bar = doc.createElement('div');
    bar.id = 'filmCaret';
    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box' });
    Object.assign(bar.style, { position: 'absolute', width: '2px', background: 'var(--ink)', pointerEvents: 'none', zIndex: '5' });
    doc.body.append(mirror, bar);
  }
  const cs = app.win.getComputedStyle(ta);
  const r = ta.getBoundingClientRect();
  Object.assign(mirror.style, {
    font: cs.font, letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, padding: cs.padding, tabSize: cs.tabSize,
    border: cs.borderTopWidth + ' solid transparent', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px',
  });
  mirror.textContent = ta.value;
  const mark = doc.createElement('span');
  mark.textContent = '​';
  mirror.append(mark);
  const p = mark.getBoundingClientRect();
  Object.assign(bar.style, { display: 'block', left: p.left + 1 + 'px', top: p.top + p.height * 0.12 + 'px', height: p.height * 0.76 + 'px' });
}

// ── What happens in the app, and when ────────────────────────────────────────────────────────
interface Cue { t: number; fn: () => unknown; done?: boolean }
const cues: Cue[] = [];
const cue = (t: number, fn: () => unknown): void => void cues.push({ t, fn });

// ── Words over the picture ───────────────────────────────────────────────────────────────────
/** [from, to, words, size]: matras. A word in *stars* is in brass. The words come in one after
 * another, a quarter of a matra apart. */
const CAPTIONS: readonly [number, number, string, ('big' | '')?][] = [
  [0.3, 7.7, 'Type your *swaralipi*.'],
  [8.2, 11.4, 'Words and all.'],
  [13.4, 16.4, 'Press play.'],
  [16.7, 19.9, 'Harmonium. Tabla. Tanpura.'],
  [20.2, 23.98, 'Tabla', 'big'],
  [23.98, 26, 'Dholak', 'big'],
  [26.2, 29.9, 'Manjira, ghungroo, kartal, *and more*.'],
  [30.2, 31.98, 'Dholak', 'big'],
  [31.98, 34, 'Drums', 'big'],
  [34.2, 39.9, 'Claps, congas, a shaker. *Any mix*.'],
  [48.3, 55.8, 'Sing, and *see* every note.'],
  [56.3, 63.8, 'Every line scored as you sing.'],
  [64.5, 71.8, 'Your songs. Your rewaz. Your *progress*.'],
  [72.3, 75.9, 'On a phone or a laptop.'],
  [76.1, 79.85, 'Nothing to install. *Nothing leaves your device.*'],
];
/** The taals shown while line 4 plays, a matra each: the song's own first. */
const MONTAGE: readonly TaalId[] = ['keherwa', 'dadra', 'rupak', 'jhaptal', 'ektal', 'teentaal', 'jhampak', 'shashthi'];
const TAALS_AT = 40;
const TAALS_CUT = AT.sing + 0.04;
/** The matras the wall of views is in the picture, and the phone. */
const WALL = [AT.night, AT.phone] as const;
const PHONE = [AT.phone, AT.end] as const;
/** Flashes of light on the two drops. */
const FLASHES = [AT.play, AT.night];

function buildWords(): void {
  byId('nameLogo').innerHTML = logoParts().svg;
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const id of MONTAGE) {
    const T = taalInfo(id);
    const cell = document.createElement('div');
    cell.className = 'tl';
    const size = Math.min(104, (360 - 10 * (T.vib.length - 1)) / T.vib.length);
    const kind = (mk: string | undefined) => (mk === 'X' ? 'v-sam' : mk === '0' ? 'v-khali' : 'v-tali');
    cell.innerHTML = '<div class="tg">' + T.vib.map((n, k) => {
      const d = shapePath(n);
      const dots = shapeCorners(n).map((p, j) => '<circle class="tfv" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (T.starts[k]! + j === 0 ? 3.2 : 2.5) + '" data-p="' + (T.starts[k]! + j) + '"/>').join('');
      return '<svg class="tfs ' + kind(T.marks[k]) + '" style="width:' + size + 'px" viewBox="' + (n === 2 ? '-3 3 30 18' : '-3 -3 30 30') + '" data-k="' + k + '"><path class="tff" d="' + d + '"/><path class="tfo" d="' + d + '"/><path class="tfp" d="' + d + '" pathLength="1" stroke-dasharray="0 2"/>' + dots + '</svg>';
    }).join('') + '</div><b>' + T.bn + '</b><span>' + T.name + ' · ' + T.cycle + '</span>';
    grid.append(cell);
  }
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = 'Nineteen taals, Tagore’s own among them.';
  byId('taals').append(grid, line);
}

/** The words of a caption, each in its own box so it can come in by itself. */
function captionHTML(text: string): string {
  const marked = text.replace(/\*([^*]+)\*/g, (_, s: string) => s.split(' ').map((w) => '<b>' + w + '</b>').join(' '));
  return marked.split(' ').map((w) => '<span class="w">' + w + '</span>').join(' ');
}

// ── The cursor ───────────────────────────────────────────────────────────────────────────────
/** Where it comes from on the picture, what it goes to in the app, when it presses (matras). */
const CURSOR: readonly { m0: number; m1: number; from: [number, number]; to: string; press: number; ring: number }[] = [
  { m0: 13.6, m1: 17.2, from: [1560, 1020], to: '#playBtn', press: PRESS, ring: 560 },
  { m0: 21.4, m1: 25.2, from: [1700, 1000], to: '#beatSel', press: 23.83, ring: 240 },
  { m0: 30.3, m1: 33.2, from: [1700, 1000], to: '#beatSel', press: 31.83, ring: 240 },
];

// ── A frame ──────────────────────────────────────────────────────────────────────────────────
let main!: App;
let phone: App | null = null;
const seen: { t: number; line: number; note: string }[] = [];
let lastSeen = '';
let capKey = '';

function draw(m: number): void {
  const end = m >= AT.end - 0.02;
  // Night for the second half, day again for the name.
  document.documentElement.toggleAttribute('data-night', m >= AT.night && !end);
  // The camera, over the world
  cam = camera(m);
  cam = { ...cam, w: cam.w * (1 - bump(m)) };
  const s = W / cam.w;
  const world = byId('world');
  world.style.transform = 'translate(' + (W / 2 - cam.cx * s) + 'px,' + (H / 2 - cam.cy * s) + 'px) scale(' + s + ')';
  world.style.visibility = end ? 'hidden' : 'visible';
  for (const a of apps) {
    if (a.role === 'wall') a.card.style.visibility = m >= WALL[0] && m < WALL[1] ? 'visible' : 'hidden';
    if (a.role === 'phone') a.card.style.visibility = m >= PHONE[0] && m < PHONE[1] ? 'visible' : 'hidden';
  }

  // A flash of light on the drops
  const fl = FLASHES.find((f) => m >= f - 0.02 && m < f + 1);
  byId('flash').style.opacity = fl === undefined ? '0' : String(0.6 * (1 - ramp(m, fl, fl + 1, out)));

  // The taals, a matra each, over the app hidden; gone at a cut on the antara's sam, a moment
  // after it, when the app has the new line in its place
  const tOn = m < TAALS_CUT ? ramp(m, TAALS_AT - 0.12, TAALS_AT + 0.08, out) : 0;
  byId('shade').style.opacity = String(tOn);
  const taals = byId('taals');
  taals.style.opacity = String(tOn);
  taals.querySelectorAll<HTMLElement>('.tl').forEach((cell, i) => {
    const m0 = TAALS_AT + i * 0.94;
    const u = ramp(m, m0 - 0.04, m0 + 0.2, out);
    cell.style.opacity = String(u);
    cell.style.transform = 'translateY(' + (1 - u) * 30 + 'px) scale(' + lerp(0.86, 1, u) + ')';
    cell.classList.toggle('now', m >= m0 && m < m0 + 0.94);
    const T = taalInfo(MONTAGE[i]!);
    const pos = ramp(m, m0, m0 + 0.8, linear) * T.cycle;
    cell.querySelectorAll<SVGSVGElement>('svg').forEach((sv) => {
      const k = Number(sv.dataset.k);
      const f = clamp01((pos - T.starts[k]!) / T.vib[k]!);
      sv.querySelector('.tfp')!.setAttribute('stroke-dasharray', f + ' 2');
      (sv.querySelector('.tff') as SVGElement).style.fillOpacity = String(0.28 * ramp(pos, T.starts[k]! + T.vib[k]! - 0.01, T.starts[k]! + T.vib[k]! + 0.6));
      sv.querySelectorAll<SVGElement>('.tfv').forEach((c) => c.classList.toggle('done', Number(c.dataset.p) <= pos - 0.01 && pos > 0));
    });
  });
  const tl = taals.querySelector<HTMLElement>('.line')!;
  const lu = ramp(m, 45.3, 45.8, out);
  tl.style.opacity = String(lu);
  tl.style.transform = 'translateY(' + (1 - lu) * 24 + 'px)';

  // The words at the foot, a word at a time
  const cap = CAPTIONS.find(([a, b]) => m >= a && m < b);
  const capEl = byId('caption');
  if (cap) {
    const span = capEl.firstElementChild as HTMLElement;
    const key = cap[0] + cap[2];
    if (capKey !== key) {
      capKey = key;
      span.className = 'cap' + (cap[3] ? ' ' + cap[3] : '');
      span.innerHTML = captionHTML(cap[2]);
    }
    const gone = 1 - ramp(m, cap[1] - 0.3, cap[1], out);
    capEl.style.opacity = String(Math.min(1, ramp(m, cap[0] - 0.02, cap[0] + 0.2, out) * 4) * (cap[3] ? 1 : gone));
    span.querySelectorAll<HTMLElement>('.w').forEach((w, i) => {
      const u = ramp(m, cap[0] + i * 0.25, cap[0] + i * 0.25 + 0.45, snap);
      w.style.opacity = String(u);
      w.style.transform = 'translateY(' + (1 - u) * 34 + 'px)' + (cap[3] ? ' scale(' + lerp(1.12, 1, u) + ')' : '');
    });
  } else capEl.style.opacity = '0';

  // The name, on the closing sam, with the tagline and the address
  const name = byId('name');
  name.style.opacity = String(end ? ramp(m, AT.end - 0.02, AT.end + 0.12, out) : 0);
  byId('nameLogo').style.transform = 'scale(' + lerp(1.14, 1, ramp(m, AT.end, AT.end + 0.7, snap)) * lerp(1.012, 1, ramp(m, AT.end + 0.7, AT.out, linear)) + ')';
  const tg = ramp(m, AT.end + 1.5, AT.end + 2.2, out);
  byId('nameTag').style.opacity = String(tg);
  byId('nameTag').style.transform = 'translateY(' + (1 - tg) * 20 + 'px)';
  const ur = ramp(m, AT.end + 3, AT.end + 3.7, out);
  byId('nameUrl').style.opacity = String(ur);
  byId('nameUrl').style.transform = 'translateY(' + (1 - ur) * 20 + 'px)';

  // The cursor: to a control in the app, and a press on it
  const cur = byId('cursor');
  const ring = byId('ring');
  const c = CURSOR.find((x) => m >= x.m0 && m < x.m1);
  if (c) {
    const p = boxOf(main, c.to);
    const [tx, ty] = onScreen(p.x + p.w * 0.56, p.y + p.h * 0.6);
    const g = ramp(m, c.m0, c.press - 0.35, io);
    const x = lerp(c.from[0], tx, g);
    const y = lerp(c.from[1], ty, g) - Math.sin(g * Math.PI) * 50;
    const press = pulse(m, c.press - 0.25, c.press + 0.25, 0.2);
    cur.style.opacity = String(Math.min(ramp(m, c.m0, c.m0 + 0.3), 1 - ramp(m, c.m1 - 0.4, c.m1)));
    cur.style.transform = 'translate(' + (x - 6) + 'px,' + (y - 4) + 'px) scale(' + (1 - 0.16 * press) + ')';
    const rg = ramp(m, c.press, c.press + 1.4, out);
    const size = lerp(50, c.ring, rg);
    Object.assign(ring.style, { opacity: String(m >= c.press ? 0.85 * (1 - rg) : 0), width: size + 'px', height: size + 'px', transform: 'translate(' + (tx - size / 2) + 'px,' + (ty - size / 2) + 'px)' });
  } else {
    cur.style.opacity = '0';
    ring.style.opacity = '0';
  }

  // The phone keeps the line being sung in view, as a singer scrolls to it
  if (phone && m >= PHONE[0] - 0.5 && m < PHONE[1]) {
    const line = phone.doc.querySelector('.pll.cur');
    const page = phone.doc.scrollingElement;
    if (line && page) {
      const d = line.getBoundingClientRect().top - 220;
      if (Math.abs(d) > 2) page.scrollTop += d;
    }
  }
}

/** What the app shows playing, noted whenever it changes: the render's evidence that the beat lit
 * is the beat sounding. */
function note(t: number): void {
  const cell = main.doc.querySelector('#plList .plb.now .pnt');
  const row = cell?.closest('.pll');
  const line = row ? Array.from(main.doc.querySelectorAll('#plList .pll')).indexOf(row) : -1;
  const what = cell ? line + ':' + (cell.textContent ?? '').trim() + ':' + Array.from(row!.querySelectorAll('.plb')).indexOf(cell.closest('.plb')!) : '';
  if (what === lastSeen) return;
  lastSeen = what;
  if (cell) seen.push({ t: Math.round(t * 1000) / 1000, line, note: what });
}

const frame = (win: Window = window): Promise<void> => new Promise((ok) => win.requestAnimationFrame(() => ok()));
/** Wait until the app has scheduled and shown what the clock now asks: its 25 ms timer, then a frame. */
const settle = (): Promise<void> => new Promise((ok) => main.win.setTimeout(() => main.win.requestAnimationFrame(() => ok()), 30));

async function seek(t: number): Promise<void> {
  for (const c of cues) {
    if (c.done || c.t > t) continue;
    clock.now = c.t;
    c.done = true;
    await c.fn();
  }
  clock.now = t;
  const m = matra(t);
  if (m < AT.play) type(main, m);
  feedVoice(t);
  await settle();
  for (const a of apps) stepAnimations(a);
  caret(main, m >= AT.type - 0.5 && m < AT.paste);
  draw(m);
  await frame();
  await frame();
  note(t);
}

// ── Setting the stage ────────────────────────────────────────────────────────────────────────
/** A made-up singer's practice log for the Progress view on the wall: three weeks of rewaz, most
 * evenings, two exercises and the film's song, the pitch scores rising (src/core/practice/log.ts →
 * LogEntry; the app moves it into its database when it opens). */
function practiceLog(): LogEntry[] {
  const DAY = 86_400_000;
  const today = new Date();
  today.setHours(19, 0, 0, 0);
  let seed = 11;
  const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const log: LogEntry[] = [];
  for (let d = 21; d >= 1; d--) {
    if (d % 5 === 2) continue;
    const at0 = today.getTime() - d * DAY + Math.round(rnd() * 40) * 60_000;
    const k = (21 - d) / 20;
    const score = (base: number): number => Math.round(Math.min(97, base + 30 * k + rnd() * 8 - 4));
    log.push({ at: at0, secs: 300 + Math.round(rnd() * 240), song: 'ex-long-notes', title: 'লম্বা স্বর', from: 0, to: 0, loop: true, rounds: 4, tempo: 100, top: 100, score: score(60) });
    log.push({ at: at0 + 9 * 60_000, secs: 240 + Math.round(rnd() * 200), song: 'ex-scale', title: 'আরোহ-অবরোহ', from: 0, to: 0, loop: true, rounds: 3, tempo: 96, top: 96 + 4 * Math.round(k * 5), score: score(54) });
    if (d <= 15) {
      const lines = LINES.map((_, n) => [n, score(48 + (n % 3) * 3)] as [number, number]);
      log.push({ at: at0 + 18 * 60_000, secs: 420 + Math.round(rnd() * 300), song: SONG_ID, title: 'তরঙ্গিণী', from: 0, to: LINES.length - 1, loop: false, rounds: 1, tempo: 128, top: 128, score: Math.round(lines.reduce((s, l) => s + l[1], 0) / lines.length), lines });
    }
  }
  return log;
}

async function setUp(): Promise<{ duration: number; width: number; height: number }> {
  // The app in the film starts on the film's song, empty, ready to be typed.
  localStorage.clear();
  localStorage.setItem('gaanersathi.songs.v1', JSON.stringify({ [SONG_ID]: filmSong('') }));
  localStorage.setItem('gaanersathi.log.v1', JSON.stringify(practiceLog()));
  localStorage.setItem('gaanersathi.prefs.v1', JSON.stringify({
    theme: 'light', script: 'bn', lastSong: SONG_ID, tab: 'edit', editMode: 'text', padFold: true, countIn: false,
    droneType: 'tanpura', droneVol: 0.5, beat: START_BEAT, reeds: START_REEDS, fills: true, layers: LAYERS,
  }));
  buildWords();
  byId('caption').append(document.createElement('span'));
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('italic 42px "Tiro Bangla"', 'তরঙ্গিণী'), document.fonts.load('54px "Tiro Bangla"', MONTAGE.map((id) => taalInfo(id).bn).join('')),
    document.fonts.load('600 68px "Hind Siliguri"', 'Type'), document.fonts.load('700 68px "Hind Siliguri"', 'Type'), document.fonts.load('500 26px "Hind Siliguri"', 'Keherwa'),
  ]);

  // Tall, so the notation box and the Practice lines have room below what the camera frames.
  main = await addApp(0, 0, 1280, 1700);
  await new Promise((r) => setTimeout(r, 600));

  const ta = (): Box => boxOf(main, '#notation');
  const btn = (sel: string, dx: number, dy: number, w: number) => (): Fr => {
    const b = boxOf(main, sel);
    return { cx: b.x + b.w / 2 + dx, cy: b.y + b.h / 2 + dy, w };
  };
  const curLine = (fx: number, w: number, dy = 70) => (): Fr => {
    const b = boxOf(main, '#plList .pll.cur');
    return { cx: b.x + b.w * fx, cy: b.y + b.h / 2 + dy, w };
  };
  const deck = (w: number) => (): Fr => {
    const s = boxOf(main, '#beatSel');
    const c = boxOf(main, '#layerChips');
    return { cx: s.x + s.w / 2 - 40, cy: (s.y + c.y + c.h) / 2 + 60, w };
  };
  /** The top of the app, a window's height of it. */
  const whole = (w: number, dy = 40) => (): Fr => ({ cx: main.w / 2, cy: 500 + dy, w });

  // The notation box: its lines are about 35 px apart, the first about 32 px down, and the first
  // line typed is about 160 px long; the picture keeps them above the words at its foot.
  const typeA = (): Fr => ({ cx: ta().x + 112, cy: ta().y + 56, w: 430 });
  const typeB = (): Fr => ({ cx: ta().x + 102, cy: ta().y + 54, w: 400 });
  const typeW = (): Fr => ({ cx: ta().x + 108, cy: ta().y + 76, w: 450 });
  const typeW2 = (): Fr => ({ cx: ta().x + 112, cy: ta().y + 78, w: 420 });
  /** The notation box and its preview, side by side. */
  const editWide = (w: number) => (): Fr => ({ cx: main.w / 2 + 10, cy: ta().y + 300, w });
  const wall = (w: number) => (): Fr => ({ cx: 720, cy: 1000, w });
  const fullCtr = (w: number) => (): Fr => ({ cx: 720, cy: 450, w });
  const panel = (sel: string, w: number) => btn(sel, 0, 40, w);
  const phoneShot = (w: number) => (): Fr => ({ cx: 1440 + 80 + 200 - 330, cy: 470, w });

  shots = [
    { m0: -9, m1: AT.type, a: typeA },
    { m0: AT.type, m1: 7.6, a: typeA, b: typeB, ease: linear },
    { m0: 7.6, m1: 8.2, a: typeB, b: typeW, ease: out },
    { m0: 8.2, m1: AT.paste, a: typeW, b: typeW2, ease: linear },
    { m0: AT.paste, m1: 12.2, a: typeW2, b: editWide(1340), ease: snap },
    { m0: 12.2, m1: 13, a: editWide(1340), b: editWide(1270), ease: linear },
    // Practice, and Play
    { m0: 13, m1: 14.4, a: whole(1700), b: btn('#playBtn', 120, 70, 640), ease: snap },
    { m0: 14.4, m1: 16.6, a: btn('#playBtn', 120, 70, 640), b: btn('#playBtn', 110, 64, 560), ease: linear },
    // Line 1, tabla
    { m0: 16.6, m1: 17.3, a: btn('#playBtn', 110, 64, 560), b: curLine(0.3, 1100), ease: snap },
    { m0: 17.3, m1: 20, a: curLine(0.32, 1060), b: curLine(0.62, 1000), ease: linear },
    // The deck: tabla to dholak
    { m0: 20, m1: 26, a: deck(860), b: deck(700), ease: linear },
    // Line 2
    { m0: 26, m1: 30, a: curLine(0.36, 1000), b: curLine(0.64, 940), ease: linear },
    // The deck: dholak to drums
    { m0: 30, m1: 34, a: deck(760), b: deck(640), ease: linear },
    // Line 3: the taal drawn as it goes, then the line
    { m0: 34, m1: 36, a: (): Fr => ({ ...btn('#plList .pll.cur .tf', 0, 40, 520)() }), b: (): Fr => ({ ...btn('#plList .pll.cur .tf', 0, 40, 440)() }), ease: linear },
    { m0: 36, m1: 40, a: curLine(0.4, 1240), b: curLine(0.6, 1140), ease: linear },
    // Line 4 under the taals; line 5: the voice drawn
    { m0: 40, m1: TAALS_CUT, a: whole(1500) },
    { m0: TAALS_CUT, m1: 52, a: curLine(0.22, 900, 56), b: curLine(0.48, 860, 56), ease: linear, track: 0.7 },
    { m0: 52, m1: AT.full, a: curLine(0.5, 1300, 60), b: curLine(0.55, 1200, 60), ease: linear },
    // Line 6, full screen: the scores, the gauge
    { m0: AT.full, m1: 57.5, a: fullCtr(1640), b: fullCtr(1580), ease: linear },
    { m0: 57.5, m1: 58.2, a: fullCtr(1580), b: panel('#fullScore', 720), ease: snap },
    { m0: 58.2, m1: 60, a: panel('#fullScore', 720), b: panel('#fullScore', 660), ease: linear },
    { m0: 60, m1: 60.7, a: panel('#fullScore', 660), b: panel('#fullLoud', 720), ease: snap },
    { m0: 60.7, m1: 62, a: panel('#fullLoud', 720), b: panel('#fullLoud', 660), ease: linear },
    { m0: 62, m1: 62.7, a: panel('#fullLoud', 660), b: fullCtr(1640), ease: snap },
    { m0: 62.7, m1: AT.night, a: fullCtr(1640), b: fullCtr(1560), ease: linear },
    // Line 7: night, and every view
    { m0: AT.night, m1: 66, a: fullCtr(1700), b: wall(4500), ease: snap },
    { m0: 66, m1: AT.phone, a: wall(4500), b: wall(4200), ease: linear },
    // Line 8: a phone and a laptop
    { m0: AT.phone, m1: AT.end, a: phoneShot(2100), b: phoneShot(1960), ease: linear },
    { m0: AT.end, m1: 999, a: whole(1500) },
  ];

  // The notation typed, the app goes to its Practice view; a phone is opened beside it, out of
  // the picture; Play is pressed on both so that the first beat lands on the sam.
  cue(at(12.95), () => click(main, '[aria-controls="practice"]'));
  cue(at(14.4), () => addApp(1440 + 80, 20, 400, 860, 'phone').then((a) => {
    phone = a;
    click(a, '[aria-controls="practice"]');
  }));
  cue(at(PRESS), () => {
    click(main, '#playBtn');
    if (phone) click(phone, '#playBtn');
  });
  // The deck changed as the song plays: the soundtrack makes the same change on the same beat.
  for (const c of CHANGES) {
    cue(at(c.m) - 0.08, () => {
      if (c.beat) {
        const sel = q<HTMLSelectElement>(main, '#beatSel');
        sel.value = c.beat;
        sel.dispatchEvent(new main.win.Event('change', { bubbles: true }));
      }
      if (c.reeds) click(main, '#reedSeg [data-v="' + c.reeds + '"]');
    });
  }
  // The other views, opened beside the app out of the picture while line 2 plays.
  cue(at(30), () => {
    const others: [number, number, string, App['look']][] = [[-1340, 0, 'songs', 'day'], [1500, 0, 'edit', 'night'], [-1340, 1000, 'rewaz', 'night'], [60, 1000, 'voice', 'day'], [1500, 1000, 'progress', 'night']];
    return Promise.all(others.map(([x, y, view, look]) => addApp(x, y, 1280, 1000, 'wall', look).then((a) => {
      const tab = q(a, '[aria-controls="' + view + '"]');
      tab.click();
      if (view === 'edit') a.doc.querySelector<HTMLElement>('#modeSeg [data-v="boxes"]')?.click();
      // Each view from its tabs down, not the deck above them that every view shares.
      const page = a.doc.scrollingElement;
      if (page) page.scrollTop = tab.getBoundingClientRect().top - 24;
    })));
  });
  // Check my pitch, a moment before the antara
  cue(at(AT.sing - 0.4), () => click(main, '#micBtn'));
  // Full screen, on a screen the size it was made for
  cue(at(AT.full) - 0.1, () => {
    resize(main, 1440, 900);
    click(main, '#fullBtn');
  });
  // Night falls with the taan
  cue(at(AT.night), () => {
    night = true;
    apps.forEach(theme);
  });

  draw(matra(0));
  return { duration: DURATION, width: W, height: H };
}

/** What the app showed, for the render's report. */
function report(): unknown {
  const at3 = (n: number) => Math.round(at(n) * 1000) / 1000;
  const firstOn = (line: number) => seen.find((s) => s.line === line || (line > 0 && s.t >= at(lineAt(line)) - 0.05));
  const text = (sel: string, app: App | null = main) => (app?.doc.querySelector(sel)?.textContent ?? '').trim().replace(/\s+/g, ' ');
  return {
    playButton: main.doc.querySelector('#playBtn')?.getAttribute('aria-label'),
    message: (main.doc.querySelector('#plMsg') as HTMLElement | null)?.hidden === false ? text('#plMsg') : '',
    beatsLit: seen.length,
    firstBeat: seen[0] ? { lit: seen[0].t, sounds: at3(AT.play) } : null,
    line5: firstOn(4) ? { lit: firstOn(4)!.t, sounds: at3(lineAt(4)) } : null,
    line8: firstOn(7) ? { lit: firstOn(7)!.t, sounds: at3(lineAt(7)) } : null,
    pitch: { mic: text('#micLab'), average: text('#fsAvg'), lines: text('#fsLines'), said: text('#fsPop'), heard: micNodes.length },
    phone: phone ? { lines: phone.doc.querySelectorAll('#plList .pll').length, playing: phone.doc.querySelector('#playBtn')?.getAttribute('aria-label') } : null,
    typed: typedNow.length,
  };
}

declare global {
  interface Window {
    film?: { ready: Promise<{ duration: number; width: number; height: number }>; seek: (t: number) => Promise<void>; report: () => unknown };
  }
}

if (new URLSearchParams(location.search).get('profile') === 'throwaway') {
  window.film = { ready: setUp(), seek, report };
} else {
  byId('stage').hidden = true;
  byId('refuse').hidden = false;
}

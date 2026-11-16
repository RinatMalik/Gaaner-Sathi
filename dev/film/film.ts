/**
 * The film's stage (dev only: docs/ROADMAP.md → Phase 3 → The film).
 *
 * The picture is the app itself, not a drawing of it: the real app runs in a frame on a sheet of
 * paper, and a camera moves over it, from the whole window down to a single button. The stage
 * types the film's song into it, presses Play and lets it play. Nothing in the film is real time:
 * `film.seek(t)` puts every part where it is at second t, and the app's audio clock is the film's
 * clock (the app times its highlight from that clock alone: ENGINE.md → One clock), so the beat
 * that is lit in a frame is the beat the soundtrack sounds there. dev/film/capture.mjs steps the
 * seconds and photographs each frame.
 *
 * It writes a song and settings into the browser's storage for the app it films, so it runs only
 * where capture.mjs opens it: in a browser profile made for the render and thrown away after.
 */
import '../../src/app/fonts.css';
import './film.css';
import { logoParts } from '../../src/app/logo';
import { AT, at, DURATION, filmSong, LINES, lineText, matra, PLAY_LAG, SONG_ID } from './score';

const W = 1920;
const H = 1080;
const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

// ── Easing ───────────────────────────────────────────────────────────────────────────────────
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
/** Slow, fast, slow. */
const io = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
/** Fast, then settling. */
const out = (u: number): number => 1 - Math.pow(1 - u, 3);
const linear = (u: number): number => u;
/** 0 until a, 1 from b, eased between. */
const ramp = (x: number, a: number, b: number, e: (u: number) => number = io): number => e(clamp01((x - a) / (b - a)));
/** There from a to b, coming and going over d. */
const pulse = (x: number, a: number, b: number, d = 0.6): number => Math.min(ramp(x, a, a + d, out), 1 - ramp(x, b - d, b, out));

// ── The app, in frames ───────────────────────────────────────────────────────────────────────
interface App {
  card: HTMLElement;
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

/** The app's AudioContext with the film's clock: the app schedules and shows beats by it. */
function filmClock(win: Window & typeof globalThis): void {
  const Real = win.AudioContext;
  win.AudioContext = function (opts?: AudioContextOptions) {
    const real = new Real(opts);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === 'currentTime') return clock.now;
        if (prop === 'state') return 'running';
        if (prop === 'outputLatency' || prop === 'baseLatency') return 0;
        const v = Reflect.get(target, prop, target) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
  } as unknown as typeof AudioContext;
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
      // The camera decides what is in the picture: the app does not scroll itself about.
      win.Element.prototype.scrollIntoView = function () {};
      win.scrollTo = (() => {}) as typeof win.scrollTo;
      const app: App = { card, win, doc: win.document, x, y, w, h, role, look };
      theme(app);
      apps.push(app);
      void win.document.fonts.ready.then(() => ok(app));
    }, { once: true });
  });
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

// ── The camera ───────────────────────────────────────────────────────────────────────────────
/** What the picture shows: the world point at its middle, and how much of the world's width. */
interface Fr { cx: number; cy: number; w: number }
interface Shot {
  m0: number;
  m1: number;
  a: () => Fr;
  b?: () => Fr;
  ease?: (u: number) => number;
}
const framed = new Map<() => Fr, Fr>();
const frameOf = (f: () => Fr): Fr => {
  let v = framed.get(f);
  if (!v) framed.set(f, (v = f()));
  return v;
};
let shots: Shot[] = [];
let cam: Fr = { cx: 0, cy: 0, w: W };

function camera(m: number): Fr {
  const s = shots.find((x) => m >= x.m0 && m < x.m1) ?? shots[shots.length - 1]!;
  const a = frameOf(s.a);
  if (!s.b) return a;
  const b = frameOf(s.b);
  const u = (s.ease ?? io)(clamp01((m - s.m0) / (s.m1 - s.m0)));
  // The width goes by ratio, so a zoom is as fast at its end as at its start.
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), u)) };
}
/** A world point, on the picture. */
const onScreen = (x: number, y: number): [number, number] => [W / 2 + ((x - cam.cx) * W) / cam.w, H / 2 + ((y - cam.cy) * W) / cam.w];

// ── Typing ───────────────────────────────────────────────────────────────────────────────────
/** What the notation box holds from each matra on: the first line a note to a matra (each one
 * sounds as it lands: sound.ts), its words quickly, then the other three lines, pasted. */
function typingScript(): [number, string][] {
  const snaps: [number, string][] = [[-1, '']];
  let text = '';
  const put = (m: number, s: string) => {
    text += s;
    snaps.push([m, text]);
  };
  let k = 0;
  LINES[0]![0].split(' ').forEach((tok, i) => {
    const m = AT.type1 + k;
    if (tok === '|') return put(m - 0.36, ' |');
    if (i > 0) put(m - 0.15, ' ');
    Array.from(tok).forEach((c, j) => put(m + j * 0.1, c));
    k++;
  });
  put(AT.type2 + 0.3, '\n> ');
  LINES[0]![1].split(' ').forEach((g, i) => put(AT.type2 + 0.7 + i * 0.3, (i ? ' ' : '') + g));
  put(AT.type2 + 3.9, '\n' + lineText(1).trimEnd());
  put(AT.type2 + 4.6, '\n' + lineText(2).trimEnd());
  put(AT.type2 + 5.3, '\n' + lineText(3));
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
interface Cue { t: number; fn: () => void; done?: boolean }
const cues: Cue[] = [];
const cue = (t: number, fn: () => void): void => void cues.push({ t, fn });

// ── Words over the picture ───────────────────────────────────────────────────────────────────
const CAPTIONS: readonly [number, number, string][] = [
  [9, 15.6, 'Type your swaralipi <b>once</b>.'],
  [26.4, 31.6, 'Press play, and sing.'],
  [32.6, 39.6, 'Harmonium for the tune. Tabla for the taal. Tanpura for your Sa.'],
  [48.5, 55.6, 'Your Sa. Your tempo. Your taal.'],
  [57, 63.6, 'By day, and by night.'],
  [64.6, 71.6, 'A library for your songs. A routine for your daily rewaz.'],
  [72.6, 79.6, 'On a phone or a laptop. Nothing to install.'],
  [80.6, 87.4, 'Your songs stay on your device.'],
];
/** Keherwa's theka, as the app's own table has it (src/core/taal/taals.ts): Dha Ge Na Ti | Na Ke Dhin Na. */
const BOLS = ['ধা', 'গে', 'না', 'তি', 'না', 'কে', 'ধিন', 'না'];
const BOLS_AT = 40;
/** The matras the wall of views is in the picture, and the phone. */
const WALL = [64, 72] as const;
const PHONE = [72, 80] as const;

function buildWords(): void {
  byId('nameLogo').innerHTML = logoParts().svg;
  const row = document.createElement('div');
  row.className = 'row';
  BOLS.forEach((b, i) => {
    if (i === 4) row.append(document.createElement('u'));
    const el = document.createElement('i');
    el.textContent = b;
    row.append(el);
  });
  const what = document.createElement('div');
  what.className = 'what';
  what.innerHTML = '<b>কাহারবা</b> Keherwa, one of nineteen taals';
  byId('bols').append(row, what);
  byId('caption').append(document.createElement('span'));
}

// ── A frame ──────────────────────────────────────────────────────────────────────────────────
let main!: App;
let phone: App | null = null;
const seen: { t: number; line: number; note: string }[] = [];
let lastSeen = '';

function draw(m: number): void {
  const inApp = m >= AT.type1 && m < AT.end;
  // The camera, over the world
  cam = camera(m);
  const s = W / cam.w;
  const world = byId('world');
  world.style.transform = 'translate(' + (W / 2 - cam.cx * s) + 'px,' + (H / 2 - cam.cy * s) + 'px) scale(' + s + ')';
  world.style.visibility = inApp ? 'visible' : 'hidden';
  for (const a of apps) {
    if (a.role === 'wall') a.card.style.visibility = m >= WALL[0] && m < WALL[1] ? 'visible' : 'hidden';
    if (a.role === 'phone') a.card.style.visibility = m >= PHONE[0] && m < PHONE[1] ? 'visible' : 'hidden';
  }

  // The theka over the dimmed app
  const bolsOn = pulse(m, BOLS_AT - 0.2, BOLS_AT + 8, 0.5);
  byId('shade').style.opacity = String(0.9 * bolsOn);
  const bols = byId('bols');
  bols.style.opacity = String(bolsOn);
  bols.querySelectorAll<HTMLElement>('.row i').forEach((el, i) => {
    const u = ramp(m, BOLS_AT + i - 0.04, BOLS_AT + i + 0.16, out);
    const nowBol = Math.floor(m - BOLS_AT) === i;
    el.style.opacity = String(u);
    el.style.transform = 'scale(' + lerp(0.72, 1, u) * (nowBol ? lerp(1.08, 1, ramp(m, BOLS_AT + i, BOLS_AT + i + 0.6, out)) : 1) + ')';
    el.style.color = nowBol ? 'var(--brass-text)' : 'var(--ink)';
  });
  bols.querySelector<HTMLElement>('.what')!.style.opacity = String(ramp(m, BOLS_AT + 1, BOLS_AT + 2));

  // The line of words at the foot
  const cap = CAPTIONS.find(([a, b]) => m >= a && m < b);
  const capEl = byId('caption');
  if (cap) {
    const u = pulse(m, cap[0], cap[1], 0.55);
    const span = capEl.firstElementChild as HTMLElement;
    if (span.innerHTML !== cap[2]) span.innerHTML = cap[2];
    capEl.style.opacity = String(u);
    span.style.transform = 'translateY(' + (1 - u) * 16 + 'px)';
  } else capEl.style.opacity = '0';

  // The name: at the start, and from the last sam with the address
  const name = byId('name');
  const opening = m < AT.type1;
  const u = opening ? ramp(m, 0.5, 2.4, out) * (1 - ramp(m, 7.1, 7.9)) : ramp(m, AT.end - 0.05, AT.end + 0.45, out);
  name.style.opacity = String(opening || m >= AT.end - 0.05 ? u : 0);
  byId('nameLogo').style.transform = 'scale(' + (opening ? lerp(1.05, 1, ramp(m, 0.5, 8, out)) : lerp(1.06, 1, ramp(m, AT.end, AT.end + 6, out))) + ')';
  byId('nameTag').style.opacity = String(opening ? ramp(m, 2.6, 4.2) : ramp(m, AT.end + 1.2, AT.end + 2.4));
  byId('nameUrl').style.opacity = String(opening ? 0 : ramp(m, AT.end + 3, AT.end + 4.2));

  // The cursor: to the Play button, and a press on the sam
  const cur = byId('cursor');
  const ring = byId('ring');
  const curOn = ramp(m, 21.6, 22.1) * (1 - ramp(m, 25.2, 25.9));
  if (curOn > 0) {
    const p = boxOf(main, '#playBtn');
    const [tx, ty] = onScreen(p.x + p.w * 0.56, p.y + p.h * 0.6);
    const g = ramp(m, 21.6, 23.5, io);
    const x = lerp(1540, tx, g);
    const y = lerp(1010, ty, g) - Math.sin(g * Math.PI) * 60;
    const press = pulse(m, AT.play - 0.42, AT.play + 0.3, 0.28);
    cur.style.opacity = String(curOn);
    cur.style.transform = 'translate(' + (x - 6) + 'px,' + (y - 4) + 'px) scale(' + (1 - 0.14 * press) + ')';
    const rg = ramp(m, AT.play - 0.05, AT.play + 1.5, out);
    const size = lerp(60, 520, rg);
    Object.assign(ring.style, { opacity: String(m >= AT.play - 0.05 ? 0.8 * (1 - rg) : 0), width: size + 'px', height: size + 'px', transform: 'translate(' + (tx - size / 2) + 'px,' + (ty - size / 2) + 'px)' });
  } else {
    cur.style.opacity = '0';
    ring.style.opacity = '0';
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

/** Wait until the app has scheduled and shown what the clock now asks: its 25 ms timer, then a frame. */
const settle = (): Promise<void> =>
  new Promise((ok) => main.win.setTimeout(() => main.win.requestAnimationFrame(() => requestAnimationFrame(() => ok())), 30));

async function seek(t: number): Promise<void> {
  for (const c of cues) {
    if (c.done || c.t > t) continue;
    clock.now = c.t;
    c.fn();
    c.done = true;
  }
  clock.now = t;
  const m = matra(t);
  if (m < AT.play) type(main, m);
  caret(main, m >= AT.type1 - 0.5 && m < 22.9);
  draw(m);
  await settle();
  note(t);
}

// ── Setting the stage ────────────────────────────────────────────────────────────────────────
async function setUp(): Promise<{ duration: number; width: number; height: number }> {
  // The app in the film starts on the film's song, empty, ready to be typed.
  localStorage.clear();
  localStorage.setItem('gaanersathi.songs.v1', JSON.stringify({ [SONG_ID]: filmSong('') }));
  localStorage.setItem('gaanersathi.prefs.v1', JSON.stringify({
    theme: 'light', script: 'bn', lastSong: SONG_ID, tab: 'edit', editMode: 'text', padFold: true, countIn: false, droneType: 'tanpura', droneVol: 0.5,
  }));
  buildWords();
  await document.fonts.ready;
  await Promise.all([document.fonts.load('italic 42px "Tiro Bangla"', 'তরঙ্গিণী'), document.fonts.load('168px "Tiro Bangla"', BOLS.join('')), document.fonts.load('500 50px "Hind Siliguri"', 'Type'), document.fonts.load('600 40px "Hind Siliguri"', 'torongini')]);

  main = await addApp(0, 0, 1280, 1000);
  filmClock(main.win);
  await new Promise((r) => setTimeout(r, 600));
  const loop = q<HTMLInputElement>(main, '#loopChk');
  loop.checked = true;
  loop.dispatchEvent(new main.win.Event('change', { bubbles: true }));

  const ta = (): Box => boxOf(main, '#notation');
  const playBtn = (): Box => boxOf(main, '#playBtn');
  const deck = (): Box => boxOf(main, '#deck');
  const line = (n: number): Box => box(main, main.doc.querySelectorAll('#plList .pll')[n] ?? q(main, '#plList'));
  const whole: Fr = { cx: 640, cy: 500, w: 1990 };

  const typeA = (): Fr => ({ cx: ta().x + 222, cy: ta().y + 62, w: 600 });
  const typeB = (): Fr => ({ cx: ta().x + 232, cy: ta().y + 66, w: 540 });
  const editWide = (): Fr => ({ cx: 640, cy: ta().y + 78, w: 1300 });
  const editWideB = (): Fr => ({ cx: 640, cy: ta().y + 86, w: 1240 });
  const playA = (): Fr => ({ cx: playBtn().x + playBtn().w / 2 + 70, cy: playBtn().y + playBtn().h / 2 + 78, w: 640 });
  const playB = (): Fr => ({ cx: playBtn().x + playBtn().w / 2 + 50, cy: playBtn().y + playBtn().h / 2 + 64, w: 560 });
  const lineA = (n: number, w: number) => (): Fr => ({ cx: line(n).x + line(n).w * 0.34, cy: line(n).y + line(n).h / 2 + 24, w });
  const lineB = (n: number, w: number) => (): Fr => ({ cx: line(n).x + line(n).w * 0.68, cy: line(n).y + line(n).h / 2 + 24, w });
  const l1a = lineA(0, 1040), l1b = lineB(0, 1040), n1a = lineA(0, 1120), n1b = lineB(0, 1120);
  const deckAt = (fx: number, w: number) => (): Fr => ({ cx: deck().x + deck().w * fx, cy: deck().y + deck().h * 0.5, w });
  const d1 = deckAt(0.34, 780), d2 = deckAt(0.5, 780), d3 = deckAt(0.76, 780), d4 = deckAt(0.86, 740);
  const wholeA = (): Fr => whole, wholeB = (): Fr => ({ ...whole, w: 1880 }), wholeC = (): Fr => ({ ...whole, w: 1800 });
  const wallA = (): Fr => ({ cx: 640, cy: 500, w: 2100 }), wallB = (): Fr => ({ cx: 640, cy: 1030, w: 4420 });
  const phoneA = (): Fr => ({ cx: 885, cy: 500, w: 2120 }), phoneB = (): Fr => ({ cx: 885, cy: 500, w: 2010 });
  const lastA = (): Fr => ({ ...whole, w: 1880 });
  const lastB = (): Fr => ({ cx: line(3).x + line(3).w * 0.42, cy: line(3).y + line(3).h / 2 - 96, w: 1040 });

  shots = [
    { m0: -9, m1: AT.type1, a: wholeA },
    { m0: AT.type1, m1: AT.type2, a: typeA, b: typeB, ease: linear },
    { m0: AT.type2, m1: 17.6, a: typeB, b: editWide },
    { m0: 17.6, m1: 21.6, a: editWide, b: editWideB, ease: linear },
    { m0: 21.6, m1: 23.4, a: editWideB, b: playA },
    { m0: 23.4, m1: 26, a: playA, b: playB, ease: linear },
    { m0: 26, m1: 32, a: l1a, b: l1b, ease: linear },
    { m0: 32, m1: 40, a: wholeA, b: wholeB, ease: linear },
    { m0: 40, m1: 48, a: wholeB, b: wholeC, ease: linear },
    { m0: 48, m1: 52, a: d1, b: d2, ease: linear },
    { m0: 52, m1: 56, a: d3, b: d4, ease: linear },
    { m0: 56, m1: 64, a: n1a, b: n1b, ease: linear },
    { m0: 64, m1: 72, a: wallA, b: wallB },
    { m0: 72, m1: 80, a: phoneA, b: phoneB, ease: linear },
    { m0: 80, m1: 88, a: lastA, b: lastB },
    { m0: 88, m1: 999, a: wholeA },
  ];

  // The notation typed, the app goes to its Practice view; Play is pressed so that its first
  // beat lands on the sam; the other views and a phone are opened beside it, out of the picture,
  // while the first round plays; night falls with the second round.
  cue(at(22.9), () => click(main, '[aria-controls="practice"]'));
  cue(at(AT.play) - PLAY_LAG, () => click(main, '#playBtn'));
  cue(at(30), () => {
    const others: [number, number, string, App['look']][] = [[-1340, 0, 'songs', 'day'], [1340, 0, 'edit', 'night'], [-1340, 1060, 'rewaz', 'night'], [0, 1060, 'voice', 'day'], [1340, 1060, 'progress', 'night']];
    for (const [x, y, view, look] of others) void addApp(x, y, 1280, 1000, 'wall', look).then((a) => click(a, '[aria-controls="' + view + '"]'));
    void addApp(1370, 70, 400, 860, 'phone').then((a) => {
      phone = a;
      filmClock(a.win);
      click(a, '[aria-controls="practice"]');
      // On a phone the song's lines are a screen below the controls: the phone is shown scrolled to them.
      setTimeout(() => {
        const page = a.doc.scrollingElement!;
        page.scrollTop += q(a, '#songTitle').getBoundingClientRect().top - 150;
      }, 400);
    });
  });
  // The phone plays the second round with the laptop, on the same clock.
  cue(at(AT.round2) - PLAY_LAG, () => phone && click(phone, '#playBtn'));
  cue(at(AT.round2), () => {
    night = true;
    document.documentElement.setAttribute('data-night', '');
    apps.forEach(theme);
  });

  draw(matra(0));
  return { duration: DURATION, width: W, height: H };
}

/** What the app showed, for the render's report. */
function report(): unknown {
  const firstOf = (line: number, round: number) => seen.filter((s) => s.line === line)[round * 8] ?? seen.filter((s) => s.line === line)[0];
  return {
    playButton: main.doc.querySelector('#playBtn')?.getAttribute('aria-label'),
    message: (main.doc.querySelector('#plMsg') as HTMLElement | null)?.hidden === false ? main.doc.querySelector('#plMsg')?.textContent : '',
    beatsLit: seen.length,
    firstBeat: seen[0] ? { lit: seen[0].t, sounds: Math.round(at(AT.play) * 1000) / 1000 } : null,
    secondRound: (() => {
      const s = seen.find((x) => x.t >= at(AT.round2) - 0.1 && x.line === 0);
      return s ? { lit: s.t, sounds: Math.round(at(AT.round2) * 1000) / 1000 } : null;
    })(),
    lastLine: firstOf(3, 0) ?? null,
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

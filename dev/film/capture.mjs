// Renders the film (docs/ROADMAP.md → Phase 3 → The film): the stage at dev/film/index.html,
// stepped a frame at a time in headless Edge or Chrome through the DevTools protocol, each frame
// piped to ffmpeg with the soundtrack the app's own engine renders (dev/film/sound.ts).
// No dependency is added: Vite serves the pages, Node's own WebSocket drives the browser, and
// ffmpeg, already on this computer, puts the file together.
//
//   npm run film                          the whole film → dev/film/out/torongini-film.mp4
//   npm run film -- --stills 3,12.5,31    PNG stills at those seconds (for looking at a change)
//   npm run film -- --from 10 --to 20     only that stretch, as a film
//   npm run film -- --fps 60 --scale 0.5  frames a second; a smaller picture (previews)
//   npm run film -- --sound-only          only the soundtrack → dev/film/out/torongini-film.wav
//
// The browser: CHROME_PATH if set, else Edge or Chrome where they usually are. It runs with a
// profile of its own, thrown away afterwards, so the songs and settings the stage writes for the
// app in the film never touch a real copy of the app.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const W = 1920;
const H = 1080;
const OUT = resolve('dev/film/out');
/** How loud the film is, LUFS: what YouTube and the like play everything at. */
const LOUDNESS = -14;

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const fps = Number(arg('fps', 30));
const scale = Number(arg('scale', 1));
const stills = arg('stills', '') ? String(arg('stills', '')).split(',').map(Number) : null;
const from = Number(arg('from', 0));
const to = arg('to', '') === '' ? Infinity : Number(arg('to', 0));
const soundOnly = arg('sound-only', false) === true;
const name = String(arg('name', 'torongini-film'));

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const files = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const f of files) if (existsSync(f)) return f;
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    const r = spawnSync('which', [n], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error('No Chrome, Chromium or Edge found: set CHROME_PATH.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const said = [];

// ── The pages, served here ──────────────────────────────────────────────────────────────────
const vite = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 5199, strictPort: false } });
await vite.listen();
const origin = 'http://127.0.0.1:' + vite.httpServer.address().port;

// ── A browser, headless, with a profile of its own ──────────────────────────────────────────
const work = await mkdtemp(join(tmpdir(), 'tgf-'));
const browser = spawn(findBrowser(), [
  '--headless=new', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  '--user-data-dir=' + join(work, 'profile'), '--autoplay-policy=no-user-gesture-required', '--window-size=' + W + ',' + H,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let ws;

async function finish(code) {
  try {
    ws?.close();
  } catch {
    // closed already
  }
  browser.kill();
  await vite.close();
  await sleep(500);
  await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  process.exit(code);
}

/** ffmpeg, its words kept for when it fails. */
function ffmpeg(args, stdin = 'ignore') {
  const p = spawn('ffmpeg', ['-y', '-hide_banner', ...args], { stdio: [stdin, 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err = (err + d).slice(-6000)));
  const done = new Promise((ok, no) => {
    p.on('error', (e) => no(new Error('ffmpeg did not start (is it installed?): ' + e.message)));
    p.on('exit', (c) => (c === 0 ? ok(err) : no(new Error('ffmpeg stopped (' + c + '): ' + err.slice(-1500)))));
  });
  return { p, done };
}

try {
  const devtools = await new Promise((ok, no) => {
    let err = '';
    const t = setTimeout(() => no(new Error('The browser did not start: ' + err.slice(-400))), 30_000);
    browser.stderr.on('data', (d) => {
      err += d;
      const m = err.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(t);
        ok(new URL(m[1]));
      }
    });
    browser.on('exit', (c) => no(new Error('The browser stopped (' + c + '): ' + err.slice(-400))));
  });
  const targets = await (await fetch('http://' + devtools.host + '/json/list')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('The browser has no page to drive.');

  // ── The DevTools protocol ─────────────────────────────────────────────────────────────────
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => {
    ws.onopen = ok;
    ws.onerror = () => no(new Error('Could not reach the page.'));
  });
  let id = 0;
  const pending = new Map();
  const waiting = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.id) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
      return;
    }
    const p = msg.params ?? {};
    if (msg.method === 'Runtime.exceptionThrown') said.push('The page threw: ' + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    if (msg.method === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'warning')) said.push('The page logged: ' + p.args?.map((a) => a.value ?? a.description).join(' '));
    for (const w of waiting.splice(0)) if (!w(msg)) waiting.push(w);
  };
  const send = (method, params = {}) =>
    new Promise((ok, no) => {
      const i = ++id;
      pending.set(i, (m) => (m.error ? no(new Error(method + ': ' + m.error.message)) : ok(m.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const event = (method, ms) =>
    new Promise((ok, no) => {
      const t = setTimeout(() => no(new Error('No ' + method + ' within ' + ms + ' ms')), ms);
      waiting.push((m) => (m.method === method ? (clearTimeout(t), ok(m.params), true) : false));
    });
  const run = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('In the page: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
    return r.result.value;
  };
  const goto = async (url) => {
    const loaded = event('Page.loadEventFired', 60_000);
    await send('Page.navigate', { url });
    await loaded;
  };

  for (const d of ['Runtime', 'Page']) await send(d + '.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await mkdir(OUT, { recursive: true });

  // ── The soundtrack ────────────────────────────────────────────────────────────────────────
  const wav = join(work, 'soundtrack.wav');
  if (!stills) {
    await goto(origin + '/dev/film/sound.html');
    const stats = await run('window.soundtrack');
    const len = await run('window.soundtrackB64.length');
    let b64 = '';
    for (let a = 0; a < len; a += 3_000_000) b64 += await run('window.soundtrackB64.slice(' + a + ',' + (a + 3_000_000) + ')');
    await writeFile(wav, Buffer.from(b64, 'base64'));
    await copyFile(wav, join(OUT, name + '.wav'));
    console.log('Soundtrack: ' + JSON.stringify(stats));
    if (soundOnly) await finish(0);
  }

  // ── The picture, a frame at a time ────────────────────────────────────────────────────────
  await goto(origin + '/dev/film/index.html?profile=throwaway');
  const info = await run('window.film.ready');
  const end = Math.min(info.duration, stills ? Math.max(...stills) + 1 / fps : to);
  const frames = Math.ceil(end * fps);
  const first = Math.round(from * fps);
  const shot = () => send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, ...(scale === 1 ? {} : { clip: { x: 0, y: 0, width: W, height: H, scale } }) });

  let enc = null;
  const silent = join(work, 'picture.mp4');
  if (!stills) {
    enc = ffmpeg(['-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', silent], 'pipe');
  }
  const wantStill = stills ? new Set(stills.map((s) => Math.round(s * fps))) : null;
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await run('window.film.seek(' + i / fps + ')');
    if (wantStill ? wantStill.has(i) : i >= first) {
      const { data } = await shot();
      const png = Buffer.from(data, 'base64');
      if (wantStill) await writeFile(join(OUT, 'still-' + (i / fps).toFixed(2).padStart(6, '0') + '.png'), png);
      else if (!enc.p.stdin.write(png)) await once(enc.p.stdin, 'drain');
    }
    if (i % (fps * 5) === 0) console.log('  ' + (i / fps).toFixed(0) + ' s of ' + end.toFixed(1) + ' (' + Math.round((Date.now() - t0) / 1000) + ' s so far)');
  }
  const state = await run('window.film.report ? window.film.report() : null');
  if (state) console.log('The app in the film: ' + JSON.stringify(state));
  if (said.length) console.log(Array.from(new Set(said)).map((s) => '! ' + s).join('\n'));
  if (stills) {
    console.log('Stills in dev/film/out/');
    await finish(0);
  }
  enc.p.stdin.end();
  await enc.done;

  // ── Picture and sound together: the sound at one level throughout (no compressor riding it) ──
  const heard = (await ffmpeg(['-i', wav, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']).done).match(/\{[\s\S]*\}/);
  const m = heard ? JSON.parse(heard[0]) : { input_i: '-16', input_tp: '-1' };
  const gain = Math.min(LOUDNESS - Number(m.input_i), -1 - Number(m.input_tp));
  const length = (frames - first) / fps;
  const film = join(work, 'film.mp4');
  await ffmpeg(['-loglevel', 'error', '-i', silent, '-ss', String(first / fps), '-t', String(length), '-i', wav,
    '-af', 'volume=' + gain.toFixed(2) + 'dB,afade=t=out:st=' + Math.max(0, length - 0.6).toFixed(2) + ':d=0.6',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', film]).done;
  await copyFile(film, join(OUT, name + '.mp4'));
  console.log('Film: dev/film/out/' + name + '.mp4, ' + length.toFixed(2) + ' s at ' + fps + ' frames a second; sound ' + m.input_i + ' LUFS as rendered, ' +
    gain.toFixed(1) + ' dB added (true peak ' + (Number(m.input_tp) + gain).toFixed(1) + ' dB).');
  await finish(0);
} catch (e) {
  console.error('✗ ' + (e instanceof Error ? e.message : e));
  if (said.length) console.error(Array.from(new Set(said)).map((s) => '! ' + s).join('\n'));
  await finish(1);
}

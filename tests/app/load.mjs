// The built app, loaded in a real browser (2026-11-16; the review of 2026-11-14 found no test
// loaded src/app/app.ts, the wiring of the whole screen, so a fault there passed every test).
// Serves dist/ on this computer, opens it in headless Chrome or Edge through the DevTools
// protocol (Node's own WebSocket: no dependency), and fails on any error the page reports, any
// request to another computer (nothing leaves the device), the app's typefaces not loading
// from the app itself, a view that does not open, or Play that does not play.
//
//   npm run build && npm run test:app
//
// The browser: CHROME_PATH if set, else Chrome, Chromium or Edge where they usually are.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const DIST = resolve('dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
};

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const files = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const f of files) if (existsSync(f)) return f;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error('No Chrome, Chromium or Edge found: set CHROME_PATH.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const fail = (what) => failures.push(what);

if (!existsSync(join(DIST, 'index.html'))) throw new Error('No dist/index.html: run npm run build first.');

// ── The built app, served here ──────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = resolve(DIST, '.' + p);
  if (file !== DIST && !file.startsWith(DIST + sep)) return void res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;

// ── A browser, headless, with a profile of its own ──────────────────────────────────────────
const profile = await mkdtemp(join(tmpdir(), 'tg-'));
const args = ['--headless=new', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, '--autoplay-policy=no-user-gesture-required', '--window-size=1280,900', 'about:blank'];
if (process.env.CI) args.unshift('--no-sandbox');
const browser = spawn(findBrowser(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
let ws;

async function finish(code) {
  try {
    ws?.close();
  } catch {
    // closed already
  }
  browser.kill();
  server.close();
  await sleep(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  process.exit(code);
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
  const requests = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(String(m.data));
    if (msg.id) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
      return;
    }
    const p = msg.params ?? {};
    if (msg.method === 'Runtime.exceptionThrown') fail('The page threw: ' + (p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    if (msg.method === 'Runtime.consoleAPICalled' && p.type === 'error') fail('The page logged an error: ' + p.args?.map((a) => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && p.entry?.level === 'error') fail('The browser reported: ' + p.entry.text + (p.entry.url ? ' (' + p.entry.url + ')' : ''));
    if (msg.method === 'Network.requestWillBeSent') requests.push(p.request.url);
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

  for (const d of ['Runtime', 'Log', 'Network', 'Page']) await send(d + '.enable');
  const loaded = event('Page.loadEventFired', 30_000);
  await send('Page.navigate', { url: origin + '/' });
  await loaded;
  await sleep(1500);

  // ── What the page shows ───────────────────────────────────────────────────────────────────
  const seen = await run(`(async () => {
    const fonts = await Promise.all([
      document.fonts.load('16px "Tiro Bangla"', 'সা রে'),
      document.fonts.load('italic 16px "Tiro Bangla"', 'তরঙ্গিণী'),
      document.fonts.load('16px "Hind Siliguri"', 'Play গান'),
      document.fonts.load('600 16px "Hind Siliguri"', 'Play'),
    ]);
    const views = {};
    for (const v of ['songs', 'edit', 'rewaz', 'voice', 'progress', 'practice']) {
      document.querySelector('[aria-controls="' + v + '"]').click();
      await new Promise((r) => setTimeout(r, 200));
      views[v] = !document.getElementById(v).hidden;
    }
    return {
      title: (document.querySelector('#songTitle')?.textContent ?? '').trim(),
      logo: !!document.querySelector('.logo svg'),
      fonts: fonts.map((f) => f.length),
      views,
      menu: document.querySelectorAll('#bkMenu [data-bk]').length,
    };
  })()`);
  if (!seen.title) fail('No song is open: the title is empty.');
  if (!seen.logo) fail('The logo is not drawn.');
  seen.fonts.forEach((n, i) => n || fail('Typeface ' + (i + 1) + ' of 4 did not load.'));
  for (const [v, open] of Object.entries(seen.views)) if (!open) fail('The ' + v + ' view did not open.');
  if (seen.menu !== 4) fail('Back up or export has ' + seen.menu + ' choices, not 4.');

  // ── Play, then pause ──────────────────────────────────────────────────────────────────────
  const label = () => run(`document.querySelector('#playBtn').getAttribute('aria-label')`);
  await run(`document.querySelector('#playBtn').click()`);
  await sleep(2000);
  const playing = await label();
  await run(`document.querySelector('#playBtn').click()`);
  await sleep(300);
  const paused = await label();
  if (playing !== 'Pause') fail('Play did not play (the button says ' + playing + ').');
  if (paused !== 'Go on') fail('Pause did not pause (the button says ' + paused + ').');

  // ── Nothing leaves the device ─────────────────────────────────────────────────────────────
  const away = requests.filter((u) => !u.startsWith(origin + '/') && !/^(data|blob):/.test(u));
  for (const u of away) fail('A request left this computer: ' + u);

  const fonts = requests.filter((u) => u.endsWith('.woff2')).length;
  console.log('Loaded ' + origin + ': "' + seen.title + '", ' + requests.length + ' requests (' + fonts + ' typeface files), every view opened, played and paused.');
  if (failures.length) {
    console.error(failures.map((f) => '✗ ' + f).join('\n'));
    await finish(1);
  }
  console.log('✓ The app loads with no error, and nothing leaves this computer.');
  await finish(0);
} catch (e) {
  console.error('✗ ' + (e instanceof Error ? e.message : e));
  if (failures.length) console.error(failures.map((f) => '✗ ' + f).join('\n'));
  await finish(1);
}

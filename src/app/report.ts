/**
 * A practice session's report (Rinat, 2026-10-20: "generate a human friendly report with nice
 * dashboard ... It should contain information about the session. what were good, what needs
 * improving, whether i kept to the note well but came in too late"): one self-contained HTML
 * page, opened in a new tab and saved or printed from there. The score and the session in a
 * sentence; tiles; what went well and what to work on; when new notes were reached; how far
 * off the notes were, overall and note by note; each line with its notes and the voice drawn
 * over them; the rounds; the song's earlier scores. Pure, so it is tested in Node.
 */
import { parseSong } from '../core/notation/parse';
import { CLOSE, IN_TUNE, LATE, ON_TIME, noteWords } from '../core/practice/insights';
import { lengthText } from '../core/practice/log';
import { centsFromSa, judged } from '../core/pitch/track';
import { taalInfo } from '../core/taal/taals';
import type { SessionFileInput } from './aifile';
import { exportName, stamp } from './filenames';
import { keyOfHz, noteKeysHTML, noteKeysLegend, NOTEKEYS_CSS, saOnText } from './notekeys';
import { beatNoteHTML, esc, lyricHTML, type Script } from './view';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const p2 = (n: number) => String(n).padStart(2, '0');
const dayText = (at: number) => {
  const d = new Date(at);
  return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
};
const shortDay = (at: number) => {
  const d = new Date(at);
  return d.getDate() + ' ' + MONTHS[d.getMonth()]!.slice(0, 3);
};
/** "180 ms", "1.2 s". */
const msText = (s: number) => (Math.abs(s) >= 0.995 ? Math.abs(s).toFixed(1) + ' s' : Math.round(Math.abs(s) * 100) * 10 + ' ms');
const pct = (v: number) => Math.round(v * 100) + '%';
const grade = (s: number) => (s >= 85 ? 'good' : s >= 60 ? 'ok' : 'off');
const GRADE_WORD: Record<string, string> = { good: 'In tune', ok: 'Close', off: 'Off' };
const band = (c: number) => (Math.abs(c) <= IN_TUNE ? 'good' : Math.abs(c) <= CLOSE ? 'ok' : 'off');
const signed = (c: number) => (c > 0 ? '+' : c < 0 ? '−' : '') + Math.abs(Math.round(c));
const n1 = (v: number) => Math.round(v * 10) / 10;

/** The page's styles: its own colour tokens (day and night, and day when printed), the app's
 * fonts, and the note marks of the app's sheets. The song report uses them too. */
export const REPORT_CSS = `
:root{color-scheme:light;--bg:#eceeea;--card:#fbfbf8;--ink:#1b1c24;--ink2:#5c5f6c;--line:#d9dcdf;--grid:#e3e6e9;--wood:#3e1f15;--on-wood:#f6ead8;--on-wood2:#d6c3a8;--brass:#c4952b;
--good:#1f7a3a;--ok:#d9a21f;--off:#b4261e;--none:#a3a5ae;--lyric:#b3261e;
--f-note:"Tiro Bangla","Noto Serif Bengali","Kohinoor Bangla",Georgia,serif;--f-ui:"Hind Siliguri","Noto Sans Bengali",system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#111115;--card:#19191f;--ink:#ecebe5;--ink2:#a2a3ae;--line:#2c2c35;--grid:#26262e;--wood:#22100a;--on-wood:#f1e3cf;--on-wood2:#bba68b;--brass:#d3a843;
--good:#45a058;--ok:#dba838;--off:#ec4d40;--none:#6c6e78;--lyric:#ff8d7e}}
@media print{:root{color-scheme:light;--bg:#fff;--card:#fff;--ink:#000;--ink2:#4a4a4a;--line:#c8c8c8;--grid:#e3e3e3;--good:#1f7a3a;--ok:#d9a21f;--off:#b4261e;--none:#a3a5ae;--lyric:#b3261e}
.acts{display:none!important}.card,.tile{break-inside:avoid}body{background:#fff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--f-ui)}
.wrap{max-width:980px;margin:0 auto;padding:0 16px 32px}
header.hero{background:var(--wood);color:var(--on-wood);border-bottom:3px solid var(--brass)}
header.hero .wrap{padding-top:18px;padding-bottom:18px}
.brand{font-size:13px;color:var(--on-wood2);letter-spacing:.02em}
.brand b{font-family:var(--f-note);font-weight:400;color:var(--on-wood)}
h1{font-family:var(--f-note);font-weight:400;font-size:clamp(26px,5vw,38px);line-height:1.15;margin:6px 0 4px;text-wrap:balance}
.when{color:var(--on-wood2);font-size:14px}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.acts button{font:inherit;font-size:14px;padding:6px 14px;border-radius:999px;border:1px solid var(--brass);background:transparent;color:var(--on-wood);cursor:pointer}
.acts button:hover{background:color-mix(in srgb,var(--brass) 25%,transparent)}
.acts button:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
main{display:grid;gap:14px;margin-top:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;min-width:0}
h2{font-size:17px;margin:0 0 10px;font-weight:600}
h3{font-size:15px;margin:0;font-weight:600}
.sub{color:var(--ink2);font-size:13px}
.top{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:18px;align-items:center}
.hero-n{font-size:64px;line-height:1;font-weight:600}
.hero-n small{font-size:20px;color:var(--ink2);font-weight:500}
.meter{height:8px;border-radius:4px;background:var(--grid);overflow:hidden;margin:8px 0 4px;width:150px}
.meter span{display:block;height:100%;border-radius:4px}
.headline{font-size:clamp(18px,3vw,22px);line-height:1.35;margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;display:grid;gap:2px;align-content:start}
.tile .l{font-size:13px;color:var(--ink2)}
.tile .v{font-size:24px;font-weight:600;line-height:1.2}
.tile .s{font-size:12.5px;color:var(--ink2)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
ul.f{list-style:none;margin:0;padding:0;display:grid;gap:8px}
ul.f li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:start}
.ic{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;margin-top:1px}
.ic.good{background:var(--good)}.ic.work{background:var(--off)}.ic.note{background:var(--ink2)}
.empty{color:var(--ink2);margin:0}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:baseline;margin-right:6px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:0 10px;font-weight:600;font-size:14px;white-space:nowrap}
.good{--c:var(--good)}.ok{--c:var(--ok)}.off{--c:var(--off)}.none{--c:var(--none)}
.dot,.sw{background:var(--c)}
.stack{display:flex;gap:2px;height:22px;margin:10px 0 8px}
.stack span{display:block;height:100%;background:var(--c);min-width:2px}
.stack span:first-child{border-radius:4px 0 0 4px}.stack span:last-child{border-radius:0 4px 4px 0}
.legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13.5px;margin:0;padding:0;list-style:none}
.legend li{display:flex;align-items:center;gap:6px}
.sw{display:inline-block;width:12px;height:12px;border-radius:3px}
.cmp{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;align-items:center;margin-top:12px;font-size:14px}
.cmp .bar{height:14px;display:flex;align-items:center;gap:8px}
.cmp .bar span{display:block;height:100%;max-width:calc(100% - 64px);background:var(--brass);border-radius:0 4px 4px 0}
svg{display:block;max-width:100%}
svg.chart{width:100%}.narrow{display:none}
@media (max-width:560px){svg.wide{display:none}svg.narrow{display:block}.narrow .ax{font-size:12px}}
.ax{fill:var(--ink2);font-size:11px;font-family:var(--f-ui)}
.gl{stroke:var(--grid);stroke-width:1}
table{border-collapse:collapse;width:100%;font-size:14px}
th{text-align:left;font-size:12px;color:var(--ink2);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-top:1px solid var(--grid);vertical-align:middle}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.scroll{overflow-x:auto}
.note{font-family:var(--f-note);font-size:19px;line-height:1.3;margin-right:8px}
.nw{white-space:nowrap}
.div{position:relative;height:14px;min-width:70px;background:linear-gradient(var(--line),var(--line)) center/1px 100% no-repeat}
.div span{position:absolute;top:2px;bottom:2px;background:var(--c);border-radius:3px}
.line{display:grid;gap:6px;padding:12px 0;border-top:1px solid var(--grid)}
.line:first-of-type{border-top:0;padding-top:0}
.lhead{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.beats{display:flex;flex-wrap:wrap;gap:2px 12px}
.bt{display:grid;justify-items:center;min-width:1.6em}
.bt .nt{font-family:var(--f-note);font-size:17px;line-height:1.3}
.bt .ly{font-family:var(--f-note);font-size:14px;color:var(--lyric);line-height:1.2;display:block}
.strip{width:100%;height:110px;background:color-mix(in srgb,var(--ink) 3%,transparent);border-radius:8px}
.strip .nb{opacity:.32}
.strip polyline{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.u{position:relative;display:inline-block}
.u.hold,.u.rest{color:var(--ink2)}
.u.hi::before{content:"";position:absolute;left:50%;top:.02em;width:.17em;height:.17em;margin-left:-.085em;border-radius:50%;background:currentColor}
.u.lo::after{content:"";position:absolute;left:50%;bottom:-.02em;width:.17em;height:.17em;margin-left:-.085em;border-radius:50%;background:currentColor}
.u.hi2::before,.u.lo2::after{margin-left:-.22em;box-shadow:.27em 0 0 currentColor}
.u.up2::before{content:"";position:absolute;left:50%;top:-.2em;width:.17em;height:.17em;margin-left:-.22em;border-radius:50%;background:currentColor;box-shadow:.27em 0 0 currentColor}
.u.komal{text-decoration:underline;text-decoration-thickness:.06em;text-underline-offset:.16em}
.u.tivra::before{content:"";position:absolute;left:50%;top:-.12em;width:.06em;height:.32em;margin-left:-.03em;background:currentColor;border-radius:0;box-shadow:none}
.u.tivra.hi::before{margin-left:-.17em}
.u.tivra.hi::after{content:"";position:absolute;left:50%;top:.02em;width:.17em;height:.17em;margin-left:.01em;border-radius:50%;background:currentColor}
.gap{display:inline-block;width:.18em}
footer{color:var(--ink2);font-size:13px;margin-top:18px;display:grid;gap:6px}
footer p{margin:0}
@media (max-width:560px){.top{grid-template-columns:minmax(0,1fr)}.hero-n{font-size:52px}.strip{height:90px}}
` + NOTEKEYS_CSS;

/** The page's head: its title, the app's fonts, the styles (and any of its own). */
export const reportHead = (title: string, css = ''): string =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>' + esc(title) + '</title>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&family=Tiro+Bangla&display=swap">' +
  '<style>' + REPORT_CSS + css + '</style></head><body>';

/** The page's Print and Save buttons at work; Save keeps the page as `fileName`. */
export const reportScript = (fileName: string): string =>
  '<script>(function(){var n=' + JSON.stringify(fileName).replace(/</g, '\\u003c') + ';' +
  'document.getElementById("print").onclick=function(){window.print()};' +
  'document.getElementById("save").onclick=function(){var b=new Blob(["<!doctype html>\\n"+document.documentElement.outerHTML],{type:"text/html"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},4000)};' +
  '})();</script></body></html>';

export { dayText, msText, grade, shortDay };

/** A whole bar of segments with a 2px gap, each its share; the legend carries the values. */
function stackHTML(parts: { cls: string; label: string; share: number }[]): string {
  const shown = parts.filter((p) => p.share > 0);
  return '<div class="stack" role="img" aria-label="' + esc(shown.map((p) => p.label + ' ' + pct(p.share)).join(', ')) + '">' +
    shown.map((p) => '<span class="' + p.cls + '" style="flex:' + p.share.toFixed(4) + ' 1 0" title="' + esc(p.label + ': ' + pct(p.share)) + '"></span>').join('') + '</div>' +
    '<ul class="legend">' + parts.map((p) => '<li><span class="sw ' + p.cls + '"></span>' + esc(p.label) + ' <b>' + pct(p.share) + '</b></li>').join('') + '</ul>';
}

/** How far off the notes were: a column for each 10 cents, coloured by how close. */
function centsChart(cents: readonly number[], median: number, W: number): string {
  const edges = [-Infinity, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, Infinity];
  const bins = edges.slice(0, -1).map((a, i) => ({ a, b: edges[i + 1]!, n: 0 }));
  for (const c of cents) bins.find((x) => c >= x.a && c < x.b)!.n++;
  const H = 180;
  const L = 8;
  const B = 34;
  const top = 32;
  const most = Math.max(1, ...bins.map((x) => x.n));
  const bw = (W - 2 * L) / bins.length;
  const y = (n: number) => H - B - ((H - B - top) * n) / most;
  const x0 = (i: number) => L + i * bw;
  let svg = '<svg class="chart ' + (W < 500 ? 'narrow' : 'wide') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="How far off the notes were: ' + esc(bins.map((x) => (Number.isFinite(x.a) ? x.a : 'under −50') + ': ' + x.n).join(', ')) + '">';
  svg += '<line class="gl" x1="' + L + '" x2="' + (W - L) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>';
  bins.forEach((x, i) => {
    const mid = Number.isFinite(x.a) && Number.isFinite(x.b) ? (x.a + x.b) / 2 : x.a < 0 ? -60 : 60;
    const cls = band(mid);
    const h = H - B - y(x.n);
    const w = Math.min(24, bw - 2);
    const cx = x0(i) + bw / 2;
    const label = (Number.isFinite(x.a) ? (Number.isFinite(x.b) ? signed(x.a) + ' to ' + signed(x.b) : 'over +50') : 'under −50') + ' cents: ' + x.n + ' note' + (x.n === 1 ? '' : 's');
    svg += '<g><title>' + esc(label) + '</title><rect x="' + (x0(i)) + '" y="' + top + '" width="' + bw + '" height="' + (H - B - top) + '" fill="transparent"/>';
    if (x.n) svg += '<path class="' + cls + '" style="fill:var(--c)" d="M' + n1(cx - w / 2) + ' ' + (H - B) + 'V' + n1(y(x.n) + Math.min(4, h)) + 'q0 -' + Math.min(4, h) + ' ' + Math.min(4, h) + ' -' + Math.min(4, h) + 'H' + n1(cx + w / 2 - Math.min(4, h)) + 'q' + Math.min(4, h) + ' 0 ' + Math.min(4, h) + ' ' + Math.min(4, h) + 'V' + (H - B) + 'Z"/>';
    svg += '</g>';
  });
  // The edges' labels, and flat and sharp.
  [-50, -30, -10, 10, 30, 50].forEach((c) => {
    const i = edges.indexOf(c);
    svg += '<text class="ax" x="' + n1(x0(i)) + '" y="' + (H - B + 14) + '" text-anchor="middle">' + signed(c) + '</text>';
  });
  svg += '<text class="ax" x="' + n1(x0(6)) + '" y="' + (H - B + 14) + '" text-anchor="middle">0</text>';
  svg += '<text class="ax" x="' + L + '" y="' + (H - 4) + '">← flat (low)</text><text class="ax" x="' + (W - L) + '" y="' + (H - 4) + '" text-anchor="end">sharp (high) →</text>';
  // The middle of them.
  const xm = x0(6) + (Math.max(-60, Math.min(60, median)) / 10) * bw;
  svg += '<line x1="' + n1(xm) + '" x2="' + n1(xm) + '" y1="4" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1.5"/><text class="ax" x="' + n1(xm > W * 0.6 ? xm - 5 : xm + 5) + '" y="13" text-anchor="' + (xm > W * 0.6 ? 'end' : 'start') + '">your middle: ' + signed(median) + ' cents</text>';
  return svg + '</svg>';
}

/** Scores over time (or rounds): one line, 0 to 100, the in-tune and close marks as hairlines,
 * the last point named. */
export function scoreLine(points: { label: string; score: number; at?: string; x?: number }[], what: string, W: number): string {
  const H = 180;
  const L = 34;
  const R = 60;
  const T = 14;
  const B = 26;
  // Evenly spaced, or by `x` (a day, so that gaps between days show) when every point has one.
  const xs = points.map((p) => p.x ?? NaN);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const timed = xs.every(Number.isFinite) && x1 > x0;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : timed ? L + ((W - L - R) * (xs[i]! - x0)) / (x1 - x0) : L + ((W - L - R) * i) / (points.length - 1));
  const y = (s: number) => T + ((H - T - B) * (100 - s)) / 100;
  let svg = '<svg class="chart ' + (W < 500 ? 'narrow' : 'wide') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(what + ': ' + points.map((p) => p.label + ' ' + p.score).join(', ')) + '">';
  for (const [s, word] of [[0, '0'], [60, '60 close'], [85, '85 in tune'], [100, '100']] as const) {
    svg += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + n1(y(s)) + '" y2="' + n1(y(s)) + '"/><text class="ax" x="' + (L - 6) + '" y="' + n1(y(s) + 4) + '" text-anchor="end">' + word.split(' ')[0] + '</text>';
    if (word.includes(' ')) svg += '<text class="ax" x="' + (W - R + 12) + '" y="' + n1(y(s) + 4) + '">' + word.slice(word.indexOf(' ') + 1) + '</text>';
  }
  if (points.length > 1) svg += '<polyline points="' + points.map((p, i) => n1(x(i)) + ',' + n1(y(p.score))).join(' ') + '" fill="none" stroke="var(--brass)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    svg += '<g tabindex="0"><title>' + esc(p.label + ': ' + p.score) + '</title><circle cx="' + n1(x(i)) + '" cy="' + n1(y(p.score)) + '" r="12" fill="transparent"/>' +
      '<circle cx="' + n1(x(i)) + '" cy="' + n1(y(p.score)) + '" r="' + (last ? 5.5 : 4) + '" fill="' + (last ? 'var(--ink)' : 'var(--brass)') + '" stroke="var(--card)" stroke-width="2"/></g>';
  });
  const lp = points[points.length - 1]!;
  svg += '<text class="ax" x="' + n1(x(points.length - 1)) + '" y="' + n1(y(lp.score) - 10) + '" text-anchor="middle" style="font-weight:600;fill:var(--ink)">' + lp.score + '</text>';
  if (points.length > 1) svg += '<text class="ax" x="' + n1(x(0)) + '" y="' + (H - 6) + '" text-anchor="start">' + esc(points[0]!.at ?? points[0]!.label) + '</text>';
  svg += '<text class="ax" x="' + n1(x(points.length - 1)) + '" y="' + (H - 6) + '" text-anchor="' + (points.length > 1 ? 'end' : 'middle') + '">' + esc(lp.at ?? lp.label) + '</text>';
  return svg + '</svg>';
}

/** A line as it was sung: its notes as bars at their pitch, the voice drawn over them, in tune
 * green, close amber, off red, grey where no note played. */
function stripSVG(o: SessionFileInput, line: number, pass: number, lo: number, hi: number): string {
  const p = o.detail!.pitch!;
  const notes = p.notes.filter((n) => n.line === line && n.pass === pass && n.status !== 'short').sort((a, b) => a.t0 - b.t0);
  if (!notes.length) return '';
  const a = notes[0]!.t0;
  const b = notes[notes.length - 1]!.t1;
  const W = 1000;
  const H = 100;
  const X = (t: number) => n1(((t - a) / (b - a)) * W);
  const Y = (c: number) => n1(H - ((Math.max(lo, Math.min(hi, c)) - lo) / (hi - lo)) * H);
  const saHz = o.detail!.played.saHz;
  let svg = '<svg class="strip" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Line ' + (line + 1) + ': the notes and your voice">';
  // Beats, faint.
  for (const bt of p.beats) if (bt[2] === pass && bt[0] > a + 1e-3 && bt[0] < b - 1e-3) svg += '<line x1="' + X(bt[0]) + '" x2="' + X(bt[0]) + '" y1="0" y2="' + H + '" stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke"/>';
  const bh = Math.max(4, (100 / (hi - lo)) * H * 0.7);
  for (const n of notes) {
    const c = 100 * n.semi + 1200 * n.oct;
    const cls = n.status === 'sung' && n.score != null ? grade(n.score) : 'none';
    const tip = noteWords(n.semi, n.oct) + (n.status === 'sung' ? ': score ' + n.score + (n.cents != null ? ', ' + signed(n.cents) + ' cents' : '') + (n.arrive != null ? (n.arrive >= ON_TIME ? ', reached ' + msText(n.arrive) + ' late' : ', on time') : ', never reached') : ': not sung');
    svg += '<rect class="nb ' + cls + '" style="fill:var(--c)" x="' + X(n.t0) + '" y="' + n1(Number(Y(c)) - bh / 2) + '" width="' + n1(Math.max(1, Number(X(n.t1)) - Number(X(n.t0)) - 2)) + '" height="' + n1(bh) + '" rx="2"><title>' + esc(tip) + '</title></rect>';
  }
  // The voice, in runs of one colour.
  const at = (t: number) => notes.find((n) => t >= n.t0 && t < n.t1) ?? null;
  let run: string[] = [];
  let cls = '';
  let lastT = -Infinity;
  const flush = () => {
    if (run.length > 1) svg += '<polyline class="' + cls + '" style="stroke:var(--c)" points="' + run.join(' ') + '"/>';
    run = [];
  };
  for (let i = 0; i + 1 < p.readings.length; i += 2) {
    const t = p.readings[i]! - p.lag;
    const hz = p.readings[i + 1]!;
    if (t < a || t > b) continue;
    if (!(hz > 0) || t - lastT > 0.08) flush();
    if (!(hz > 0)) continue;
    const y = centsFromSa(hz, saHz) - 1200 * p.octave;
    const n = at(t);
    let k = 'none';
    if (n) {
      const e = centsFromSa(hz, saHz) - (100 * n.semi + 1200 * n.oct);
      k = band(judged(e, p.anyOctave, p.below));
    }
    const pt = X(t) + ',' + Y(y);
    if (k !== cls && run.length) {
      run.push(pt);
      flush();
    }
    cls = k;
    run.push(pt);
    lastT = t;
  }
  flush();
  return svg + '</svg>';
}

/** The report's HTML: a whole page. */
export function reportHTML(o: SessionFileInput & { script: Script }): string {
  const { e, detail, ins, script } = o;
  const song = detail?.played ?? o.songNow;
  const p = detail?.pitch && detail.pitch.notes.length ? detail.pitch : null;
  const T = song ? taalInfo(song.taal) : null;
  const P = song ? parseSong(song.text) : null;
  const lines = e.from === e.to ? 'line ' + (e.from + 1) : 'lines ' + (e.from + 1) + '–' + (e.to + 1);
  const when = [dayText(e.at), lengthText(e.secs) + ' practised', lines + (e.loop && e.rounds > 1 ? ', ' + e.rounds + ' rounds' : ''),
    (T ? T.name : '') , (e.top > e.tempo ? e.tempo + '→' + e.top : e.tempo) + ' matras a minute'].filter(Boolean);
  if (e.routine) when.push('rewaz: ' + e.routine);
  const fileName = exportName(stamp(e.at), e.title || 'Session', 'Report');

  let html = reportHead(e.title + ' · practice report · ' + shortDay(e.at));
  html += '<header class="hero"><div class="wrap"><div class="brand">Gaaner Sathi · <b>গানের সাথী</b> · practice report</div><h1>' + esc(e.title || song?.title || 'Practice') + '</h1>' +
    '<div class="when">' + when.map(esc).join(' · ') + '</div>' +
    '<div class="acts"><button type="button" id="print">Print or save as PDF</button><button type="button" id="save">Save this report</button></div></div></header>';
  html += '<div class="wrap"><main>';

  // The score and the session in a sentence.
  const s = ins.score;
  const last = ins.history[ins.history.length - 1];
  html += '<section class="card top"><div>' +
    (s != null
      ? '<div class="hero-n">' + s + '<small> / 100</small></div><div class="meter"><span class="' + grade(s) + '" style="width:' + s + '%;background:var(--c)"></span></div><div class="sub"><span class="dot ' + grade(s) + '"></span>' + GRADE_WORD[grade(s)] + (last ? ' · ' + (s >= last.score ? '+' : '−') + Math.abs(s - last.score) + ' on last time' : '') + '</div>'
      : '<div class="hero-n">–</div><div class="sub">No pitch score</div>') +
    '</div><p class="headline">' + esc(ins.headline) + '</p></section>';

  // Tiles.
  const tiles: [string, string, string][] = [];
  if (ins.sung != null) tiles.push(['Notes sung', pct(ins.sung), ins.counts.sung + ' of ' + ins.counts.judged + ' notes']);
  if (ins.pitch) tiles.push(['In tune', pct(ins.pitch.inTune), 'of the notes sung, within ' + IN_TUNE + ' cents']);
  const b = ins.timing?.behind;
  if (ins.timing) tiles.push(['Timing', b == null ? '–' : Math.abs(b) < 0.06 ? 'On time' : msText(b) + (b > 0 ? ' late' : ' early'), b == null ? 'not enough singing to say' : 'behind the music, on average']);
  if (ins.pitch) tiles.push(['Tendency', signed(ins.pitch.median) + ' cents', ins.pitch.median >= 10 ? 'a little sharp (high)' : ins.pitch.median <= -10 ? 'a little flat (low)' : 'neither sharp nor flat']);
  tiles.push(['Practised', lengthText(e.secs), lines + (e.loop && e.rounds > 1 ? ' × ' + e.rounds : '')]);
  html += '<section class="tiles">' + tiles.map(([l, v, sub]) => '<div class="tile"><span class="l">' + esc(l) + '</span><span class="v">' + esc(v) + '</span><span class="s">' + esc(sub) + '</span></div>').join('') + '</section>';

  // What went well, what to work on.
  const list = (items: string[], cls: string, icon: string, empty: string) =>
    items.length ? '<ul class="f">' + items.map((t) => '<li><span class="ic ' + cls + '" aria-hidden="true">' + icon + '</span><span>' + esc(t) + '</span></li>').join('') + '</ul>' : '<p class="empty">' + esc(empty) + '</p>';
  html += '<section class="two"><div class="card"><h2>What went well</h2>' + list(ins.good, 'good', '✓', p ? 'Nothing stood out this time.' : 'Switch on Check my pitch to see this.') + '</div>' +
    '<div class="card"><h2>What to work on</h2>' + list(ins.work, 'work', '→', p ? 'Nothing stood out: keep going.' : 'Switch on Check my pitch to see this.') + '</div></section>';

  // Timing.
  const t = ins.timing;
  if (t && t.n) {
    html += '<section class="card"><h2>Coming in on time</h2><p class="sub">How soon your voice reached each new note (a change of note, or after a rest): ' + t.n + ' of them.' +
      (b != null ? ' Over the session your voice came ' + (Math.abs(b) < 0.06 ? 'with the music.' : msText(b) + (b > 0 ? ' behind' : ' ahead of') + ' the music.') : '') + '</p>' +
      stackHTML([
        { cls: 'good', label: 'On time (under ' + msText(ON_TIME) + ')', share: t.onTime },
        { cls: 'ok', label: 'A little late (to ' + msText(LATE) + ')', share: t.littleLate },
        { cls: 'off', label: 'Late', share: t.late },
        { cls: 'none', label: 'Never reached', share: t.never },
      ]);
    if (t.leap != null && t.step != null) {
      const most = Math.max(t.leap, t.step, 0.05);
      html += '<div class="cmp"><span>Nearby notes</span><span class="bar"><span style="width:' + Math.round((t.step / most) * 100) + '%"></span>' + msText(t.step) + '</span>' +
        '<span>Big jumps</span><span class="bar"><span style="width:' + Math.round((t.leap / most) * 100) + '%"></span>' + msText(t.leap) + '</span></div><p class="sub">The middle time to reach a note one or two semitones away, and five or more.</p>';
    }
    html += '</section>';
  }

  // Pitch.
  if (p && ins.pitch) {
    const cents = p.notes.filter((n) => n.status === 'sung' && n.cents != null).map((n) => n.cents!);
    html += '<section class="card"><h2>How close to the notes</h2><p class="sub">Each note sung, by how far from it you held it once you reached it. 100 cents is a semitone; within ' + IN_TUNE + ' is in tune, within ' + CLOSE + ' close.</p>' +
      centsChart(cents, ins.pitch.median, 640) + centsChart(cents, ins.pitch.median, 340) +
      '<p class="sub">' + cents.length + ' notes; point at a column for how many.</p><ul class="legend"><li><span class="sw good"></span>In tune</li><li><span class="sw ok"></span>Close</li><li><span class="sw off"></span>Off</li></ul></section>';
    if (ins.swaras.length) {
      const most = Math.max(30, ...ins.swaras.map((x) => Math.abs(x.cents)));
      const key = { key: song ? keyOfHz(song.saHz) : 0, mixed: false };
      html += '<section class="card"><h2>Note by note</h2><p class="sub">Each note you sang on a harmonium’s keys, ' + saOnText(key, true) + ', coloured by its score; ▲ and ▼ mark notes usually sharp or flat.</p>' +
        noteKeysHTML(ins.swaras, script, false, key.key) + noteKeysLegend(ins.swaras) + '<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Note</th><th class="num">Times</th><th class="num">Score</th><th>Usually</th><th class="num">Cents</th></tr></thead><tbody>' +
        ins.swaras.map((x) => {
          const w = (Math.min(Math.abs(x.cents), most) / most) * 50;
          return '<tr><td><span class="note">' + beatNoteHTML({ units: [{ k: 'note', semi: x.semi, oct: x.oct }] }, script) + '</span><span class="sub nw">' + esc(noteWords(x.semi, x.oct)) + '</span></td><td class="num">' + x.n + '</td>' +
            '<td class="num"><span class="dot ' + grade(x.score) + '"></span>' + x.score + '</td>' +
            '<td><div class="div ' + band(x.cents) + '" title="' + esc(signed(x.cents) + ' cents') + '"><span style="' + (x.cents < 0 ? 'right:50%' : 'left:50%') + ';width:' + n1(w) + '%"></span></div></td>' +
            '<td class="num">' + signed(x.cents) + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="sub">The bar goes left for flat (low), right for sharp (high).</p></section>';
    }
  }

  // Line by line.
  if (ins.lines.length) {
    html += '<section class="card"><h2>Line by line</h2>';
    if (p && P) {
      const all = p.notes.filter((n) => n.status !== 'short').map((n) => 100 * n.semi + 1200 * n.oct);
      const lo = Math.min(...all) - 100;
      const hi = Math.max(...all) + 100;
      let pairs = Array.from(new Set(p.notes.map((n) => n.pass + ':' + n.line))).map((k) => k.split(':').map(Number) as [number, number]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      let note = '';
      if (pairs.length > 40) {
        const lastPass = new Map<number, number>();
        for (const [k, l] of pairs) lastPass.set(l, Math.max(lastPass.get(l) ?? 0, k));
        pairs = Array.from(lastPass, ([l, k]) => [k, l] as [number, number]).sort((x, y) => x[1] - y[1]);
        note = '<p class="sub">Each line’s last round is drawn; the file for AI has every round.</p>';
      }
      const lr = new Map(p.lines.map((l) => [l[1] + ':' + l[0], l[2]]));
      html += '<p class="sub">Each line’s notes as bars at their pitch, coloured by their score, and your voice drawn over them: green in tune, amber close, red off, grey where no note played or you slid into one.</p>' + note;
      for (const [k, l] of pairs) {
        const nl = P.noteLines[l];
        const sc = lr.get(k + ':' + l) ?? null;
        const stat = ins.lines.find((x) => x.line === l);
        html += '<div class="line"><div class="lhead"><h3>Line ' + (l + 1) + (e.loop && pairs.some((x) => x[0] > 0) ? ' · round ' + (k + 1) : '') + '</h3>' +
          (sc != null ? '<span class="chip"><span class="dot ' + grade(sc) + '"></span>' + sc + '</span>' : '<span class="chip"><span class="dot none"></span>not sung</span>') +
          (stat?.behind != null && Math.abs(stat.behind) >= 0.06 ? '<span class="sub">' + msText(stat.behind) + (stat.behind > 0 ? ' late' : ' early') + '</span>' : '') + '</div>' +
          (nl ? '<div class="beats">' + nl.beats.map((bt) => '<span class="bt"><span class="nt">' + beatNoteHTML(bt, script) + '</span>' + lyricHTML({ lyrics: (bt as { lyrics?: string[] }).lyrics?.slice(0, 1) }) + '</span>').join('') + '</div>' : '') +
          stripSVG(o, l, k, lo, hi) + '</div>';
      }
    }
    html += '<div class="scroll"><table><thead><tr><th>Line</th><th class="num">Score</th>' + (p ? '<th class="num">Sung</th><th class="num">Rounds</th><th class="num">Timing</th>' : '') + '</tr></thead><tbody>' +
      ins.lines.map((l) => '<tr><td>' + (l.line + 1) + '</td><td class="num">' + (l.score != null ? '<span class="dot ' + grade(l.score) + '"></span>' + l.score : '–') + '</td>' +
        (p ? '<td class="num">' + pct(l.sung) + '</td><td class="num">' + l.rounds + '</td><td class="num">' + (l.behind == null ? '–' : Math.abs(l.behind) < 0.06 ? 'on time' : msText(l.behind) + (l.behind > 0 ? ' late' : ' early')) + '</td>' : '') + '</tr>').join('') +
      '</tbody></table></div></section>';
  }

  // Rounds, and the song over time.
  if (ins.rounds.length > 1) {
    html += '<section class="card"><h2>Round by round</h2>' + [640, 340].map((w) => scoreLine(ins.rounds.map((r) => ({ label: 'Round ' + (r.round + 1), score: r.score })), 'Score each round', w)).join('') + '</section>';
  }
  if (ins.history.length && s != null) {
    const pts = [...ins.history.map((h) => ({ label: shortDay(h.at), score: h.score, at: shortDay(h.at) })), { label: 'This session', score: s, at: 'this session' }];
    html += '<section class="card"><h2>This song over time</h2><p class="sub">Your score each time you practised it with the pitch check' + (ins.history.length >= 12 ? ' (the last 12 times)' : '') + '.</p>' + scoreLine(pts, 'Scores for this song', 640) + scoreLine(pts, 'Scores for this song', 340) + '</section>';
  }

  // What to bear in mind, and how it is worked out.
  html += '<section class="card"><h2>Bear in mind</h2>' + list(ins.notes, 'note', 'i', 'Nothing to add.') +
    '<p class="sub" style="margin-top:10px">How it is worked out: while each note plays, the app compares your voice with it many times a second. Right on the note gets full marks; the further off, the fewer, and over half a semitone off gets none. Breaths, pauses and sliding into a note are left out, and so are notes you did not sing. The app never moves your singing in time to make it fit, so singing late lowers the score.</p></section>';
  html += '</main><footer><p>Made by Gaaner Sathi (গানের সাথী) in this browser on ' + esc(dayText(o.made)) + '. Nothing was uploaded.</p></footer></div>';
  return html + reportScript(fileName);
}

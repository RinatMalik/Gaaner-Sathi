/**
 * How each note of the scale went, drawn on a harmonium's keys (Rinat, 2026-10-20: "Do not like
 * the visual on note by note. is there a more elegant/stylish way to represent this? should the
 * alternative notes, komal, tivra etc be included?"), from the lowest note sung to the highest, by
 * octave. Sa is on the key the songs were played in (Rinat, 2026-10-28: "The note by note shows
 * my Sa as c not c#"), so with Sa on C♯ it is a black key, Re and Ma too, as on the keyboard;
 * until then Sa was always the first white key, as C. Each key sung is coloured by
 * its average score (in tune, close, off, as the Practice view), with the score on it and ▲ or ▼
 * when it is usually sharp or flat; keys not sung stay plain. Used by Progress (the keys are
 * buttons that say their numbers), the session report and the song report. Pure, so it is
 * tested in Node.
 */
import { noteWords } from '../core/practice/insights';
import type { NoteScore } from '../core/practice/log';
import { beatNoteHTML, esc, KEYS, PAD_OCTAVES, type Script } from './view';

/** A note sung fewer times than this says little: hatched, and left out of the summaries. */
export const FEW = 5;
/** Usually this many cents off or more: marked sharp or flat. */
export const LEAN = 15;

const WHITE = new Set([0, 2, 4, 5, 7, 9, 11]);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const grade = (s: number) => (s >= 85 ? 'good' : s >= 60 ? 'ok' : 'off');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string) => n + ' ' + one + (n === 1 ? '' : 's');

/** "Usually 22 cents flat", "Usually on the note". */
export function leanText(cents: number): string {
  const c = Math.abs(cents);
  return c <= 5 ? 'on the note' : c + ' cents ' + (cents < 0 ? 'flat' : 'sharp');
}

/** A note's numbers in a sentence. */
export const noteKeyText = (s: NoteScore): string =>
  cap(noteWords(s.semi, s.oct)) + ': sung ' + plural(s.n, 'time') + ', average score ' + s.score + ', usually ' + leanText(s.cents) + '.';

/** The key Sa is on, 0 (C) to 11 (B), from its frequency. */
export const keyOfHz = (hz: number): number => mod(Math.round(12 * Math.log2(hz / 440)) + 9, 12);

/** The key most of the singing was on, from each session's [key, seconds], and whether some was
 * on another; C when there is none. */
export function mainKey(ks: readonly (readonly [number, number])[]): { key: number; mixed: boolean } {
  const t = new Map<number, number>();
  for (const [k, secs] of ks) t.set(k, (t.get(k) ?? 0) + Math.max(secs, 1));
  let key = 0;
  let most = -1;
  for (const [k, v] of t) if (v > most) [key, most] = [k, v];
  return { key, mixed: t.size > 1 };
}

/** "Sa on C♯, the key they were played in", for the keys' description; `it`: of one song or
 * session ("the key it was played in", "most of its sessions were"). */
export const saOnText = (k: { key: number; mixed: boolean }, it = false): string =>
  'Sa on ' + (KEYS[k.key]?.[0] ?? 'C') + ', the key ' + (k.mixed ? (it ? 'most of its sessions were' : 'most of them were') : it ? 'it was' : 'they were') + ' played in';

/** The keys, from the lowest note sung to the highest (white keys at both ends), Sa on key
 * `saKey` (0, C, to 11, B), each sung one coloured by its score; `interactive` makes them
 * buttons (Progress says a key's numbers when it is tapped). */
export function noteKeysHTML(ns: readonly NoteScore[], script: Script, interactive = false, saKey = 0): string {
  if (!ns.length) return '';
  const by = new Map(ns.map((s) => [s.semi + 12 * s.oct, s]));
  const white = (k: number) => WHITE.has(mod(k + saKey, 12));
  let lo = Math.min(...by.keys());
  let hi = Math.max(...by.keys());
  while (!white(lo)) lo--;
  while (!white(hi)) hi++;
  const whites: number[] = [];
  for (let k = lo; k <= hi; k++) if (white(k)) whites.push(k);
  const w = 100 / whites.length;
  const key = (k: number, black: boolean, style = '') => {
    const s = by.get(k);
    const glyph = '<span class="nkg">' + beatNoteHTML({ units: [{ k: 'note', semi: mod(k, 12), oct: Math.floor(k / 12) }] }, script) + '</span>';
    const side = black ? 'b' : 'w';
    if (!s) return '<span class="nk ' + side + ' none"' + style + '>' + (black ? '' : glyph) + '</span>';
    const lean = Math.abs(s.cents) >= LEAN ? '<i>' + (s.cents < 0 ? '▼' : '▲') + '</i>' : '';
    const text = esc(noteKeyText(s));
    const open = interactive ? '<button type="button" aria-pressed="false"' : '<span role="img"';
    return open + ' class="nk ' + side + ' ' + grade(s.score) + (s.n < FEW ? ' few' : '') + '"' + style + ' data-k="' + k + '" aria-label="' + text + '" title="' + text + '">' +
      glyph + '<span class="nks">' + s.score + lean + '</span>' + (interactive ? '</button>' : '</span>');
  };
  let html = '<div class="nkwrap" style="--nw:' + whites.length + '"><div class="nkb" role="group" aria-label="' + esc('Your notes on a keyboard, from ' + noteWords(mod(lo, 12), Math.floor(lo / 12)) + ' to ' + noteWords(mod(hi, 12), Math.floor(hi / 12))) + '">';
  html += whites.map((k) => key(k, false)).join('');
  whites.forEach((k, i) => {
    if (k + 1 < hi && !white(k + 1)) html += key(k + 1, true, ' style="left:' + ((i + 1) * w - w * 0.3).toFixed(3) + '%;width:' + (w * 0.6).toFixed(3) + '%"');
  });
  html += '</div>';
  // The octaves under their keys.
  const octs: { oct: number; n: number }[] = [];
  for (const k of whites) {
    const o = Math.floor(k / 12);
    if (octs.length && octs[octs.length - 1]!.oct === o) octs[octs.length - 1]!.n++;
    else octs.push({ oct: o, n: 1 });
  }
  html += '<div class="nkoct" style="grid-template-columns:' + octs.map((o) => o.n + 'fr').join(' ') + '">' + octs.map((o) => {
    const [word, bn] = (PAD_OCTAVES[o.oct] ?? '').split(' · ');
    return '<span>' + esc((word ?? '').replace(' octave', '')) + (bn ? '<span class="bn"> · ' + esc(bn) + '</span>' : '') + '</span>';
  }).join('') + '</div></div>';
  return html;
}

/** What the colours and marks mean. */
export function noteKeysLegend(ns: readonly NoteScore[]): string {
  const items = ['<li><span class="sw good"></span>In tune, 85 and over</li>', '<li><span class="sw ok"></span>Close, 60 to 84</li>', '<li><span class="sw off"></span>Off, under 60</li>', '<li><span class="sw none"></span>Not sung</li>'];
  if (ns.some((s) => Math.abs(s.cents) >= LEAN)) items.push('<li>▲ ▼ usually sharp or flat (' + LEAN + ' cents or more)</li>');
  if (ns.some((s) => s.n < FEW)) items.push('<li><span class="sw few"></span>Sung under ' + FEW + ' times</li>');
  return '<ul class="nkleg">' + items.join('') + '</ul>';
}

/** The best notes, and those well below them (sung FEW times or more; null under three such). */
export function noteHighlights(ns: readonly NoteScore[]): { best: NoteScore[]; weak: NoteScore[] } | null {
  const sure = ns.filter((s) => s.n >= FEW).sort((a, b) => b.score - a.score || b.n - a.n);
  if (sure.length < 3) return null;
  const top = sure[0]!.score;
  const best = sure.filter((s) => s.score >= top - 5).slice(0, 3);
  const weak = [...sure].reverse().filter((s) => s.score <= top - 10 && !best.includes(s)).slice(0, 3);
  return { best, weak };
}

/** "upper Sa (66, usually flat)". */
export const noteBrief = (s: NoteScore): string => noteWords(s.semi, s.oct) + ' (' + s.score + (Math.abs(s.cents) >= LEAN ? ', usually ' + (s.cents < 0 ? 'flat' : 'sharp') : '') + ')';

/** The numbers, the highest note first. */
export function noteTableHTML(ns: readonly NoteScore[], script: Script): string {
  return '<table class="nkt"><thead><tr><th scope="col">Note</th><th scope="col" class="num">Times</th><th scope="col" class="num">Score</th><th scope="col">Usually</th></tr></thead><tbody>' +
    [...ns].reverse().map((s) => '<tr><th scope="row"><span class="nkg">' + beatNoteHTML({ units: [{ k: 'note', semi: s.semi, oct: s.oct }] }, script) + '</span> ' + esc(noteWords(s.semi, s.oct)) + '</th>' +
      '<td class="num">' + s.n + '</td><td class="num"><span class="nkd ' + grade(s.score) + '"></span>' + s.score + '</td><td>' + esc(leanText(s.cents)) + '</td></tr>').join('') +
    '</tbody></table>';
}

/** The keys' styles, in the reports' colour tokens (`--good`, `--ok`, `--off`, `--ink2`,
 * `--line`, `--f-note`): the reports put them in their page; the app adds them to its own
 * (main.ts), where `.pgkeys` gives them the app's tokens (styles.css). */
export const NOTEKEYS_CSS = `
.nkwrap{display:grid;gap:4px;overflow-x:auto;padding-bottom:2px;--kw:#fbfbf8;--kb:#1b1c24;--kink:#1b1c24;--kinkb:#f3f1ea}
@media (prefers-color-scheme:dark){.nkwrap{--kw:#d9d6cc;--kb:#0c0c0f}}
@media print{.nkwrap{--kw:#fff;--kb:#1b1c24}}
.nkb{position:relative;display:flex;height:150px;max-width:calc(var(--nw) * 64px);min-width:calc(var(--nw) * 22px);border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--line)}
.nk{font:inherit;position:relative;border:0;margin:0;padding:0 0 9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;min-width:0;overflow:hidden;color:var(--kink)}
.nk.w{flex:1 1 0;margin-right:1px;background:var(--kw)}
.nk.b{position:absolute;top:0;height:58%;z-index:1;background:var(--kb);color:var(--kinkb);border-radius:0 0 4px 4px;padding-bottom:6px}
.nk.w.good{background:color-mix(in srgb,var(--good) 34%,var(--kw));box-shadow:inset 0 -6px 0 var(--good)}
.nk.w.ok{background:color-mix(in srgb,var(--ok) 38%,var(--kw));box-shadow:inset 0 -6px 0 var(--ok)}
.nk.w.off{background:color-mix(in srgb,var(--off) 30%,var(--kw));box-shadow:inset 0 -6px 0 var(--off)}
.nk.b.good{background:color-mix(in srgb,var(--good) 80%,var(--kb))}
.nk.b.ok{background:color-mix(in srgb,var(--ok) 80%,var(--kb));color:var(--kink)}
.nk.b.off{background:color-mix(in srgb,var(--off) 80%,var(--kb))}
.nk.few::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 6px,color-mix(in srgb,var(--kw) 55%,transparent) 6px 9px)}
.nk.none .nkg{opacity:.4}
.nks{position:relative;font-weight:700;font-size:15px;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.nks i{font-style:normal;font-size:.72em;margin-left:1px}
.nkg{position:relative;font-family:var(--f-note);font-size:16px;line-height:1.6}
.nk.b .nkg{font-size:13px}
.nkoct{display:grid;font-size:12px;color:var(--ink2);text-align:center;max-width:calc(var(--nw) * 64px)}
.nkoct>span{border-top:2px solid var(--line);padding-top:2px;margin:0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nkleg{display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 0;padding:0;list-style:none;font-size:12.5px;color:var(--ink2)}
.nkleg li{display:flex;align-items:center;gap:6px}
.nkleg .sw{display:inline-block;width:12px;height:12px;border-radius:3px;background:#fbfbf8;border:1px solid var(--line)}
.nkleg .sw.few{background:repeating-linear-gradient(135deg,var(--ink2) 0 1px,transparent 1px 4px)}
.nkd{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.nkleg .sw.good,.nkd.good{background:var(--good);border-color:var(--good)}
.nkleg .sw.ok,.nkd.ok{background:var(--ok);border-color:var(--ok)}
.nkleg .sw.off,.nkd.off{background:var(--off);border-color:var(--off)}
.nkt th .nkg{font-size:18px;margin-right:4px}
@media (max-width:560px){.nkb{height:128px}.nks{font-size:12.5px}.nk.b .nks{font-size:10.5px}.nk.b .nks i{display:none}.nkg{font-size:14px}.nk.b .nkg{font-size:11px;line-height:1.3}.nkoct .bn{display:none}}
`;

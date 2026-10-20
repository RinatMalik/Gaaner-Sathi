/**
 * How each note of the scale went, drawn on a harmonium's keys (Rinat, 2026-10-20: "Do not like
 * the visual on note by note. is there a more elegant/stylish way to represent this? should the
 * alternative notes, komal, tivra etc be included?"): Sa is the first white key, as C, so the
 * shuddha notes are the white keys and komal Re, komal Ga, tivra Ma, komal Dha and komal Ni the
 * black ones, from the lowest note sung to the highest, by octave. Each key sung is coloured by
 * its average score (in tune, close, off, as the Practice view), with the score on it and ▲ or ▼
 * when it is usually sharp or flat; keys not sung stay plain. Used by Progress (the keys are
 * buttons that say their numbers), the session report and the song report. Pure, so it is
 * tested in Node.
 */
import { noteWords } from '../core/practice/insights';
import type { NoteScore } from '../core/practice/log';
import { beatNoteHTML, esc, PAD_OCTAVES, type Script } from './view';

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

/** The keys, from the lowest note sung to the highest (white keys at both ends), each sung one
 * coloured by its score; `interactive` makes them buttons (Progress says a key's numbers when
 * it is tapped). */
export function noteKeysHTML(ns: readonly NoteScore[], script: Script, interactive = false): string {
  if (!ns.length) return '';
  const by = new Map(ns.map((s) => [s.semi + 12 * s.oct, s]));
  let lo = Math.min(...by.keys());
  let hi = Math.max(...by.keys());
  while (!WHITE.has(mod(lo, 12))) lo--;
  while (!WHITE.has(mod(hi, 12))) hi++;
  const whites: number[] = [];
  for (let k = lo; k <= hi; k++) if (WHITE.has(mod(k, 12))) whites.push(k);
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
    if (k + 1 < hi && !WHITE.has(mod(k + 1, 12))) html += key(k + 1, true, ' style="left:' + ((i + 1) * w - w * 0.3).toFixed(3) + '%;width:' + (w * 0.6).toFixed(3) + '%"');
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
@media (max-width:560px){.nkb{height:128px}.nks{font-size:12.5px}.nk.b .nks{font-size:10.5px}.nk.b .nks i{display:none}.nkg{font-size:14px}.nk.b .nkg{display:none}.nkoct .bn{display:none}}
`;

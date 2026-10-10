/**
 * The screen's HTML, ported from the prototype's rendering functions
 * (reference/gaaner-sathi.html → Display names, Rendering). Pure string builders with no
 * DOM access: tests/differential/view.test.ts compares each one with the prototype's own
 * output. The prototype read the script, song and taal from globals; here they are
 * passed in.
 */
import type { GuideLevel, SoundSettings } from '../audio/sound';
import type { BeatEntry } from '../audio/transport';
import { checkNotation, type CheckIssue } from '../core/notation/check';
import { AKAR, BN_LETTER, LAT_LETTER, REPH } from '../core/notation/symbols';
import type { NoteUnit, ParsedSong, Unit } from '../core/notation/types';
import { LAYERS, type LayerId } from '../core/taal/rhythm';
import { TAAL_IDS, TAALS, type TaalInfo } from '../core/taal/taals';

/** Show notes as বাংলা or Sa Re Ga. */
export type Script = 'bn' | 'lat';

const mod = (a: number, n: number) => ((a % n) + n) % n;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) => ESC[c]!);

// ── Display names ────────────────────────────────────────────────────────────

export const BN_NAMES = BN_LETTER;
export const LAT_NAMES = ['Sa', 'Re', 'Re', 'Ga', 'Ga', 'Ma', 'Ma', 'Pa', 'Dha', 'Dha', 'Ni', 'Ni'] as const;
export const LAT_CODE = LAT_LETTER;
export const KOMAL: ReadonlySet<number> = new Set([1, 3, 8, 10]);
/** Each key with its CT-X3000 key, as Rinat finds it on the keyboard. */
export const KEYS = [['C', 'White 1'], ['C♯', 'Black 1'], ['D', 'White 2'], ['D♯', 'Black 2'], ['E', 'White 3'], ['F', 'White 4'], ['F♯', 'Black 3'], ['G', 'White 5'], ['G♯', 'Black 4'], ['A', 'White 6'], ['A♯', 'Black 5'], ['B', 'White 7']] as const;
export const OCTS = [[3, 'Low'], [4, 'Middle'], [5, 'High']] as const;

// ── Notes ────────────────────────────────────────────────────────────────────

/** What drawing a note needs: note buttons and checker messages make units without spans. */
export type ShownUnit = { k: 'note'; semi: number; oct: number } | { k: 'hold' } | { k: 'rest' };

export function unitHTML(u: ShownUnit, script: Script): string {
  if (u.k === 'hold') return '<span class="u hold">–</span>';
  if (u.k === 'rest') return '<span class="u rest">×</span>';
  let cls = 'u';
  let txt: string;
  if (script === 'bn') {
    txt = BN_NAMES[u.semi]!;
    if (u.oct > 0) txt = REPH.repeat(u.oct) + txt;
    if (u.oct < 0) cls += ' lo';
  } else {
    txt = LAT_NAMES[u.semi]!;
    if (KOMAL.has(u.semi)) cls += ' komal';
    if (u.semi === 6) cls += ' tivra';
    if (u.oct > 0) cls += ' hi';
    if (u.oct < 0) cls += ' lo';
  }
  return '<span class="' + cls + '">' + txt + '</span>';
}

/** A beat's notes. Bengali writes the আকার after the last note; Sa Re Ga spaces them. */
export function beatNoteHTML(b: { units: readonly ShownUnit[]; src?: string }, script: Script): string {
  if (!b.units.length) return '<span class="u rest">' + esc(b.src || '?') + '</span>';
  const parts = b.units.map((u) => unitHTML(u, script));
  if (script === 'bn' && b.units.length && b.units[b.units.length - 1]!.k === 'note') {
    const i = parts.length - 1;
    parts[i] = parts[i]!.replace(/<\/span>$/, AKAR + '</span>');
  }
  return parts.join(script === 'bn' ? '' : '<span class="gap"></span>');
}

/** One row per verse; a held vowel (০ 0 - – —) is drawn faded. */
export function lyricHTML(b: { lyrics?: readonly string[] }): string {
  const rows = b.lyrics || [];
  if (!rows.length) return '<span class="ly"></span>';
  return rows.map((t) => '<span class="ly">' + (/^[০0\-–—]+$/.test(t) ? '<span class="held">' + esc(t) + '</span>' : esc(t)) + '</span>').join('');
}

/** A beat as plain text, for the line pickers. */
export function plainBeat(b: { units: readonly Unit[] }, script: Script): string {
  const s = b.units
    .map((u) => {
      if (u.k === 'hold') return '-';
      if (u.k === 'rest') return 'x';
      if (script === 'bn') return (u.oct < 0 ? '.' : '') + (u.oct > 0 ? REPH : '') + BN_NAMES[u.semi];
      return (u.oct < 0 ? '.' : '') + LAT_CODE[u.semi] + (u.oct > 0 ? "'" : '');
    })
    .join('');
  return script === 'bn' && b.units.length && b.units[b.units.length - 1]!.k === 'note' ? s + AKAR : s;
}

// ── The diary sheet ──────────────────────────────────────────────────────────

/** The sheet: headings, then each notes line with its number button, taal marks and bars
 * (the writer's bars, else vibhag lines). `off` is startOn − 1. */
export function sheetHTML(P: ParsedSong, T: TaalInfo, off: number, example: boolean, script: Script): string {
  if (!P.items.length) {
    return '<div class="empty">No notes yet. ' + (example ? '' : 'Type the first line from your diary in the box on the left, or use the note buttons.') + '</div>';
  }
  let html = '';
  for (const it of P.items) {
    if (it.type === 'head') {
      html += '<div class="shead">' + esc(it.text) + '</div>';
      continue;
    }
    const userBars = it.bars.size > 0;
    let row = '';
    it.beats.forEach((b, j) => {
      const p = mod(b.g + off, T.cycle);
      if (j > 0 && (userBars ? it.bars.has(j) : T.markAt.has(p))) row += '<span class="bar" aria-hidden="true"></span>';
      const mk = T.markAt.get(p);
      row += '<span class="beat' + (b.err ? ' bad' : '') + '" data-b="' + b.g + '"' + (b.err ? ' title="' + esc(b.err) + '"' : '') + '>' +
        '<span class="tm">' + (mk != null ? mk : '') + '</span>' +
        '<span class="nt' + (b.units.length > 1 ? ' multi' : '') + '">' + beatNoteHTML(b, script) + '</span>' + lyricHTML(b) + '</span>';
    });
    html += '<div class="line" data-n="' + it.n + '"><button type="button" class="ln" data-n="' + it.n + '" aria-label="Play from line ' + (it.n + 1) + '">' + (it.n + 1) + '</button><div class="beats">' + row + '</div></div>';
  }
  return html;
}

// ── The taal strip ───────────────────────────────────────────────────────────

export const taalName = (T: TaalInfo): string => T.name + ' · ' + T.bn;
export const taalSub = (T: TaalInfo): string => T.cycle + ' matras, ' + T.vib.join(' + ');

/** Each beat with its mark, number and the current style's bol (`label`). */
export function taalStripHTML(T: TaalInfo, label: (p: number) => string): string {
  let html = '';
  T.vib.forEach((v, vi) => {
    html += '<div class="vib">';
    for (let k = 0; k < v; k++) {
      const p = T.starts[vi]! + k;
      html += '<div class="tb" data-p="' + p + '"><span class="tbm">' + (k === 0 ? T.marks[vi] : '') + '</span><span class="tbd">' + (p + 1) + '</span><span class="tbb">' + label(p) + '</span></div>';
    }
    html += '</div>';
  });
  return html;
}

// ── Now singing ──────────────────────────────────────────────────────────────

/** The section being played: beats secStart until secEnd. Loops wrap inside it. */
export interface Section {
  secStart: number;
  secEnd: number;
  secLen: number;
  loop: boolean;
}

/** The next `n` beats after beat g, as chips; while a loop plays (`wrap`), they wrap inside it. */
export function chipsHTML(P: ParsedSong, g: number, n: number, script: Script, wrap: Section | null): string {
  let html = '';
  for (let k = 1; k <= n; k++) {
    let x = g + k;
    if (wrap && wrap.loop && x >= wrap.secEnd) x = wrap.secStart + ((x - wrap.secEnd) % wrap.secLen);
    const b = P.beatList[x];
    if (!b) break;
    html += '<span class="chipb"><span class="nt">' + beatNoteHTML(b, script) + '</span>' + lyricHTML(b).replace(/<\/span><span class="ly">[\s\S]*$/, '</span>') + '</span>';
  }
  return html;
}

/** The panel's label, big note, big lyric and (when it changes) the coming-up chips. */
export interface NowView {
  label: string;
  big: string;
  ly: string;
  next?: string;
}

/** A message in the panel: a label, a line of help, and a big count. */
export function nowMessage(label: string, sub: string, big: string): NowView {
  return {
    label,
    big: big ? '<span class="count">' + esc(big) + '</span>' : '',
    ly: sub ? '<span class="row2" style="color:var(--ink-2);font-family:var(--f-ui)">' + esc(sub) + '</span>' : '',
  };
}

const bigLyric = (rows: readonly string[] | undefined) => (rows || []).map((t, i) => (i === 0 ? esc(t) : '<span class="row2">' + esc(t) + '</span>')).join('');

/** Before playing: where it will start, and that line's first beat. */
export function nowIdle(P: ParsedSong, T: TaalInfo, fromLine: number, example: boolean, countIn: boolean, script: Script): NowView {
  const L = P.noteLines;
  if (!L.length) return { ...nowMessage('Ready', example ? '' : 'Add notes in Edit notation to start.', ''), next: '' };
  const n = Math.max(0, Math.min(L.length - 1, fromLine));
  const first = L[n]!.beats[0]!;
  return {
    label: 'Ready · starts at line ' + (n + 1) + (countIn ? ' after one ' + T.name + ' cycle' : ''),
    big: beatNoteHTML(first, script),
    ly: bigLyric(first.lyrics),
    next: chipsHTML(P, first.g, 4, script, null),
  };
}

/** While playing: the count-in, or the beat being sung. Null when there is no such beat. */
export function nowBeat(P: ParsedSong, q: BeatEntry, sec: Section, ramp: boolean, guide: GuideLevel, script: Script): NowView | null {
  if (q.pass < 0) {
    const left = sec.secStart - q.raw;
    return { ...nowMessage('Count-in · you come in after ' + (left === 1 ? 'this beat' : left + ' beats'), '', String(left)), next: chipsHTML(P, sec.secStart - 1, 4, script, sec) };
  }
  const b = P.beatList[q.s];
  if (!b) return null;
  const ln = P.lineOfBeat[q.s]!;
  const nl = P.noteLines[ln]!;
  return {
    label: 'Line ' + (ln + 1) + ' · beat ' + (q.s - nl.start + 1) + ' of ' + nl.beats.length +
      (sec.loop ? ' · round ' + (q.pass + 1) : '') +
      (sec.loop && ramp ? ' · ' + q.tempo + ' per min' : '') +
      (sec.loop && !q.guide && guide !== 'off' ? ' · your turn, sing it alone' : ''),
    big: beatNoteHTML(b, script),
    ly: bigLyric(b.lyrics),
    next: chipsHTML(P, q.s, 4, script, sec),
  };
}

// ── Pickers ──────────────────────────────────────────────────────────────────

/** "Lines to practise": each line's number and first six beats. */
export function lineOptionsHTML(P: ParsedSong, script: Script): string {
  const L = P.noteLines;
  return L.length
    ? L.map((l) => '<option value="' + l.n + '">' + (l.n + 1) + ' · ' + esc(l.beats.slice(0, 6).map((b) => plainBeat(b, script)).join(' ')) + (l.beats.length > 6 ? ' …' : '') + '</option>').join('')
    : '<option value="0">no lines yet</option>';
}

export const keyOptionsHTML = (): string => KEYS.map((k, i) => '<option value="' + i + '">' + k[0] + ' · ' + k[1] + '</option>').join('');
export const octOptionsHTML = (): string => OCTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
export const taalOptionsHTML = (): string =>
  TAAL_IDS.map((id) => '<option value="' + id + '">' + TAALS[id].name + ' · ' + TAALS[id].bn + ' (' + TAALS[id].bols.length + ')</option>').join('');

/** "Song starts on taal beat", marking sam (X) and khali (0). */
export function startOnOptionsHTML(T: TaalInfo): string {
  let html = '';
  for (let p = 0; p < T.cycle; p++) {
    const mk = T.markAt.get(p);
    html += '<option value="' + (p + 1) + '">' + (p + 1) + (mk === 'X' ? ' · sam (X)' : mk === '0' ? ' · khali (0)' : '') + '</option>';
  }
  return html;
}

/** The song picker: "My songs" (already sorted by title), then the exercises. */
export function libraryHTML(own: readonly { id: string; title: string }[], exercises: readonly { id: string; title: string }[]): string {
  let html = '<optgroup label="My songs">';
  html += own.length ? own.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>').join('') : '<option disabled value="">No songs yet. Press + New song</option>';
  html += '</optgroup><optgroup label="Exercises">' + exercises.map((s) => '<option value="' + s.id + '">' + esc(s.title) + '</option>').join('') + '</optgroup>';
  return html;
}

/** The layer chips for a rhythm style, pressed when on; hidden when the style has none. */
export function layerChipsHTML(style: string, on: readonly string[]): { hidden: boolean; html: string } {
  const ids = (Object.keys(LAYERS) as LayerId[]).filter((id) => (LAYERS[id].styles as readonly string[]).includes(style));
  const set = new Set(on);
  return { hidden: !ids.length, html: ids.map((id) => '<button type="button" class="chip" data-layer="' + id + '" aria-pressed="' + set.has(id) + '">' + LAYERS[id].name + '</button>').join('') };
}

// ── Editor ───────────────────────────────────────────────────────────────────

/** The palette's 12 note buttons, in the current script and insert octave. */
export function noteButtonsHTML(insOct: number, script: Script): string {
  let html = '';
  for (let semi = 0; semi < 12; semi++) {
    const u: ShownUnit = { k: 'note', semi, oct: insOct };
    html += '<button type="button" class="nbtn" data-semi="' + semi + '" aria-label="Insert ' + (KOMAL.has(semi) ? 'komal ' : '') + (semi === 6 ? 'tivra ' : '') + LAT_NAMES[semi] + '">' + beatNoteHTML({ units: [u] }, script) + '</button>';
  }
  return html;
}

export function noteNames(us: readonly NoteUnit[], d: number, script: Script): string {
  return us.map((u) => beatNoteHTML({ units: [{ k: 'note', semi: u.semi, oct: u.oct + (d || 0) }] }, script)).join(' ');
}

/** What a checker row's Show and Fix buttons point at. */
export type IssueTarget = { kind: 'read'; g: number; g2: number } | CheckIssue;

/** The checker panel: a summary, then read errors, lyric warnings, bar and line lengths
 * and octave slips (the first 12), or an all-clear line. */
export function issuesHTML(P: ParsedSong, T: TaalInfo, off: number, script: Script): { html: string; list: IssueTarget[] } {
  const cyc = T.cycle;
  const list: IssueTarget[] = [];
  if (!P.noteLines.length) return { html: '<span class="ok">Nothing to play yet.</span>', list };
  const cycles = Math.floor(P.total / cyc);
  const rem = P.total % cyc;
  let html = '<span class="ok">' + P.noteLines.length + ' line' + (P.noteLines.length === 1 ? '' : 's') + ' · ' + P.total + ' matras · ' + cycles + ' cycle' + (cycles === 1 ? '' : 's') + ' of ' + T.name +
    (rem ? ' and ' + rem + ' matra' + (rem === 1 ? '' : 's') : '') + '</span>';
  const rows: { cls: string; text: string; i?: number; fix?: boolean }[] = [];
  P.errors.forEach((e) => {
    list.push({ kind: 'read', g: e.g, g2: e.g });
    rows.push({ cls: 'err', text: 'Line ' + e.line + ', “' + esc(e.tok) + '”: ' + esc(e.msg) + '. That beat plays what it could read.', i: list.length - 1 });
  });
  P.warnings.forEach((w) => rows.push({ cls: 'err', text: esc(w) }));
  for (const it of checkNotation(P, T, off)) {
    list.push(it);
    const i = list.length - 1;
    if (it.kind === 'octave') rows.push({ cls: 'warn', i, fix: true, text: 'Line ' + (it.line + 1) + ': <b>' + noteNames(it.notes, 0, script) + '</b> jumps more than an octave away from the notes on either side. Should ' + (it.notes.length > 1 ? 'they' : 'it') + ' be <b>' + noteNames(it.notes, it.delta, script) + '</b>?' });
    else if (it.kind === 'bar') rows.push({ cls: 'warn', i, text: 'Line ' + (it.line + 1) + ', bar ' + it.bar + ' has ' + it.len + ' beats. In ' + T.name + ' this bar should probably have ' + it.exp + ', so a beat may be missing or extra.' });
    else rows.push({ cls: 'warn', i, text: 'Line ' + (it.line + 1) + ' has ' + it.len + ' beats, so it ends partway through a ' + T.name + ' vibhag. A beat may be missing or extra.' });
  }
  if (!rows.length) html += '<div class="chkok">Checked: every bar lands on a ' + T.name + ' vibhag line and no note looks like an octave slip.</div>';
  else {
    html += '<div class="chkhead">' + rows.length + ' thing' + (rows.length === 1 ? '' : 's') + ' to check</div><ul>' +
      rows.slice(0, 12).map((r) => '<li class="' + r.cls + '"><span class="t">' + r.text + '</span>' +
        (r.i != null ? '<button type="button" class="ibtn" data-act="show" data-i="' + r.i + '">Show</button>' : '') +
        (r.fix ? '<button type="button" class="ibtn" data-act="fix" data-i="' + r.i + '">Fix</button>' : '') + '</li>').join('') +
      (rows.length > 12 ? '<li class="warn"><span class="t">and ' + (rows.length - 12) + ' more. Fix these first.</span></li>' : '') + '</ul>';
  }
  return { html, list };
}

// ── Sound bar (new: the prototype's settings, folded away) ─────────────────────

const STYLE_NAMES: Record<string, string> = { tabla: 'Tabla', dholak: 'Dholak', kit: 'Drums', click: 'Click' };

/** What the folded Sound settings are set to, in a line: "Tabla · Guide full · No drone".
 * Practice options are named only when they differ from the defaults. */
export function soundSummary(s: SoundSettings): string {
  const parts = [
    s.beat === 'off' ? 'No rhythm' : (STYLE_NAMES[s.beat] ?? s.beat) + (s.speed === 'half' ? ', half speed' : s.speed === 'double' ? ', double speed' : ''),
    'Guide ' + s.guide + (s.guide === 'off' ? '' : s.guideLoop === 'first' ? ', first round only' : s.guideLoop === 'alt' ? ', every other round' : ''),
    s.droneVol > 0 ? (s.droneType === 'harmonium' ? 'Harmonium drone' : 'Tanpura') : 'No drone',
  ];
  if (!s.countIn) parts.push('No count-in');
  if (s.ramp) parts.push('Speeds up by ' + s.rampStep + ' to ' + s.rampMax);
  return parts.join(' · ');
}

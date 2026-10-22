/**
 * The screen's HTML, ported from the prototype's rendering functions
 * (reference/gaaner-sathi.html → Display names, Rendering). Pure string builders with no
 * DOM access: tests/differential/view.test.ts compares each one with the prototype's own
 * output. The prototype read the script, song and taal from globals; here they are
 * passed in.
 */
import type { SoundSettings } from '../audio/sound';
import { checkNotation, issueKey, type CheckIssue } from '../core/notation/check';
import { asTaals, placeIn, type Taals } from '../core/notation/taalmap';
import { AKAR, BN_LETTER, LAT_LETTER, REPH } from '../core/notation/symbols';
import type { NoteUnit, ParsedSong, Unit } from '../core/notation/types';
import { LAYERS, type LayerId } from '../core/taal/rhythm';
import { TAAL_GROUPS, TAALS, type TaalInfo } from '../core/taal/taals';

/** Show notes as বাংলা or Sa Re Ga. */
export type Script = 'bn' | 'lat';

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
/** Sa as a keyboard names it, with its octave's number, middle C being C4: "C♯3" (Rinat,
 * 2026-10-21: "make the Sa octave picker say which keyboard octave it is (C3, C4, C5), so I can
 * match it to my Casio"). On a 61-key keyboard such as the CT-X3000, C2 to C7, octave 3 is the
 * second from the left. */
export const saKeyName = (saKey: number, saOct: number): string => (KEYS[saKey]?.[0] ?? '?') + saOct;
/** Sa in words, wherever the app names it: "C♯3 (Black 1), low octave". */
export const saWords = (s: { saKey: number; saOct: number }): string =>
  saKeyName(s.saKey, s.saOct) + ' (' + (KEYS[s.saKey]?.[1] ?? '?') + '), ' + (OCTS.find((o) => o[0] === s.saOct)?.[1] ?? '').toLowerCase() + ' octave';

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
    // One octave up, the রেফ; two up, two dots over the note, as fonts draw two রেফs badly
    // (Rinat, 2026-10-15; the prototype drew both রেফs).
    if (u.oct === 1) txt = REPH + txt;
    if (u.oct > 1) cls += ' up2';
    if (u.oct < 0) cls += ' lo';
  } else {
    txt = LAT_NAMES[u.semi]!;
    if (KOMAL.has(u.semi)) cls += ' komal';
    if (u.semi === 6) cls += ' tivra';
    if (u.oct > 0) cls += ' hi';
    if (u.oct < 0) cls += ' lo';
    if (u.oct > 1) cls += ' hi2';
  }
  // Two octaves down: two dots under the note, in either script (the prototype drew one).
  if (u.oct < -1) cls += ' lo2';
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
 * (the writer's bars, else vibhag lines). `taals`: the song's taal map, or one taal with `off`,
 * startOn − 1. */
export function sheetHTML(P: ParsedSong, taals: TaalInfo | Taals, off: number, example: boolean, script: Script): string {
  const M = asTaals(taals, off);
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
    const r = M.line(it.n);
    const T = r.T;
    let row = '';
    it.beats.forEach((b, j) => {
      const p = placeIn(r, b.g).p;
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

// ── The taal's name ──────────────────────────────────────────────────────────

export const taalName = (T: TaalInfo): string => T.name + ' · ' + T.bn;
export const taalSub = (T: TaalInfo): string => T.cycle + ' matras, ' + T.vib.join(' + ');

// ── Pickers ──────────────────────────────────────────────────────────────────

/** "Lines to practise": each line's number and first six beats. */
export function lineOptionsHTML(P: ParsedSong, script: Script): string {
  const L = P.noteLines;
  return L.length
    ? L.map((l) => '<option value="' + l.n + '">' + (l.n + 1) + ' · ' + esc(l.beats.slice(0, 6).map((b) => plainBeat(b, script)).join(' ')) + (l.beats.length > 6 ? ' …' : '') + '</option>').join('')
    : '<option value="0">no lines yet</option>';
}

export const keyOptionsHTML = (): string => KEYS.map((k, i) => '<option value="' + i + '">' + k[0] + ' · ' + k[1] + '</option>').join('');
/** The octaves of Sa, named with its key: "C♯3 · low", "C♯4 · middle", "C♯5 · high". */
export const octOptionsHTML = (saKey = 0): string => OCTS.map((o) => '<option value="' + o[0] + '">' + saKeyName(saKey, o[0]) + ' · ' + o[1].toLowerCase() + '</option>').join('');
/** The taal picker, in groups: the prototype's six first, then Tagore's own, then more. */
export const taalOptionsHTML = (): string =>
  TAAL_GROUPS.map((g) => '<optgroup label="' + esc(g.label) + '">' +
    g.ids.map((id) => '<option value="' + id + '">' + TAALS[id].name + ' · ' + TAALS[id].bn + ' (' + TAALS[id].bols.length + ')</option>').join('') + '</optgroup>').join('');

/** The top section's taal picker (Rinat, 2026-10-22): the song's own taal first ("Keherwa", or
 * "Keherwa, Dadra" when a section has its own), then every taal to play it in instead. */
export const taalPickHTML = (own: string): string => '<option value="">' + esc(own) + ' (song’s own)</option>' + taalOptionsHTML();

/** "Song starts on taal beat", marking sam (X) and khali (0). */
export function startOnOptionsHTML(T: TaalInfo): string {
  let html = '';
  for (let p = 0; p < T.cycle; p++) {
    const mk = T.markAt.get(p);
    html += '<option value="' + (p + 1) + '">' + (p + 1) + (mk === 'X' ? ' · sam (X)' : mk === '0' ? ' · khali (0)' : '') + '</option>';
  }
  return html;
}

/** The song picker: "My songs" (already sorted by title), then the exercises; or the
 * exercises first, as the Music library shows them (new). */
export function libraryHTML(own: readonly { id: string; title: string }[], exercises: readonly { id: string; title: string }[], exFirst = false): string {
  const mine = '<optgroup label="My songs">' +
    (own.length ? own.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>').join('') : '<option disabled value="">No songs yet. Press + New song</option>') + '</optgroup>';
  const ex = '<optgroup label="Exercises">' + exercises.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>').join('') + '</optgroup>';
  return exFirst ? ex + mine : mine + ex;
}

/** The layer chips for a rhythm style, pressed when on; hidden when the style has none. */
export function layerChipsHTML(style: string, on: readonly string[]): { hidden: boolean; html: string } {
  const ids = (Object.keys(LAYERS) as LayerId[]).filter((id) => (LAYERS[id].styles as readonly string[]).includes(style));
  const set = new Set(on);
  return { hidden: !ids.length, html: ids.map((id) => '<button type="button" class="chip" data-layer="' + id + '" aria-pressed="' + set.has(id) + '">' + LAYERS[id].name + '</button>').join('') };
}

// ── Editor ───────────────────────────────────────────────────────────────────

/** The octaves the note pad offers, with their names: as far as the notation goes, two either
 * side of the middle (Rinat, 2026-10-15). */
export const PAD_OCTAVES: Record<number, string> = {
  [-2]: 'Lowest octave · অতিমন্দ্র',
  [-1]: 'Lower octave · মন্দ্র',
  0: 'Middle octave · মধ্য',
  1: 'Upper octave · তার',
  2: 'Highest octave · অতিতার',
};
export const PAD_LOWEST = -2;
export const PAD_HIGHEST = 2;
/** An octave's one-word name (Lowest … Highest), for the pad's side buttons. */
export const padOctaveWord = (o: number): string => (PAD_OCTAVES[o] ?? '').split(' ')[0]!;

/** The note pad's rows (Rinat, 2026-10-15): Sa Re Ga Ma; Pa Dha Ni; komal Re, Ga, tivra Ma,
 * komal Dha, Ni. */
export const PAD_ROWS: readonly (readonly number[])[] = [[0, 2, 4, 5], [7, 9, 11], [1, 3, 6, 8, 10]];

/** The note pad: the twelve notes in the octave notes are entered in (each named for a screen
 * reader, komal and tivra captioned), then what else goes in a beat or a song: hold, silence,
 * a new line and a heading, and in free text a bar and a line of lyrics. */
export function padHTML(insOct: number, script: Script, freeText: boolean): string {
  const more: [string, string, string][] = [['hold', 'Hold', '–'], ['rest', 'Silence', '×'], ['nl', 'New line', '↵'], ['head', 'Heading', '#']];
  if (freeText) more.push(['bar', 'Bar', '|'], ['ly', 'Lyrics line', '&gt;']);
  return PAD_ROWS.map((r, i) => '<div class="pkrow' + (i === 2 ? ' pkvar' : '') + '">' + r.map((s) => padKey(s, insOct, script, true)).join('') + '</div>').join('') +
    '<div class="pkrow pkmore">' + more.map(([k, label, sym]) => '<button type="button" class="pk px" data-ins="' + k + '"><span class="pks" aria-hidden="true">' + sym + '</span><span>' + label + '</span></button>').join('') + '</div>';
}

/** A note's key on the pad or the dock: the note in the octave notes are entered in, named for a
 * screen reader, komal and tivra captioned when `caption`. */
function padKey(semi: number, insOct: number, script: Script, caption: boolean): string {
  const oct = (PAD_OCTAVES[insOct] ?? '').split(' · ')[0]!.toLowerCase();
  const kind = KOMAL.has(semi) ? 'komal' : semi === 6 ? 'tivra' : '';
  return '<button type="button" class="pk" data-semi="' + semi + '" aria-label="' + (kind ? kind + ' ' : '') + LAT_NAMES[semi] + ', ' + oct + '">' +
    '<span class="pkn">' + beatNoteHTML({ units: [{ k: 'note', semi, oct: insOct }] }, script) + '</span>' + (kind && caption ? '<span class="pkc">' + kind + '</span>' : '') + '</button>';
}

/** The note keys of the dock at the foot of Edit notation (Rinat, 2026-10-16): Sa to Ni; komal
 * Re, Ga, tivra Ma, komal Dha, Ni (not captioned, their deeper colour says so); hold, silence
 * and a new line (and a bar, in free text). */
export function dockKeysHTML(insOct: number, script: Script, freeText: boolean): string {
  const more: [string, string, string][] = [['hold', 'Hold', '–'], ['rest', 'Silence', '×'], ['nl', 'New line', '↵']];
  if (freeText) more.push(['bar', 'Bar', '|']);
  return '<span class="ffg">' + PAD_ROWS[0]!.concat(PAD_ROWS[1]!).map((s) => padKey(s, insOct, script, false)).join('') + '</span>' +
    '<span class="ffg pkvar">' + PAD_ROWS[2]!.map((s) => padKey(s, insOct, script, false)).join('') + '</span>' +
    '<span class="ffg ffx">' + more.map(([k, label, sym]) => '<button type="button" class="pk px" data-ins="' + k + '" title="' + label + '"><span class="pks" aria-hidden="true">' + sym + '</span><span>' + label + '</span></button>').join('') + '</span>';
}

export function noteNames(us: readonly NoteUnit[], d: number, script: Script): string {
  return us.map((u) => beatNoteHTML({ units: [{ k: 'note', semi: u.semi, oct: u.oct + (d || 0) }] }, script)).join(' ');
}

/** What a checker row's Show and Fix buttons point at. */
export type IssueTarget = { kind: 'read'; g: number; g2: number } | CheckIssue;

/** Dismissing the checker's warnings (new; one of the user's own songs): those dismissed, by
 * issueKey, and whether they are listed (to bring one back). */
export interface DismissOptions {
  dismissed: ReadonlySet<string>;
  showDismissed: boolean;
}

/** The checker panel: a summary, then read errors, lyric warnings, bar and line lengths
 * and octave slips (the first 12), or an all-clear line. With `dis`, each warning (not a
 * reading error, which is always real) can be dismissed; dismissed ones are counted below
 * the rest and listed on request, each with a button to bring it back. */
export function issuesHTML(P: ParsedSong, taals: TaalInfo | Taals, off: number, script: Script, dis?: DismissOptions): { html: string; list: IssueTarget[] } {
  const M = asTaals(taals, off);
  const T = M.runs[0]!.T;
  const cyc = T.cycle;
  const list: IssueTarget[] = [];
  if (!P.noteLines.length) return { html: '<span class="ok">Nothing to play yet.</span>', list };
  const cycles = Math.floor(P.total / cyc);
  const rem = P.total % cyc;
  // A song that changes taal (taal pherta) names its taals in order instead of counting cycles.
  const inTaal = M.changes
    ? 'in ' + M.runs.map((r) => r.T.name).join(', then ')
    : cycles + ' cycle' + (cycles === 1 ? '' : 's') + ' of ' + T.name + (rem ? ' and ' + rem + ' matra' + (rem === 1 ? '' : 's') : '');
  let html = '<span class="ok">' + P.noteLines.length + ' line' + (P.noteLines.length === 1 ? '' : 's') + ' · ' + P.total + ' matras · ' + inTaal + '</span>';
  const rows: { cls: string; text: string; i?: number; fix?: boolean; key?: string }[] = [];
  const gone: typeof rows = [];
  P.errors.forEach((e) => {
    list.push({ kind: 'read', g: e.g, g2: e.g });
    rows.push({ cls: 'err', text: 'Line ' + e.line + ', “' + esc(e.tok) + '”: ' + esc(e.msg) + '. That beat plays what it could read.', i: list.length - 1 });
  });
  P.warnings.forEach((w) => rows.push({ cls: 'err', text: esc(w) }));
  for (const it of checkNotation(P, M)) {
    list.push(it);
    const i = list.length - 1;
    const name = M.line(it.line).T.name;
    const key = dis ? issueKey(P, it) : undefined;
    const to = key && dis!.dismissed.has(key) ? gone : rows;
    if (it.kind === 'octave') to.push({ cls: 'warn', i, key, fix: true, text: 'Line ' + (it.line + 1) + ': <b>' + noteNames(it.notes, 0, script) + '</b> jumps more than an octave away from the notes on either side. Should ' + (it.notes.length > 1 ? 'they' : 'it') + ' be <b>' + noteNames(it.notes, it.delta, script) + '</b>?' });
    else if (it.kind === 'bar') to.push({ cls: 'warn', i, key, text: 'Line ' + (it.line + 1) + ', bar ' + it.bar + ' has ' + it.len + ' beats. In ' + name + ' this bar should probably have ' + it.exp + ', so a beat may be missing or extra.' });
    else to.push({ cls: 'warn', i, key, text: 'Line ' + (it.line + 1) + ' has ' + it.len + ' beats, so it ends partway through a ' + name + ' vibhag. A beat may be missing or extra.' });
  }
  const row = (r: (typeof rows)[number], back = false) => '<li class="' + r.cls + (back ? ' dis' : '') + '"><span class="t">' + r.text + '</span>' +
    (r.i != null ? '<button type="button" class="ibtn" data-act="show" data-i="' + r.i + '">Show</button>' : '') +
    (r.fix && !back ? '<button type="button" class="ibtn" data-act="fix" data-i="' + r.i + '">Fix</button>' : '') +
    (r.key ? (back ? '<button type="button" class="ibtn" data-act="undismiss" data-k="' + r.key + '">Bring back</button>' : '<button type="button" class="ibtn" data-act="dismiss" data-k="' + r.key + '" title="Hide this until the line changes">Dismiss</button>') : '') + '</li>';
  if (!rows.length && !gone.length) html += '<div class="chkok">Checked: every bar lands on a ' + (M.changes ? 'vibhag line of its section’s taal' : T.name + ' vibhag line') + ' and no note looks like an octave slip.</div>';
  else if (!rows.length) html += '<div class="chkok">Nothing to check apart from what you dismissed.</div>';
  else {
    html += '<div class="chkhead">' + rows.length + ' thing' + (rows.length === 1 ? '' : 's') + ' to check</div><ul>' +
      rows.slice(0, 12).map((r) => row(r)).join('') +
      (rows.length > 12 ? '<li class="warn"><span class="t">and ' + (rows.length - 12) + ' more. Fix these first.</span></li>' : '') + '</ul>';
  }
  if (gone.length) {
    html += '<div class="chkdis">' + gone.length + ' dismissed · <button type="button" class="linkbtn" data-act="showdis" aria-expanded="' + dis!.showDismissed + '">' + (dis!.showDismissed ? 'Hide them' : 'Show them') + '</button></div>' +
      (dis!.showDismissed ? '<ul class="dislist">' + gone.map((r) => row(r, true)).join('') + '</ul>' : '');
  }
  return { html, list };
}

// ── Settings bars (new: the prototype's settings, folded away) ─────────────────

const STYLE_NAMES: Record<string, string> = { tabla: 'Tabla', dholak: 'Dholak', kit: 'Drums', click: 'Click' };
const FIRST_STRING: Record<string, string> = { P: 'Pa', M: 'Ma', N: 'Ni' };

/** The Practice view's settings bar: the lines' settings, and the device's delay. */
export interface ViewSettings {
  plRows?: number;
  plAt?: number;
  deviceLag?: number;
}

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th'];

/** What the folded Practice settings (since 2026-10-22 the lines' and the device's delay) are set
 * to, in a line: "7 lines, the 3rd being sung · Delay 100 ms", or "· Delay not measured". */
export function practiceSummary(v: ViewSettings = {}): string {
  const at = v.plAt ?? 3;
  return (v.plRows ?? 7) + ' lines, the ' + (ORDINAL[at] ?? at) + ' being sung · ' +
    (v.deviceLag != null ? 'Delay ' + Math.round(v.deviceLag * 1000) + ' ms' : 'Delay not measured');
}

/** A song's own sound in a line, for the top section's "Use my usual sound": "3 reeds · Tanpura,
 * 1st string Pa · Drums, double speed, with shaker, claps". */
export function songSoundSummary(s: SoundSettings): string {
  const layers = s.beat === 'off' || s.beat === 'click' ? [] : ((s.layers as Record<string, readonly string[] | undefined>)[s.beat] || []);
  const names = layers.map((id) => (Object.hasOwn(LAYERS, id) ? LAYERS[id as LayerId].name.toLowerCase() : id));
  return [
    s.reeds + (s.reeds === 1 ? ' reed' : ' reeds'),
    s.droneVol > 0 ? (s.droneType === 'harmonium' ? 'Harmonium drone' : 'Tanpura, 1st string ' + (FIRST_STRING[s.tanTune] ?? 'Pa')) : 'No drone',
    s.beat === 'off'
      ? 'No rhythm'
      : (STYLE_NAMES[s.beat] ?? s.beat) + (s.speed === 'half' ? ', half speed' : s.speed === 'double' ? ', double speed' : '') + (names.length ? ', with ' + names.join(', ') : ''),
  ].join(' · ');
}

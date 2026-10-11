/**
 * Beat boxes (docs/NOTATION.md → Beat boxes): the song laid out as one box per beat, grouped
 * by the taal's vibhags, with a lyric box under each beat and the headings as their own rows.
 * The song text stays the only record: every change made in a box is a change to the text,
 * worked out here, so the free-text view, headings, lyrics and anything else written in the
 * text are kept as they are. Pure, so it is tested in Node.
 *
 * Rows are the text's own lines. An unfinished line shows empty boxes up to the end of its
 * taal cycle; after the song once its last line is finished (and after any line the singer
 * asks for one) comes an empty row as long as the line before it, to start a new line in.
 */
import { headingLabel, headingTempo, headingTempoPart } from './sections';
import { parseNotesLine, parseSong } from './parse';
import { BAR_CH } from './symbols';
import type { NotesLine, ParsedSong } from './types';

/** The parts of a taal the boxes need. */
export interface BoxTaal {
  cycle: number;
  starts: readonly number[];
  markAt: ReadonlyMap<number, string>;
}

export interface BoxBeat {
  /** Index in its line; g in the song; p in the taal cycle. */
  j: number;
  g: number;
  p: number;
  /** The beat as written, its reading problem if any, and its lyric in each verse. */
  src: string;
  err: string | null;
  lyrics: string[];
}
/** An empty box: where the line's next beat would go. */
export interface BoxGhost {
  j: number;
  p: number;
}
export type BoxRow =
  | { kind: 'head'; k: number; line: number; label: string; tempo?: number }
  | { kind: 'notes'; n: number; line: number; beats: BoxBeat[]; ghosts: BoxGhost[]; verses: number }
  | { kind: 'new'; at: NewAt; ghosts: BoxGhost[] };

/** Where a new line goes: after notes line n (with its lyrics), or at the end of the text. */
export type NewAt = { after: number } | { end: true };

const mod = (a: number, n: number) => ((a % n) + n) % n;
const LYRIC_SPLIT = /[\s|।॥‖]+/;

/** The text's lines, keeping any \r on the line. */
const linesOf = (text: string) => String(text || '').split('\n');

/** 0-based text lines of the lyric rows under notes line n, in order. */
export function verseLines(lines: readonly string[], nl: NotesLine): number[] {
  const out: number[] = [];
  for (let i = nl.srcLine; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t) continue;
    if (t[0] === '>') {
      out.push(i);
      continue;
    }
    // A line the parser skips (only bars) does not end the lyrics; anything else does.
    if (t[0] !== '#' && !parseNotesLine(t).beats.length) continue;
    break;
  }
  return out;
}

/** The 0-based text line a new line goes before, for a place to put it. */
function insertIndex(lines: readonly string[], P: ParsedSong, at: NewAt): number {
  if ('end' in at) return lines.length;
  const nl = P.noteLines[at.after];
  if (!nl) return lines.length;
  const v = verseLines(lines, nl);
  return (v.length ? v[v.length - 1]! : nl.srcLine - 1) + 1;
}

/** How many cycles long a line is, at least one. */
const cyclesOf = (len: number, cycle: number) => Math.max(1, Math.round(len / cycle));

/** Where the song is in the taal after a place for a new line, and how many boxes the new
 * row offers: as many cycles as the line before it, finishing the cycle it starts in. */
export function newRowShape(P: ParsedSong, T: BoxTaal, off: number, at: NewAt): { start: number; p: number; count: number } {
  const n = 'end' in at ? P.noteLines.length - 1 : at.after;
  const prev = P.noteLines[n];
  const start = 'end' in at ? P.total : prev ? prev.end : 0;
  const p = mod(start + off, T.cycle);
  const lc = prev ? cyclesOf(prev.beats.length, T.cycle) : 1;
  return { start, p, count: lc * T.cycle - p };
}

/**
 * The rows to show. `pending`: an empty row asked for after notes line n. `grow`: a line
 * being typed from an empty row keeps its empty boxes up to `to` beats.
 */
export function boxRows(text: string, P: ParsedSong, T: BoxTaal, off: number, o: { pending?: number | null; grow?: { n: number; to: number } | null } = {}): BoxRow[] {
  const lines = linesOf(text);
  const rows: BoxRow[] = [];
  let k = 0;
  const byLine = new Map(P.noteLines.map((nl) => [nl.srcLine, nl] as const));
  const ghostRow = (start: number, count: number, from: number): BoxGhost[] =>
    Array.from({ length: Math.max(0, count) }, (_, i) => ({ j: from + i, p: mod(start + i + off, T.cycle) }));
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (t[0] === '#') {
      const h = t.replace(/^#+\s*/, '');
      const row: BoxRow = { kind: 'head', k: k++, line: i, label: headingLabel(h) };
      const tempo = headingTempo(h);
      if (tempo != null) row.tempo = tempo;
      rows.push(row);
      return;
    }
    const nl = byLine.get(i + 1);
    if (!nl) return;
    const beats: BoxBeat[] = nl.beats.map((b, j) => ({ j, g: b.g, p: mod(b.g + off, T.cycle), src: b.src, err: b.err, lyrics: b.lyrics ? b.lyrics.slice() : [] }));
    const len = beats.length;
    const toCycle = mod(T.cycle - mod(nl.end + off, T.cycle), T.cycle);
    const want = o.grow && o.grow.n === nl.n ? Math.max(toCycle, o.grow.to - len) : toCycle;
    rows.push({ kind: 'notes', n: nl.n, line: i, beats, ghosts: ghostRow(nl.end, want, len), verses: verseLines(lines, nl).length });
    if (o.pending === nl.n && nl.n < P.noteLines.length - 1) {
      const s = newRowShape(P, T, off, { after: nl.n });
      rows.push({ kind: 'new', at: { after: nl.n }, ghosts: ghostRow(s.start, s.count, 0) });
    }
  });
  // The empty row at the end: once the last line is finished, or under a heading after it, or
  // when asked for (Enter on the last line).
  const last = P.noteLines[P.noteLines.length - 1];
  const finished = !last || mod(last.end + off, T.cycle) === 0;
  const headAfter = !!last && lines.slice(last.srcLine).some((l) => l.trim()[0] === '#');
  if (finished || headAfter || o.pending === last!.n) {
    const s = newRowShape(P, T, off, { end: true });
    rows.push({ kind: 'new', at: { end: true }, ghosts: ghostRow(s.start, s.count, 0) });
  }
  return rows;
}

// ── Reading what was typed ───────────────────────────────────────────────────

const SYL: Record<string, string> = { sa: 'S', re: 'R', ga: 'G', ma: 'M', pa: 'P', dha: 'D', ni: 'N' };
const SYL_RE = /sa|re|ga|ma|pa|dha|ni/gi;
const hasError = (tok: string) => parseNotesLine(tok).beats.some((b) => b.err);

/**
 * A beat as typed, made readable where it was not: sargam spelt out ("sa", "Re", "dha'"),
 * alone or among letters ("Sre"), becomes its letter (S R D'), and রে and নি become রা and
 * না. Anything the player already reads, or that the change would not mend, is left as typed.
 */
export function readableBeat(tok: string): string {
  if (!hasError(tok)) return tok;
  const syl = tok.replace(SYL_RE, (m) => SYL[m.toLowerCase()]!);
  if (syl !== tok && !hasError(syl)) return syl;
  const bn = tok.replace(/রে/g, 'রা').replace(/নি/g, 'না');
  return hasError(bn) ? tok : bn;
}

/** What was typed or pasted into a box, as beats: split where the player splits beats (spaces
 * and bar lines), each made readable. */
export function beatsTyped(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of Array.from(input)) {
    if (/\s/.test(ch) || BAR_CH.has(ch)) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map(readableBeat);
}

// ── Changes to the text ──────────────────────────────────────────────────────

const BAR_END = /[|।॥‖][ \t]*$/;
const BAR_START = /^[ \t]*[|।॥‖]/;

/** The bar character the song uses most, else "|". */
export function barChar(text: string): string {
  const n = new Map<string, number>();
  for (const line of linesOf(text)) {
    const t = line.trim();
    if (!t || t[0] === '#' || t[0] === '>') continue;
    for (const c of t) if (c === '|' || c === '।' || c === '॥') n.set(c, (n.get(c) || 0) + 1);
  }
  let best = '|';
  let most = 0;
  for (const [c, k] of n) {
    if (k > most) {
      best = c;
      most = k;
    }
  }
  return best;
}

/** Whether new lines get bar lines: when the song's lines have them, or it has none yet. */
const songUsesBars = (P: ParsedSong) => !P.noteLines.length || P.noteLines.some((l) => l.bars.size > 0);

/** Beats written out as a line, with a bar before each one that starts a vibhag (not the first). */
function lineText(tokens: readonly string[], startP: number, T: BoxTaal, bar: string | null): string {
  return tokens.map((t, i) => (bar && i > 0 && T.markAt.has(mod(startP + i, T.cycle)) ? bar + ' ' : '') + t).join(' ');
}

/** Replace beat g with what was typed. */
export function setBeat(text: string, P: ParsedSong, g: number, token: string): string {
  const b = P.beatList[g];
  if (!b) return text;
  return text.slice(0, b.a) + token + text.slice(b.b);
}

/** The lyric words of verse v of notes line n ([] for a verse not written yet). */
export function verseTokens(text: string, P: ParsedSong, n: number, v: number): string[] {
  const nl = P.noteLines[n];
  if (!nl) return [];
  const lines = linesOf(text);
  const i = verseLines(lines, nl)[v];
  return i == null ? [] : lines[i]!.trim().slice(1).split(LYRIC_SPLIT).filter(Boolean);
}

/**
 * Write verse v of notes line n into `lines` from its words: blanks inside become "-" (a held
 * vowel), blanks at the end are dropped; a new verse, or one written with bars, gets bars where
 * the notes line has them. A verse left
 * with no words is removed; a verse not written yet goes under the line's last one.
 */
function writeVerse(lines: string[], P: ParsedSong, n: number, v: number, words: readonly string[], bars: ReadonlySet<number> = P.noteLines[n]!.bars): void {
  const nl = P.noteLines[n]!;
  const vl = verseLines(lines, nl);
  let end = words.length;
  while (end > 0 && !words[end - 1]) end--;
  const toks = words.slice(0, end).map((w) => w || '-');
  // Bars as in the notes line, for a new verse or one written with bars.
  const bar = v >= vl.length || /[|।॥‖]/.test(lines[vl[v]!]!) ? barChar(lines[nl.srcLine - 1]!) : null;
  const body = toks.map((t, i) => (bar && i > 0 && bars.has(i) ? bar + ' ' : '') + t).join(' ');
  if (v < vl.length) {
    const i = vl[v]!;
    if (toks.length) lines[i] = '> ' + body + (lines[i]!.endsWith('\r') ? '\r' : '');
    else lines.splice(i, 1);
  } else if (toks.length) {
    lines.splice(insertIndex(lines, P, { after: n }), 0, '> ' + body);
  }
}

/** Set the lyrics of verse v of notes line n from beat j on (several words go on to the next
 * beats). */
export function setLyrics(text: string, P: ParsedSong, n: number, v: number, j: number, words: readonly string[]): string {
  if (!P.noteLines[n]) return text;
  const lines = linesOf(text);
  const toks = verseTokens(text, P, n, v);
  while (toks.length < j) toks.push('');
  words.forEach((w, i) => {
    toks[j + i] = w;
  });
  writeVerse(lines, P, n, v, toks);
  return lines.join('\n');
}

/** Remove beat g, the space before it, and its lyric in every verse, so the lyrics stay under
 * their notes. A line's only beat takes the line and its lyrics with it. */
export function removeBeat(text: string, P: ParsedSong, g: number): string {
  const b = P.beatList[g];
  if (!b) return text;
  const n = P.lineOfBeat[g]!;
  const nl = P.noteLines[n]!;
  const j = g - nl.start;
  if (nl.beats.length === 1) return removeLine(text, P, n);
  const lines = linesOf(text);
  const vl = verseLines(lines, nl);
  // Lyrics first, last verse first: they sit below, so nothing above them moves. Their bars
  // follow the notes line's, one beat shorter.
  const bars = new Set(Array.from(nl.bars, (x) => (x > j ? x - 1 : x)));
  for (let v = vl.length - 1; v >= 0; v--) {
    const toks = verseTokens(text, P, n, v);
    if (j < toks.length) {
      toks.splice(j, 1);
      writeVerse(lines, P, n, v, toks, bars);
    }
  }
  const li = nl.srcLine - 1;
  let lineStart = 0;
  for (let i = 0; i < li; i++) lineStart += lines[i]!.length + 1;
  const line = lines[li]!;
  let lo = b.a - lineStart;
  let hi = b.b - lineStart;
  if (j === 0) while (hi < line.length && /[ \t]/.test(line[hi]!)) hi++;
  else while (lo > 0 && /[ \t]/.test(line[lo - 1]!)) lo--;
  const before = line.slice(0, lo);
  let after = line.slice(hi);
  // A vibhag emptied of its only beat would leave two bars side by side: keep one.
  const second = BAR_START.exec(after);
  if (second && BAR_END.test(before)) after = after.slice(second[0].length);
  lines[li] = before + after;
  return lines.join('\n');
}

/** Add beats at the end of notes line n, with bars at vibhag lines if the line has bars. */
export function appendBeats(text: string, P: ParsedSong, T: BoxTaal, off: number, n: number, tokens: readonly string[]): string {
  const nl = P.noteLines[n];
  if (!nl || !tokens.length) return text;
  const lines = linesOf(text);
  const li = nl.srcLine - 1;
  const raw = lines[li]!;
  const cr = raw.endsWith('\r') ? '\r' : '';
  let out = (cr ? raw.slice(0, -1) : raw).replace(/\s+$/, '');
  // A line with bars keeps having them; one too short to have crossed a vibhag yet follows
  // the song's other lines (bars when they have them, or when there are none).
  const crosses = nl.beats.some((b, i) => i > 0 && T.markAt.has(mod(b.g + off, T.cycle)));
  const others = P.noteLines.filter((l) => l !== nl);
  const bar = nl.bars.size > 0 ? barChar(out) : !crosses && (!others.length || others.some((l) => l.bars.size > 0)) ? barChar(text) : null;
  tokens.forEach((t, i) => {
    const p = mod(nl.end + i + off, T.cycle);
    out += bar && T.markAt.has(p) && !BAR_END.test(out) ? ' ' + bar + ' ' + t : ' ' + t;
  });
  lines[li] = out + cr;
  return lines.join('\n');
}

/**
 * New notes lines at a place, from beats: the first as long as the empty row there (or
 * `firstLen`), the rest as many cycles each as the line before. Returns the text and how many
 * lines were made.
 */
export function insertLines(text: string, P: ParsedSong, T: BoxTaal, off: number, at: NewAt, tokens: readonly string[], firstLen?: number): { text: string; count: number } {
  if (!tokens.length) return { text, count: 0 };
  const shape = newRowShape(P, T, off, at);
  const full = shape.count + shape.p;
  const bar = songUsesBars(P) ? barChar(text) : null;
  const made: string[] = [];
  let i = 0;
  let p = shape.p;
  let len = firstLen ?? shape.count;
  while (i < tokens.length) {
    const take = tokens.slice(i, i + Math.max(1, len));
    made.push(lineText(take, p, T, bar));
    i += take.length;
    p = mod(p + take.length, T.cycle);
    len = full - p;
  }
  return { text: spliceLines(text, P, at, made), count: made.length };
}

/** Put whole lines in at a place; at the end, before any blank last lines. */
function spliceLines(text: string, P: ParsedSong, at: NewAt, add: readonly string[]): string {
  const lines = linesOf(text);
  let idx = insertIndex(lines, P, at);
  if ('end' in at) while (idx > 0 && !lines[idx - 1]!.trim()) idx--;
  lines.splice(idx, 0, ...add);
  return lines.join('\n');
}

/** Text pasted with line breaks goes in as it is, as whole lines at the place. */
export function insertText(text: string, P: ParsedSong, at: NewAt, pasted: string): string {
  const add = pasted.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '').split('\n');
  return spliceLines(text, P, at, add);
}

/** Remove notes line n with its lyrics. */
export function removeLine(text: string, P: ParsedSong, n: number): string {
  const nl = P.noteLines[n];
  if (!nl) return text;
  const lines = linesOf(text);
  const drop = new Set([nl.srcLine - 1, ...verseLines(lines, nl)]);
  return lines.filter((_, i) => !drop.has(i)).join('\n');
}

// ── Moving and copying rows ──────────────────────────────────────────────────

/** The rows that move as one, in the order shown: each heading (its line), and each notes
 * line with its lyrics (0-based text lines `first` to `last`, the lines between included). */
export function rowBlocks(text: string, P: ParsedSong): { first: number; last: number; notes?: number }[] {
  const lines = linesOf(text);
  const byLine = new Map(P.noteLines.map((nl) => [nl.srcLine - 1, nl] as const));
  const out: { first: number; last: number; notes?: number }[] = [];
  lines.forEach((l, i) => {
    if (l.trim()[0] === '#') {
      out.push({ first: i, last: i });
      return;
    }
    const nl = byLine.get(i);
    if (!nl) return;
    const v = verseLines(lines, nl);
    out.push({ first: i, last: v.length ? v[v.length - 1]! : i, notes: nl.n });
  });
  return out;
}

/** Move row `from` (an index into rowBlocks) so that it sits before row `to`; `to` equal to the
 * number of rows puts it after the last. Lines outside the rows (blank lines, stray lyrics)
 * stay where they are. */
export function moveRow(text: string, P: ParsedSong, from: number, to: number): string {
  const blocks = rowBlocks(text, P);
  const b = blocks[from];
  if (!b || to < 0 || to > blocks.length || to === from || to === from + 1) return text;
  const lines = linesOf(text);
  const moving = lines.slice(b.first, b.last + 1);
  const size = moving.length;
  let at = to < blocks.length ? blocks[to]!.first : blocks[blocks.length - 1]!.last + 1;
  lines.splice(b.first, size);
  if (at > b.first) at -= size;
  lines.splice(at, 0, ...moving);
  return lines.join('\n');
}

/** Copies of rows (indices into rowBlocks: headings, and notes lines with their lyrics) at the
 * end of the song, in the song's order, before any blank last lines. Returns the text and how
 * many rows were copied. */
export function copyRowsToEnd(text: string, P: ParsedSong, rows: Iterable<number>): { text: string; count: number } {
  const blocks = rowBlocks(text, P);
  const pick = Array.from(new Set(rows)).filter((r) => blocks[r]).sort((a, b) => a - b);
  if (!pick.length) return { text, count: 0 };
  const lines = linesOf(text);
  const add = pick.flatMap((r) => lines.slice(blocks[r]!.first, blocks[r]!.last + 1).map((l) => l.replace(/\r$/, '')));
  let idx = lines.length;
  while (idx > 0 && !lines[idx - 1]!.trim()) idx--;
  lines.splice(idx, 0, ...add);
  return { text: lines.join('\n'), count: pick.length };
}

/** The 0-based text line of heading k (the k-th line starting with #). */
function headLine(lines: readonly string[], k: number): number {
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim()[0] !== '#') continue;
    if (seen++ === k) return i;
  }
  return -1;
}

/** Rename heading k, keeping its tempo as written. */
export function setHeading(text: string, k: number, label: string): string {
  const lines = linesOf(text);
  const i = headLine(lines, k);
  if (i < 0) return text;
  const raw = lines[i]!;
  const cr = raw.endsWith('\r') ? '\r' : '';
  const h = (cr ? raw.slice(0, -1) : raw).trim().replace(/^#+\s*/, '');
  const tempo = headingTempoPart(h);
  const lab = label.replace(/\s+/g, ' ').trim();
  lines[i] = ('# ' + (lab ? lab + tempo : tempo.trim())).trimEnd() + cr;
  return lines.join('\n');
}

/** Add a heading at the end of the text (before any blank last lines). */
export function addHeading(text: string, label = ''): string {
  const lines = linesOf(text);
  let idx = lines.length;
  while (idx > 0 && !lines[idx - 1]!.trim()) idx--;
  lines.splice(idx, 0, ('# ' + label).trimEnd());
  return lines.join('\n');
}

/** Remove heading k. */
export function removeHeading(text: string, k: number): string {
  const lines = linesOf(text);
  const i = headLine(lines, k);
  if (i < 0) return text;
  lines.splice(i, 1);
  return lines.join('\n');
}

// ── Typing several beats at once ─────────────────────────────────────────────

/** Where the caret goes after a change: a beat box (line, index) or the empty row at the end. */
export type BoxSpot = { n: number; j: number } | { end: true; j: number };

/** How many boxes line n has room for: its beats and the empty boxes to the end of its cycle,
 * or `target` beats if more (a line being typed in a row as long as the one before it). */
export function lineRoom(P: ParsedSong, T: BoxTaal, off: number, n: number, target = 0): number {
  const nl = P.noteLines[n];
  if (!nl) return 0;
  return Math.max(nl.beats.length + mod(T.cycle - mod(nl.end + off, T.cycle), T.cycle), target);
}

/**
 * Beats typed or pasted into a box: the first goes in the box, the rest into the boxes after
 * it, writing over the line's beats, then filling its empty boxes, then making new lines (as
 * long as the line before each) after it. `from` is a box of an existing line or an empty row;
 * `target` keeps a line being typed as long as the row it started in. Returns the text and
 * the box to go to next.
 */
export function placeBeats(text: string, T: BoxTaal, off: number, from: { n: number; j: number } | { at: NewAt }, tokens: readonly string[], target = 0): { text: string; next: BoxSpot } {
  let P = parseSong(text);
  if (!tokens.length) return { text, next: 'at' in from ? { end: true, j: 0 } : { n: from.n, j: from.j } };
  let t = text;
  let rest = tokens.slice();
  if ('at' in from) {
    // A new row: its first line takes up to the row's length; more beats make more lines.
    const shape = newRowShape(P, T, off, from.at);
    const first = 'end' in from.at ? P.noteLines.length : from.at.after + 1;
    const r = insertLines(t, P, T, off, from.at, rest, shape.count);
    t = r.text;
    P = parseSong(t);
    const lastN = first + r.count - 1;
    const used = rest.length - (P.noteLines[lastN]!.start - P.noteLines[first]!.start);
    return { text: t, next: nextSpot(P, T, off, lastN, used, r.count === 1 ? shape.count : 0) };
  }
  const n = from.n;
  const nl = P.noteLines[n];
  if (!nl) return { text, next: { end: true, j: 0 } };
  const j0 = Math.min(from.j, nl.beats.length);
  // 1. Write over the line's beats from the box on (from the last, so offsets stay good).
  const over = Math.max(0, Math.min(rest.length, nl.beats.length - j0));
  for (let i = over - 1; i >= 0; i--) t = setBeat(t, P, nl.start + j0 + i, rest[i]!);
  rest = rest.slice(over);
  P = parseSong(t);
  if (!rest.length) return { text: t, next: nextSpot(P, T, off, n, j0 + over, target) };
  // 2. Fill the line's empty boxes.
  const fill = rest.slice(0, lineRoom(P, T, off, n, target) - P.noteLines[n]!.beats.length);
  t = appendBeats(t, P, T, off, n, fill);
  rest = rest.slice(fill.length);
  P = parseSong(t);
  if (!rest.length) return { text: t, next: nextSpot(P, T, off, n, P.noteLines[n]!.beats.length, target) };
  // 3. New lines after it.
  const r = insertLines(t, P, T, off, { after: n }, rest);
  t = r.text;
  P = parseSong(t);
  const lastN = n + r.count;
  return { text: t, next: nextSpot(P, T, off, lastN, P.noteLines[lastN]!.beats.length) };
}

/** The box at index j of line n; past its room, the first box of the next line, or the empty
 * row at the end. */
export function nextSpot(P: ParsedSong, T: BoxTaal, off: number, n: number, j: number, target = 0): BoxSpot {
  if (!P.noteLines[n]) return { end: true, j: 0 };
  if (j < lineRoom(P, T, off, n, target)) return { n, j };
  if (n + 1 < P.noteLines.length) return { n: n + 1, j: 0 };
  return { end: true, j: 0 };
}

/**
 * A song's sections (docs/NOTATION.md → Sections): the notes lines under each heading
 * (স্থায়ী, অন্তরা, …), so the singer can jump between them, and the tempo and the taal a
 * heading may give its section ("# অন্তরা · কাহারবা · tempo 110"). Pure, so it is tested in
 * Node. The parser is left as the prototype's: sections are worked out from the text beside it.
 */
import { TAAL_IDS, TAAL_NAMES, TAALS, type TaalId } from '../taal/taals';
import type { ParsedSong } from './types';

export interface SongSection {
  /** The heading as shown on the sheet (without the #), or '' for lines before any heading. */
  name: string;
  /** The name without its tempo, for buttons. */
  label: string;
  /** 1-based text line of the heading that names the section (0: none). */
  headLine: number;
  /** First and last notes line (indices into the parsed song's notes lines). */
  first: number;
  last: number;
  /** The section's own tempo, matras per minute; absent: the song's tempo. */
  tempo?: number;
  /** 1-based text line of the heading the tempo is written in (0: none). */
  tempoLine: number;
  /** The section's own taal; absent: the song's. */
  taal?: TaalId;
}

export const TEMPO_RANGE: readonly [number, number] = [30, 240];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** লয় is spelt with য় as one character or as য + nukta. */
const WORD = '(?:tempo|লয়|লয়|♩)';
const NUM = '([0-9০-৯]{1,3})';
const TEMPO_RE = new RegExp(WORD + '\\s*[:=]?\\s*' + NUM, 'i');
/** The tempo with what separates it from the rest of the heading, for taking it out. */
const TEMPO_PART_RE = new RegExp('\\s*[·•,;|\\-–—(]?\\s*' + WORD + '\\s*[:=]?\\s*[0-9০-৯]{1,3}\\s*\\)?', 'i');

const clampTempo = (n: number) => Math.max(TEMPO_RANGE[0], Math.min(TEMPO_RANGE[1], Math.round(n)));
const readDigits = (s: string) => Number(Array.from(s, (c) => (BN_DIGITS.includes(c) ? String(BN_DIGITS.indexOf(c)) : c)).join(''));

/** The tempo written in a heading, clamped to 30–240, or undefined. */
export function headingTempo(heading: string): number | undefined {
  const m = TEMPO_RE.exec(heading);
  if (!m) return undefined;
  const n = readDigits(m[1]!);
  return n > 0 ? clampTempo(n) : undefined;
}

/** A heading's tempo as written, with what separates it: " · tempo 110", or ''. */
export const headingTempoPart = (heading: string): string => TEMPO_PART_RE.exec(heading)?.[0] ?? '';

// ── A taal in a heading (taal pherta) ────────────────────────────────────────

/** Bengali letters typed as one character or as two: য় ড় ঢ় ো ৌ. */
const BN_TWO: Record<string, string> = { 'য়': 'য়', 'ড়': 'ড়', 'ঢ়': 'ঢ়', 'ো': 'ো', 'ৌ': 'ৌ' };
const oneChar = (s: string) => Object.entries(BN_TWO).reduce((t, [one, two]) => t.split(two).join(one), s);
/** A name as a pattern: either spelling of those letters, any space (or none) between words. */
const namePattern = (name: string) =>
  Array.from(oneChar(name.toLowerCase()), (c) => (BN_TWO[c] ? '(?:' + c + '|' + BN_TWO[c] + ')' : /\s/.test(c) ? '\\s*' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');
/** Every taal's names, a group each. What comes before a name is captured rather than looked
 * behind at (older iPhones cannot read look-behinds). */
const TAAL_RE = new RegExp(
  '(^|[^\\p{L}\\p{M}\\p{N}])(?:' +
    TAAL_IDS.map((id) => '(?<' + id + '>' + Array.from(new Set([TAALS[id].name, TAALS[id].bn, ...TAAL_NAMES[id]].map(namePattern))).join('|') + ')').join('|') +
    ')(?![\\p{L}\\p{M}])',
  'giu',
);
const TAAL_WORD = '(?:taal|tal|তাল)';
const BEFORE_RE = new RegExp('\\s*(?:([·•,;|\\-–—(])\\s*)?(?:' + TAAL_WORD + '\\s*[:=]?\\s*)?$', 'iu');
const AFTER_RE = new RegExp('^(?:\\s*' + TAAL_WORD + '(?![\\p{L}\\p{M}]))?', 'iu');
const SEPS = /^[\s·•,;|\-–—]+|[\s·•,;|\-–—]+$/g;

/** The taals named in a heading: each name's place, and its whole part with what separates
 * it (" · তাল কাহারবা", " (Keherwa)"). */
function taalsNamed(heading: string): { id: TaalId; a: number; b: number; from: number; to: number }[] {
  const out: { id: TaalId; a: number; b: number; from: number; to: number }[] = [];
  for (const m of heading.matchAll(TAAL_RE)) {
    const id = TAAL_IDS.find((k) => m.groups?.[k] != null)!;
    const a = m.index! + m[1]!.length;
    const b = m.index! + m[0].length;
    const before = BEFORE_RE.exec(heading.slice(0, a))!;
    let to = b + AFTER_RE.exec(heading.slice(b))![0].length;
    if (before[1] === '(') to += /^\s*\)/.exec(heading.slice(to))?.[0].length ?? 0;
    out.push({ id, a, b, from: a - before[0].length, to });
  }
  return out;
}

/** The taal a heading names ("অন্তরা · কাহারবা", "Antara (Keherwa)", "তাল: দাদরা"), or
 * undefined. A heading naming two taals ("তাল ফেরতা: দাদরা/কাহারবা") names none. */
export function headingTaal(heading: string): TaalId | undefined {
  const ids = new Set(taalsNamed(heading).map((t) => t.id));
  return ids.size === 1 ? ids.values().next().value : undefined;
}

/** A heading's taal as written, with what separates it: " · কাহারবা", or ''. */
export function headingTaalPart(heading: string): string {
  const named = taalsNamed(heading);
  return named.length === 1 ? heading.slice(named[0]!.from, named[0]!.to) : '';
}

/** A heading without its tempo and its taal: "অন্তরা · কাহারবা · tempo 110" → "অন্তরা". */
export function headingLabel(heading: string): string {
  const noTempo = heading.replace(TEMPO_PART_RE, '');
  const named = taalsNamed(noTempo);
  const rest = named.length === 1 ? noTempo.slice(0, named[0]!.from) + noTempo.slice(named[0]!.to) : noTempo;
  return rest === heading ? heading.trim() : rest.replace(SEPS, '');
}

/** The headings of a text, by 1-based line: lines starting with # once trimmed, as the parser reads them. */
function headings(text: string): Map<number, string> {
  const out = new Map<number, string>();
  String(text || '').split('\n').forEach((raw, i) => {
    const t = raw.replace(/\r$/, '').trim();
    if (t[0] === '#') out.set(i + 1, t.replace(/^#+\s*/, ''));
  });
  return out;
}

/**
 * The sections of a song: runs of notes lines under the same heading. A heading names the
 * notes lines below it until the next heading; when several headings come one after
 * another, the last names the section and the nearest one with a tempo (or a taal) gives it
 * its tempo (or its taal).
 */
export function songSections(text: string, P: ParsedSong): SongSection[] {
  const heads = Array.from(headings(text)); // in line order
  const out: SongSection[] = [];
  let h = 0;
  let pending: [number, string][] = [];
  let cur: SongSection | null = null;
  for (const nl of P.noteLines) {
    let fresh = false;
    while (h < heads.length && heads[h]![0] < nl.srcLine) {
      pending.push(heads[h]!);
      h++;
      fresh = true;
    }
    if (!cur || fresh) {
      const named = pending[pending.length - 1];
      const timed = pending.slice().reverse().find(([, t]) => headingTempo(t) != null);
      cur = { name: named ? named[1] : '', label: named ? headingLabel(named[1]) : '', headLine: named ? named[0] : 0, first: nl.n, last: nl.n, tempoLine: timed ? timed[0] : 0 };
      if (timed) cur.tempo = headingTempo(timed[1]);
      const taal = pendingTaal(pending);
      if (taal) cur.taal = taal;
      out.push(cur);
      pending = [];
    } else cur.last = nl.n;
  }
  return out;
}

/** The taal of the nearest of several headings in a row that names one. */
function pendingTaal(pending: readonly [number, string][]): TaalId | undefined {
  for (let i = pending.length - 1; i >= 0; i--) {
    const t = headingTaal(pending[i]![1]);
    if (t) return t;
  }
  return undefined;
}

/** Headings written after the song's last notes line (all of them in a song with none yet):
 * whether there are any, and the taal they give a line added under them. */
export function endHeadings(text: string, P: ParsedSong): { any: boolean; taal?: TaalId } {
  const after = P.noteLines.length ? P.noteLines[P.noteLines.length - 1]!.srcLine : 0;
  const heads = Array.from(headings(text)).filter(([line]) => line > after);
  const taal = pendingTaal(heads);
  return taal ? { any: true, taal } : { any: heads.length > 0 };
}

/** The section a notes line belongs to (its index), or -1. */
export const sectionOfLine = (S: readonly SongSection[], line: number): number => S.findIndex((s) => line >= s.first && line <= s.last);

/**
 * Write a section's tempo into its heading, or take it out (`tempo` null), keeping the rest
 * of the line as written. A tempo already there keeps its spelling and its digits (Bengali
 * or not); a new one is added as " · tempo N". Returns the text unchanged when the line is
 * not a heading.
 */
export function setHeadingTempo(text: string, line: number, tempo: number | null): string {
  const lines = String(text).split('\n');
  const i = line - 1;
  const raw = lines[i];
  if (raw == null || raw.trim()[0] !== '#') return text;
  const cr = raw.endsWith('\r') ? '\r' : '';
  let body = cr ? raw.slice(0, -1) : raw;
  if (tempo == null) {
    body = body.replace(TEMPO_PART_RE, '').replace(/\s+$/, '');
  } else {
    const n = clampTempo(tempo);
    const m = TEMPO_RE.exec(body);
    if (m) {
      const bn = /[০-৯]/.test(m[1]!);
      const digits = bn ? Array.from(String(n), (c) => BN_DIGITS[+c]).join('') : String(n);
      const at = m.index + m[0].length - m[1]!.length;
      body = body.slice(0, at) + digits + body.slice(at + m[1]!.length);
    } else {
      body = body.replace(/\s+$/, '');
      body += (/^#+$/.test(body.trim()) ? ' ' : ' · ') + 'tempo ' + n;
    }
  }
  lines[i] = body + cr;
  return lines.join('\n');
}

/**
 * Write a section's taal into its heading, or take it out (`id` null), keeping the rest of
 * the line as written. A taal already named is replaced by the new one's Bengali name; a new
 * one goes in as " · কাহারবা", before any tempo. Returns the text unchanged when the line is
 * not a heading.
 */
export function setHeadingTaal(text: string, line: number, id: TaalId | null): string {
  const lines = String(text).split('\n');
  const i = line - 1;
  const raw = lines[i];
  if (raw == null || raw.trim()[0] !== '#') return text;
  const cr = raw.endsWith('\r') ? '\r' : '';
  let body = cr ? raw.slice(0, -1) : raw;
  const named = taalsNamed(body);
  if (id == null) {
    if (new Set(named.map((t) => t.id)).size === 1) {
      for (const t of named.slice().reverse()) body = body.slice(0, t.from) + body.slice(t.to);
      // A taal written first leaves what followed it with nothing to separate it from.
      body = body.replace(/^(\s*#+)[\s·•,;|\-–—]*/, '$1 ').replace(/\s+$/, '');
    }
  } else if (named.length) {
    for (const t of named.slice().reverse()) body = body.slice(0, t.a) + TAALS[id].bn + body.slice(t.b);
  } else {
    const tempo = TEMPO_PART_RE.exec(body);
    const at = tempo ? tempo.index : body.replace(/\s+$/, '').length;
    const head = body.slice(0, at);
    let tail = body.slice(at).replace(/^\s+/, '');
    if (tail) tail = (/^[·•,;|\-–—(]/.test(tail) ? ' ' : ' · ') + tail;
    body = head + (/^\s*#+$/.test(head) ? ' ' : ' · ') + TAALS[id].bn + tail;
  }
  lines[i] = body + cr;
  return lines.join('\n');
}

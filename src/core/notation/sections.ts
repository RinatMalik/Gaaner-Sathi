/**
 * A song's sections (docs/NOTATION.md → Sections): the notes lines under each heading
 * (স্থায়ী, অন্তরা, …), so the singer can jump between them, and the tempo a heading may
 * give its section ("# অন্তরা · tempo 110"). Pure, so it is tested in Node. The parser is
 * left as the prototype's: sections are worked out from the text beside it.
 */
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

/** A heading without its tempo: "অন্তরা · tempo 110" → "অন্তরা". */
export const headingLabel = (heading: string): string => heading.replace(TEMPO_PART_RE, '').trim();

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
 * another, the last names the section and the nearest one with a tempo gives it its tempo.
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
      out.push(cur);
      pending = [];
    } else cur.last = nl.n;
  }
  return out;
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

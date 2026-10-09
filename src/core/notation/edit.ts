/**
 * Edit operations on the song text (docs/NOTATION.md → Edit operations): pure text → text,
 * each returning the new text, the new selection and an undoable replacement {lo, hi, rep}.
 */
import { parseSong } from './parse';
import { AKAR, BN_LETTER, LAT_LETTER, REPH } from './symbols';
import type { Beat, NoteUnit, ParsedSong } from './types';

/** A text replacement: `rep` replaces text[lo..hi]; s..e is the selection afterwards. */
export interface TextEdit {
  text: string;
  s: number;
  e: number;
  lo: number;
  hi: number;
  rep: string;
}
export interface OctaveShift extends TextEdit {
  /** Notes moved, and notes left alone because they were already at ±2. */
  count: number;
  capped: number;
}
export type BeatEdit = ({ ok: true; n: number } & TextEdit) | { ok: false; msg: string };

/**
 * Which notes a text selection covers. A bare caret picks the note just left of it inside
 * the beat it sits in; a range picks every note whose letter it touches.
 */
export function notesInRange(P: ParsedSong, s: number, e: number): { notes: NoteUnit[]; a: number; b: number } {
  const notes: NoteUnit[] = [];
  if (s === e) {
    const b = P.beatList.find((x) => x && x.a <= s && s <= x.b && x.units.some((u) => u.k === 'note'));
    if (!b) return { notes, a: s, b: e };
    const ns = b.units.filter((u): u is NoteUnit => u.k === 'note');
    let pick = ns[0]!;
    for (const u of ns) if (u.cs < s) pick = u;
    notes.push(pick);
    return { notes, a: b.a, b: b.b };
  }
  for (const b of P.beatList) if (b) for (const u of b.units) if (u.k === 'note' && u.cs < e && u.ce > s) notes.push(u);
  return { notes, a: s, b: e };
}

/**
 * Move the selected notes up or down one octave by rewriting only their octave marks.
 * Bengali: upper = র্ before the note, lower = . before it. Sa Re Ga: upper = ' after,
 * lower = . before. Clamps at ±2.
 */
export function shiftOctaves(text: string, s: number, e: number, delta: number): OctaveShift {
  const P = parseSong(text);
  const sel = notesInRange(P, s, e);
  const edits: { pos: number; del: number; ins: string }[] = [];
  let count = 0;
  let capped = 0;
  for (const u of sel.notes) {
    const no = Math.max(-2, Math.min(2, u.oct + delta));
    if (no === u.oct) {
      capped++;
      continue;
    }
    count++;
    for (const m of u.mk) edits.push({ pos: m[0], del: m[1] - m[0], ins: '' });
    if (u.sc === 'bn') {
      const pre = no > 0 ? REPH.repeat(no) : '.'.repeat(-no);
      if (pre) edits.push({ pos: u.cs, del: 0, ins: pre });
    } else {
      if (no < 0) edits.push({ pos: u.cs, del: 0, ins: '.'.repeat(-no) });
      if (no > 0) edits.push({ pos: u.ce, del: 0, ins: "'".repeat(no) });
    }
  }
  if (!edits.length) return { text, s: sel.a, e: sel.b, count, capped, lo: 0, hi: 0, rep: '' };
  edits.sort((x, y) => y.pos - x.pos || y.del - x.del);
  let lo = Infinity;
  let hi = -Infinity;
  for (const ed of edits) {
    lo = Math.min(lo, ed.pos);
    hi = Math.max(hi, ed.pos + ed.del);
  }
  let region = text.slice(lo, hi);
  for (const ed of edits) {
    const p = ed.pos - lo;
    region = region.slice(0, p) + ed.ins + region.slice(p + ed.del);
  }
  const map = (p: number, isEnd: boolean) => {
    let q = p;
    for (const ed of edits) {
      const end = ed.pos + ed.del;
      if (end < p || (end === p && (ed.del > 0 || isEnd))) q += ed.ins.length - ed.del;
      else if (ed.pos < p) q -= p - ed.pos;
    }
    return q;
  };
  return { text: text.slice(0, lo) + region + text.slice(hi), s: map(sel.a, false), e: map(sel.b, true), count, capped, lo, hi, rep: region };
}

function beatsInRange(P: ParsedSong, s: number, e: number): Beat[] {
  if (s === e) {
    const b = P.beatList.find((x) => x && x.a <= s && s <= x.b);
    return b ? [b] : [];
  }
  return P.beatList.filter((b) => b && b.a < e && b.b > s);
}

/**
 * Merge the selected beats (or the caret's beat and the next) into one beat, dropping the
 * inner আকার: পা ধা → পধা. Refuses across a bar or a line.
 */
export function joinBeats(text: string, s: number, e: number): BeatEdit {
  const P = parseSong(text);
  let beats = beatsInRange(P, s, e);
  if (!beats.length) return { ok: false, msg: 'Tap a beat in the preview first.' };
  const first = beats[0]!;
  if (beats.length === 1) {
    const nx = P.beatList[first.g + 1];
    if (!nx || P.lineOfBeat[nx.g] !== P.lineOfBeat[first.g]) return { ok: false, msg: 'There is no next beat on this line to join.' };
    beats = [first, nx];
  }
  const ln = P.lineOfBeat[first.g]!;
  if (beats.some((b) => P.lineOfBeat[b.g] !== ln)) return { ok: false, msg: 'Beats on different lines cannot be joined.' };
  const nl = P.noteLines[ln]!;
  for (let k = 1; k < beats.length; k++) {
    if (nl.bars.has(beats[k]!.g - nl.start)) return { ok: false, msg: 'Those beats are in different bars, so they stay separate.' };
  }
  const pieces = beats.map((b, i) => {
    const t = text.slice(b.a, b.b);
    return i < beats.length - 1 && t.endsWith(AKAR) ? t.slice(0, -1) : t;
  });
  const rep = pieces.join('');
  const lo = first.a;
  const hi = beats[beats.length - 1]!.b;
  return { ok: true, n: beats.length, text: text.slice(0, lo) + rep + text.slice(hi), s: lo, e: lo + rep.length, lo, hi, rep };
}

/** Give every unit of the selected beat(s) its own beat, written canonically: পধা → পা ধা. */
export function splitBeats(text: string, s: number, e: number): BeatEdit {
  const P = parseSong(text);
  const beats = beatsInRange(P, s, e).filter((b) => b.units.length > 1);
  if (!beats.length) return { ok: false, msg: 'Select a beat that has more than one note.' };
  const lo = beats[0]!.a;
  const hi = beats[beats.length - 1]!.b;
  let region = text.slice(lo, hi);
  let n = 0;
  for (let k = beats.length - 1; k >= 0; k--) {
    const b = beats[k]!;
    const bn = /[ঀ-৿]/.test(b.src);
    const toks = b.units.map((u) => {
      if (u.k === 'hold') return bn ? '-' + AKAR : '-';
      if (u.k === 'rest') return 'x';
      const lower = '.'.repeat(Math.max(0, -u.oct));
      return bn
        ? lower + REPH.repeat(Math.max(0, u.oct)) + BN_LETTER[u.semi] + AKAR
        : lower + LAT_LETTER[u.semi] + "'".repeat(Math.max(0, u.oct));
    });
    n += toks.length;
    region = region.slice(0, b.a - lo) + toks.join(' ') + region.slice(b.b - lo);
  }
  return { ok: true, n, text: text.slice(0, lo) + region + text.slice(hi), s: lo, e: lo + region.length, lo, hi, rep: region };
}

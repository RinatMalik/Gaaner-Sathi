/**
 * Words for the notes (docs/NOTATION.md → Beat boxes → Pasting words): a song's words split
 * into the syllables they are sung in, and laid one syllable to each beat where a note
 * starts, `-` on the beats a vowel is held over, so a line of words pasted once fills the
 * boxes under the notes. Pure, so it is tested in Node.
 *
 * The split is a reading of Bengali spelling, not a dictionary: a letter with its vowel sign
 * (and any ঁ ং ঃ) is a syllable; a single consonant at the end of a word, which is said
 * without its vowel, joins the syllable before it (আমার → আ মার, বাংলা → বাং লা); ৎ and a
 * consonant written with হসন্ত join the one before too; a final ই উ এ ও after a vowel makes
 * one syllable with it (যাও, এই). Inside a word, a conjunct's first consonant closes the
 * syllable before it, as swaralipi writes it (আনন্দ → আ নন্ দ, স্বপ্ন → স্বপ্ ন), and what is
 * left keeps its vowel. Words in other scripts are kept whole. The singer corrects the odd one.
 */
import { setLyrics } from './boxes';
import { parseSong } from './parse';

const isCons = (c: string) => /[ক-হৎড়ঢ়য়]/.test(c);
const isVowel = (c: string) => /[অ-ঔ]/.test(c);
const isSign = (c: string) => /[া-ৌৗ]/.test(c);
const isMark = (c: string) => /[ঁ-ঃ]/.test(c);
const HASANTA = '্';
const KHANDA_TA = 'ৎ';
const isGlue = (c: string) => c === '়' || c === '‌' || c === '‍';
/** ই উ এ ও: after a vowel, they make one syllable with it. */
const GLIDE = new Set(['ই', 'উ', 'এ', 'ও']);

interface Akshara {
  text: string;
  /** Ends in a vowel: a vowel sign, an independent vowel, or ং ঃ ঁ after either. */
  voiced: boolean;
  /** A consonant with only its inherent vowel; conj: more than one consonant (or what is left
   * of one), which keeps its vowel at the end of a word. */
  bare: boolean;
  conj: boolean;
  /** A conjunct's first consonant with its হসন্ত (ন্ of ন্দ). */
  head: string;
  /** Joins the one before whatever its place: ৎ, a consonant written with হসন্ত. */
  dead: boolean;
  vowel: boolean;
}

/** A Bengali word in written syllables (aksharas). */
function aksharas(word: string): Akshara[] {
  const ch = Array.from(word);
  const out: Akshara[] = [];
  let i = 0;
  while (i < ch.length) {
    const c = ch[i]!;
    let text = c;
    let a: Akshara;
    i++;
    if (isVowel(c)) {
      a = { text, voiced: true, bare: false, conj: false, head: '', dead: false, vowel: true };
    } else if (isCons(c)) {
      let conj = false;
      let head = '';
      let dead = c === KHANDA_TA;
      while (i < ch.length && isGlue(ch[i]!)) text += ch[i++];
      while (i < ch.length && ch[i] === HASANTA) {
        text += ch[i++];
        while (i < ch.length && isGlue(ch[i]!)) text += ch[i++];
        if (i < ch.length && isCons(ch[i]!)) {
          if (!conj) head = text;
          text += ch[i++];
          conj = true;
          while (i < ch.length && isGlue(ch[i]!)) text += ch[i++];
        } else {
          dead = true;
          break;
        }
      }
      let sign = false;
      while (i < ch.length && isSign(ch[i]!)) {
        text += ch[i++];
        sign = true;
      }
      a = { text, voiced: sign, bare: !sign && !dead, conj, head, dead, vowel: false };
    } else {
      // Not a letter that starts a syllable (a stray sign, an apostrophe as in ক'রে): it
      // belongs to the one before.
      if (out.length) {
        out[out.length - 1]!.text += c;
        continue;
      }
      a = { text, voiced: false, bare: false, conj: false, head: '', dead: false, vowel: false };
    }
    while (i < ch.length && isMark(ch[i]!)) {
      a.text += ch[i++];
      a.bare = false;
    }
    out.push(a);
  }
  return out;
}

/** One Bengali word as it is sung, syllable by syllable. */
export function wordSyllables(word: string): string[] {
  if (!/[ঀ-৿]/.test(word)) return [word];
  // Inside a word, a conjunct's first consonant goes to the syllable before.
  const ak: Akshara[] = [];
  for (const a of aksharas(word)) {
    const prev = ak[ak.length - 1];
    if (prev && a.conj && a.head) {
      prev.text += a.head;
      prev.bare = false;
      ak.push({ ...a, text: a.text.slice(a.head.length), head: '' });
    } else ak.push(a);
  }
  const out: Akshara[] = [];
  ak.forEach((a, k) => {
    const prev = out[out.length - 1];
    const last = k === ak.length - 1;
    const joins =
      !!prev &&
      (a.dead ||
        (last && a.bare && !a.conj) ||
        (last && a.vowel && GLIDE.has(a.text[0]!) && a.text.length === 1 && (prev.voiced || prev.bare)));
    if (joins) {
      prev.text += a.text;
      prev.voiced = prev.voiced || a.voiced;
    } else out.push({ ...a });
  });
  return out.map((a) => a.text);
}

/**
 * A song's words, as pasted, in sung syllables: split on spaces, bar lines and punctuation
 * (a lone `-`, `–` or `০` stays: a held vowel, given a beat of its own); hyphenated words
 * split at the hyphen.
 */
export function syllables(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text || '').split(/[\s|।॥‖,;:!?"“”()[\]{}…]+/)) {
    if (!raw) continue;
    if (/^[-–—০0]+$/.test(raw)) {
      out.push('-');
      continue;
    }
    for (const part of raw.split(/[-–—]+/)) {
      const w = part.replace(/^['‘’]+|['‘’.]+$/g, '');
      if (w) out.push(...wordSyllables(w));
    }
  }
  return out;
}

/**
 * Lay syllables under the notes: the first in the box chosen (verse v of notes line n, beat
 * j), the rest one to each beat where a note starts, on through the lines that follow; the
 * beats between (held, silent) get `-`. A `-` syllable takes a beat of its own. Returns the
 * text, how many syllables were placed, and the box after the last.
 */
export function fillWords(text: string, n: number, v: number, j: number, syl: readonly string[]): { text: string; placed: number; next: { n: number; j: number } } {
  let t = text;
  let P = parseSong(t);
  let k = 0;
  let line = n;
  let from = Math.max(0, j);
  let next = { n, j };
  while (k < syl.length && P.noteLines[line]) {
    const nl = P.noteLines[line]!;
    const words: string[] = [];
    let b = from;
    for (; b < nl.beats.length && k < syl.length; b++) {
      const sung = nl.beats[b]!.units.some((u) => u.k === 'note');
      const first = k === 0;
      if (first || syl[k] === '-' || sung) words.push(syl[k++]!);
      else words.push('');
    }
    if (words.length) t = setLyrics(t, P, line, v, from, words);
    next = { n: line, j: b };
    P = parseSong(t);
    line++;
    from = 0;
  }
  // The box after the last syllable: on its line, or the first of the next.
  const nl = P.noteLines[next.n];
  if (nl && next.j >= nl.beats.length) next = P.noteLines[next.n + 1] ? { n: next.n + 1, j: 0 } : { n: next.n, j: nl.beats.length - 1 };
  return { text: t, placed: k, next };
}

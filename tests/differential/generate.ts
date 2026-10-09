/** Random notation for differential tests: every kind of character the parser treats specially. */

const W = (piece: string, weight: number) => ({ piece, weight });
const PIECES = [
  // Bengali notes, আকার, হসন্ত, রেফ, lower dot, বিসর্গ, zero-width characters
  ...['স', 'ঋ', 'র', 'গ', 'ম', 'প', 'দ', 'ধ', 'ণ', 'ন', 'জ্ঞ', 'হ্ম'].map((p) => W(p, 8)),
  W('া', 25), W('্', 3), W('র্', 4), W('.', 4), W('ঃ', 1), W('‌', 1), W('‍', 1), W('﻿', 1),
  // Sa Re Ga letters and marks
  ...['S', 's', 'r', 'R', 'g', 'G', 'M', 'm', 'P', 'p', 'd', 'D', 'n', 'N'].map((p) => W(p, 3)),
  W('#', 2), W("'", 3), W('’', 1), W('`', 1), W('^', 1), W('*', 1),
  // holds, rests, bars
  W('-', 6), W('–', 1), W('—', 1), W('~', 1), W('০', 1),
  W('x', 2), W('X', 1), W('_', 1), W('×', 1),
  W('|', 4), W('।', 1), W('॥', 1), W('‖', 1), W('I', 1),
  // characters the player does not know, including a surrogate pair
  W('ক', 1), W('a', 1), W('1', 1), W('জ', 1), W('হ', 1), W('ঞ', 1), W('\u{1F3B5}', 1),
  // spaces
  W(' ', 28), W('\t', 1), W(' ', 1),
];
const TOTAL = PIECES.reduce((s, p) => s + p.weight, 0);
const LYRIC_WORDS = ['সা', 'রে', 'গা', 'মা', '০', '0', '-', '–', 'আ', 'la', 'a', '|', '।', 'I', ' '];

const int = (rand: () => number, n: number) => Math.floor(rand() * n);
function piece(rand: () => number): string {
  let r = rand() * TOTAL;
  for (const p of PIECES) {
    r -= p.weight;
    if (r < 0) return p.piece;
  }
  return ' ';
}
function notesLine(rand: () => number): string {
  let s = '';
  const n = 1 + int(rand, 24);
  for (let i = 0; i < n; i++) s += piece(rand);
  return s;
}

export function randomSong(rand: () => number): string {
  const lines: string[] = [];
  const count = 1 + int(rand, 9);
  for (let i = 0; i < count; i++) {
    const k = rand();
    if (k < 0.68) lines.push(notesLine(rand));
    else if (k < 0.8) lines.push('>' + Array.from({ length: int(rand, 9) }, () => LYRIC_WORDS[int(rand, LYRIC_WORDS.length)]).join(' '));
    else if (k < 0.88) lines.push('#'.repeat(1 + int(rand, 2)) + (rand() < 0.5 ? ' ' : '') + notesLine(rand));
    else if (k < 0.93) lines.push(rand() < 0.5 ? '' : '   ');
    else lines.push('  ' + notesLine(rand) + (rand() < 0.5 ? '\r' : '  '));
  }
  return lines.join(rand() < 0.15 ? '\r\n' : '\n');
}

/** A selection in the text: a caret 40% of the time, else a range. */
export function randomSelection(rand: () => number, length: number): [number, number] {
  const s = int(rand, length + 1);
  return rand() < 0.4 ? [s, s] : [s, s + int(rand, length - s + 1)];
}

/** Hand-picked edge cases, alongside the generated songs. */
export const EDGE_CASES = [
  '', '\n', '   ', '#', '>', '> a', '| |', 'II', '.', "'", 'া', '্', 'র্', 'র্া', 'জ্', 'হ্', 'জ্ঞ', 'হ্ম', 'জ্‌ঞা',
  'M#', 'S#', '#S', 'সা‌রা', '﻿সা', 'সা﻿রা', 'সাঃ', 'ঃসা', 'S\r\nR', 'S\rR', ' S', 'S R', '\u{1F3B5}',
  'S\u{1F3B5}R', 'সা -া\n> a b c d', 'র্র্র্সা', '...সা', '..S', "S'''", 'S’`^*', 'x-S', '-S', 'S-R', 'S--', '০সা',
  '# heading\n> lyric', 'সা\n# h\n> a', 'সা | | রা', '| সা', 'সা |', 'সা' + '‍'.repeat(3) + 'রা', 'র্‌সা', 'র্‍ক',
  "সা' রা'", "পধা' নি", ".র্সা", "S.'", '.\n.', 'সা -া -া II\n> সা ০ ০ |',
];

/**
 * The 12 built-in exercises as compact Sa Re Ga specs: original practice material on standard
 * alankar patterns, not anyone's songs. `generate.ts` turns each into Bengali akarmatrik with
 * sargam lyrics. Edit these specs, never the generated text. Chosen by Rinat on 2026-10-14
 * (the prototype's own, which the comparison tests still use, are in
 * tests/reference-exercises.ts).
 */
import type { ExerciseSpec } from './types';

/** The notes from Sa up to upper Ma, a step apart: 0 is Sa, 7 upper Sa, 10 upper Ma. */
const STEP = ['S', 'R', 'G', 'M', 'P', 'D', 'N', "S'", "R'", "G'", "M'"];

/** An alankar: the same shape sung from each note in turn, going up from Sa until it starts
 * on upper Sa, then the same shape turned over coming down, from where the top shape ended
 * (`down` starts) to where the first one began. `bars` splits each shape into the taal's
 * parts; `perLine` shapes go on each line. */
function alankar(up: readonly number[], perLine: number, bars: readonly number[]): { up: string[]; down: string[] } {
  const shape = (start: number, offs: readonly number[]) => offs.map((o) => STEP[start + o]!);
  const top = 7 + Math.max(...up);
  const down = up.map((o) => -o);
  const line = (shapes: string[][]) => {
    const notes = shapes.flat();
    const parts: string[] = [];
    let i = 0;
    while (i < notes.length) for (const n of bars) parts.push(notes.slice(i, (i += n)).join(' '));
    return parts.join(' | ');
  };
  const lines = (starts: number[], offs: readonly number[]) => {
    const out: string[] = [];
    for (let k = 0; k < starts.length; k += perLine) out.push(line(starts.slice(k, k + perLine).map((s) => shape(s, offs))));
    return out;
  };
  const upStarts = Array.from({ length: 8 }, (_, k) => k);
  const downStarts = Array.from({ length: 8 }, (_, k) => top - k);
  return { up: lines(upStarts, up), down: lines(downStarts, down) };
}

const three = alankar([0, 1, 2], 2, [3]);
const four = alankar([0, 1, 2, 3], 2, [4]);
const skip = alankar([0, 2], 4, [4]);
const repeat3 = alankar([0, 1, 2, 0, 1, 2, 0, 1], 1, [4]);
const turn3 = alankar([0, 1, 0, 1, 2, 2, 1, 0], 1, [4]);
const turn4 = alankar([0, 1, 2, 3, 2, 1, 0], 1, [3, 2, 2]);

const LONG = ['S', 'R', 'G', 'M', 'P', 'D', 'N', "S'"];
/** Each note held for two Dadra cycles. */
const held = (n: string) => n + ' - - | - - - | - - - | - - -';

export const EXERCISE_SPECS: readonly ExerciseSpec[] = [
  {
    id: 'ex-long-notes',
    title: 'লম্বা স্বর',
    taal: 'dadra',
    tempo: 100,
    lyr: 'sargam',
    lines: [
      '# প্রতিটি স্বর দুই আবর্তন ধরে রাখুন। সুর যেন না কাঁপে।',
      '# আরোহ',
      ...LONG.map(held),
      '# অবরোহ',
      ...[...LONG].reverse().map(held),
    ],
  },
  {
    id: 'ex-scale',
    title: 'আরোহ-অবরোহ',
    taal: 'keherwa',
    tempo: 96,
    lyr: 'sargam',
    lines: [
      '# ড্রোন চালু রাখুন, প্রতিটি স্বর সা-এর সঙ্গে মিলিয়ে নিন।',
      '# আরোহ',
      "S R G M | P D N S'",
      '# অবরোহ',
      "S' N D P | M G R S",
    ],
  },
  {
    id: 'ex-alankar-bn',
    title: 'অলংকার · তিন স্বরের দল',
    taal: 'dadra',
    tempo: 110,
    lyr: 'sargam',
    lines: ['# তিন স্বরের দল। প্রথমে ধীরে, সুর স্থির হলে লয় বাড়ান।', '# আরোহ', ...three.up, '# অবরোহ', ...three.down],
  },
  {
    id: 'ex-alankar-4',
    title: 'অলংকার · চার স্বরের দল',
    taal: 'keherwa',
    tempo: 120,
    lyr: 'sargam',
    lines: ['# চার স্বরের দল। প্রতিটি দলের প্রথম স্বরে একটু জোর দিন।', '# আরোহ', ...four.up, '# অবরোহ', ...four.down],
  },
  {
    id: 'ex-skip',
    title: 'অলংকার · এক স্বর বাদ দিয়ে',
    taal: 'keherwa',
    tempo: 110,
    lyr: 'sargam',
    lines: ['# একটি স্বর বাদ দিয়ে লাফ। মাঝের স্বরটি মনে মনে ভাবুন।', '# আরোহ', ...skip.up, '# অবরোহ', ...skip.down],
  },
  {
    id: 'ex-laya',
    title: 'একগুণ, দ্বিগুণ, চৌগুণ',
    taal: 'keherwa',
    tempo: 80,
    lyr: 'sargam',
    lines: [
      '# তাল একই থাকে, শুধু প্রতি মাত্রায় স্বর বাড়ে।',
      '# একগুণ',
      "S R G M | P D N S'",
      "S' N D P | M G R S",
      '# দ্বিগুণ',
      "SR GM PD NS' | S'N DP MG RS",
      "SR GM PD NS' | S'N DP MG RS",
      '# চৌগুণ',
      "SRGM PDNS' S'NDP MGRS | S - - -",
    ],
  },
  {
    id: 'ex-leaps',
    title: 'সা থেকে স্বর-লাফ',
    taal: 'keherwa',
    tempo: 90,
    lyr: 'sargam',
    // Each leap back and forth on its own line, ending on a held Sa, so every line is full.
    // ("S X S - | S X S -" would sing Sa twice between two leaps, which the checker reads
    // as an octave slip.)
    lines: ['# সা থেকে প্রতিটি স্বরে লাফ দিন, আবার সা-তে ফিরুন।', ...LONG.slice(1).map((n) => `S ${n} S ${n} | S ${n} S -`)],
  },
  {
    id: 'ex-range',
    title: 'মন্দ্র থেকে তার সপ্তক',
    taal: 'keherwa',
    tempo: 100,
    lyr: 'sargam',
    lines: [
      '# নিচের সপ্তক থেকে উপরের সপ্তক। জোর না দিয়ে আরামে গলা খুলুন।',
      '.P .D .N S | R G M P',
      "D N S' R' | G' R' S' N",
      'D P M G | R S .N .D',
      '.P - - - | - - - -',
    ],
  },
  {
    // Komal Re and Dha (Bhairav thaat) and tivra Ma (Kalyan thaat) belong to different
    // thaats, so they are practised as two scales, one after the other.
    id: 'ex-komal-tivra',
    title: 'কোমল ঋ ও ধ, তীব্র মা',
    taal: 'keherwa',
    tempo: 90,
    lyr: 'sargam',
    lines: [
      '# কোমল ঋ (ঋা) ও কোমল ধ (দা) শুদ্ধ স্বরের চেয়ে একটু নিচে লাগে।',
      '# ভৈরব ঠাট',
      "S r G M | P d N S'",
      "S' N d P | M G r S",
      'S r G M | r G M P',
      'G M P d | M P d N',
      "P d N S' | S' - - -",
      "S' N d P | N d P M",
      'd P M G | P M G r',
      'M G r S | S - - -',
      '# তীব্র মা (হ্মা) শুদ্ধ মা-এর চেয়ে একটু উপরে লাগে।',
      '# কল্যাণ ঠাট',
      "S R G M# | P D N S'",
      "S' N D P | M# G R S",
      '.N R G M# | P - - -',
      "M# D N S' | S' - - -",
      "S' N D P | M# G R S",
    ],
  },
  {
    id: 'ex-repeat-3',
    title: 'অলংকার · সা রে গা সা রে গা সা রে',
    taal: 'keherwa',
    tempo: 100,
    lyr: 'sargam',
    lines: ['# আরোহ', ...repeat3.up, '# অবরোহ', ...repeat3.down],
  },
  {
    id: 'ex-turn-3',
    title: 'অলংকার · সা রে সা রে গা গা রে সা',
    taal: 'keherwa',
    tempo: 100,
    lyr: 'sargam',
    lines: ['# আরোহ', ...turn3.up, '# অবরোহ', ...turn3.down],
  },
  {
    id: 'ex-turn-4',
    title: 'অলংকার · সা রে গা মা গা রে সা',
    taal: 'rupak',
    tempo: 110,
    lyr: 'sargam',
    lines: ['# আরোহ', ...turn4.up, '# অবরোহ', ...turn4.down],
  },
];

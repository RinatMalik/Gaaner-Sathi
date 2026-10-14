/**
 * The prototype's 12 built-in exercises as compact Sa Re Ga specs, and its Sa Re Ga typing
 * example: the app's exercises until 2026-10-14, kept here as the comparison tests' fixture
 * (the generator must still turn them into reference/exercises.json byte for byte, and they
 * are what the prototype lists). Carried over byte-for-byte from reference/tests/exercises.gen.js.
 */
import { buildExercise } from '../src/core/exercises/generate';
import type { Exercise, ExerciseSpec } from '../src/core/exercises/types';

export const REFERENCE_SPECS: readonly ExerciseSpec[] = [
  {
    id: 'ex-long-notes',
    title: '১ · লম্বা স্বর',
    taal: 'dadra',
    tempo: 100,
    lyr: 'sargam',
    lines: [
      '# প্রতিটি স্বর এক আবর্তন ধরে রাখুন। সুর যেন না কাঁপে।',
      '# আরোহ',
      'S - - | - - - | R - - | - - -',
      'G - - | - - - | M - - | - - -',
      'P - - | - - - | D - - | - - -',
      "N - - | - - - | S' - - | - - -",
      '# অবরোহ',
      "S' - - | - - - | N - - | - - -",
      'D - - | - - - | P - - | - - -',
      'M - - | - - - | G - - | - - -',
      'R - - | - - - | S - - | - - -',
    ],
  },
  {
    id: 'ex-scale',
    title: '২ · আরোহ-অবরোহ',
    taal: 'keherwa',
    tempo: 96,
    lyr: 'sargam',
    lines: [
      '# ড্রোন চালু রাখুন, প্রতিটি স্বর সা-এর সঙ্গে মিলিয়ে নিন।',
      '# আরোহ',
      "S R G M | P D N S'",
      '# অবরোহ',
      "S' N D P | M G R S",
      'S - - - | - - - -',
    ],
  },
  {
    id: 'ex-alankar-bn',
    title: '৩ · অলংকার · তিন স্বরের দল',
    taal: 'dadra',
    tempo: 110,
    lyr: 'sargam',
    lines: [
      '# তিন স্বরের দল। প্রথমে ধীরে, সুর স্থির হলে লয় বাড়ান।',
      '# আরোহ',
      'S R G | R G M',
      'G M P | M P D',
      "P D N | D N S'",
      '# অবরোহ',
      "S' N D | N D P",
      'D P M | P M G',
      'M G R | G R S',
      'S - - | - - -',
    ],
  },
  {
    id: 'ex-alankar-4',
    title: '৪ · অলংকার · চার স্বরের দল',
    taal: 'keherwa',
    tempo: 120,
    lyr: 'sargam',
    lines: [
      '# চার স্বরের দল। প্রতিটি দলের প্রথম স্বরে একটু জোর দিন।',
      '# আরোহ',
      'S R G M | R G M P',
      'G M P D | M P D N',
      "P D N S' | S' - - -",
      '# অবরোহ',
      "S' N D P | N D P M",
      'D P M G | P M G R',
      'M G R S | S - - -',
    ],
  },
  {
    id: 'ex-skip',
    title: '৫ · অলংকার · এক স্বর বাদ দিয়ে',
    taal: 'keherwa',
    tempo: 110,
    lyr: 'sargam',
    lines: [
      '# একটি স্বর বাদ দিয়ে লাফ। মাঝের স্বরটি মনে মনে ভাবুন।',
      '# আরোহ',
      'S G R M | G P M D',
      "P N D S' | S' - - -",
      '# অবরোহ',
      "S' D N P | D M P G",
      'M R G S | S - - -',
    ],
  },
  {
    id: 'ex-laya',
    title: '৬ · একগুণ, দ্বিগুণ, চৌগুণ',
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
    title: '৭ · সা থেকে স্বর-লাফ',
    taal: 'keherwa',
    tempo: 90,
    lyr: 'sargam',
    lines: [
      '# সা থেকে প্রতিটি স্বরে লাফ দিন, আবার সা-তে ফিরুন।',
      'S R S - | S G S -',
      'S M S - | S P S -',
      'S D S - | S - - -',
      'S N S - | S - - -',
      "S S' S - | S - - -",
    ],
  },
  {
    id: 'ex-range',
    title: '৮ · মন্দ্র থেকে তার সপ্তক',
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
    id: 'ex-rupak',
    title: '৯ · রূপক তালে অলংকার',
    taal: 'rupak',
    tempo: 120,
    lyr: 'sargam',
    lines: [
      '# রূপক তাল ৩+২+২। প্রথম মাত্রা খালি, তাই হালকা করে শুরু করুন।',
      '# আরোহ',
      'S R G | M P | M G',
      'R G M | P D | P M',
      'G M P | D N | D P',
      "M P D | N S' | - -",
      '# অবরোহ',
      "S' N D | P M | P D",
      'N D P | M G | M P',
      'D P M | G R | G M',
      'P M G | R S | - -',
    ],
  },
  {
    id: 'ex-bhairav',
    title: '১০ · কোমল ঋ ও ধ · ভৈরব ঠাট',
    taal: 'keherwa',
    tempo: 90,
    lyr: 'sargam',
    lines: [
      '# কোমল ঋ (ঋা) ও কোমল ধ (দা) শুদ্ধ স্বরের চেয়ে একটু নিচে লাগে।',
      "S r G M | P d N S'",
      "S' N d P | M G r S",
      '# অলংকার',
      'S r G M | r G M P',
      'G M P d | M P d N',
      "P d N S' | S' - - -",
      "S' N d P | N d P M",
      'd P M G | P M G r',
      'M G r S | S - - -',
    ],
  },
  {
    id: 'ex-kalyan',
    title: '১১ · তীব্র মা · কল্যাণ ঠাট',
    taal: 'keherwa',
    tempo: 90,
    lyr: 'sargam',
    lines: [
      '# তীব্র মা (হ্মা) শুদ্ধ মা-এর চেয়ে একটু উপরে লাগে।',
      "S R G M# | P D N S'",
      "S' N D P | M# G R S",
      '# অলংকার',
      '.N R G M# | P - - -',
      "M# D N S' | S' - - -",
      "S' N D P | M# G R S",
      'S - - - | - - - -',
    ],
  },
  {
    id: 'ex-akar',
    title: '১২ · আকার সাধনা',
    taal: 'dadra',
    tempo: 90,
    lyr: 'aa',
    lines: [
      "# পুরো লাইন এক 'আ'-তে গান। স্বর বদলাবে, শ্বাস নয়।",
      'S R G | M P - | M G R | S - -',
      'R G M | P D - | P M G | R - -',
      'G M P | D N - | D P M | G - -',
      "M P D | N S' - | N D P | M - -",
      'S - - | - - -',
    ],
  },
];

/** The prototype's Sa Re Ga typing example: shows that Latin letters work too (written by hand). */
export const REFERENCE_TYPING_EXAMPLE: Exercise = {
  id: 'ex-alankar-lat', example: true, title: 'Typing example · Sa Re Ga letters', taal: 'dadra', tempo: 120,
  saKey: 0, saOct: 4, startOn: 1,
  text:
    '# Aroha (going up)\n' +
    'S R G | R G M | G M P | M P D\n' +
    '> sa re ga | re ga ma | ga ma pa | ma pa dha\n' +
    "P D N | D N S' | S' - - | - - -\n" +
    '> pa dha ni | dha ni sa | sa – – | – – –\n' +
    '# Avaroha (coming down)\n' +
    "S' N D | N D P | D P M | P M G\n" +
    '> sa ni dha | ni dha pa | dha pa ma | pa ma ga\n' +
    'M G R | G R S | S - - | - - -\n' +
    '> ma ga re | ga re sa | sa – – | – – –\n',
};

/** The prototype's 13 built-in exercises, in its order. */
export const REFERENCE_EXERCISES: readonly Exercise[] = [...REFERENCE_SPECS.map(buildExercise), REFERENCE_TYPING_EXAMPLE];

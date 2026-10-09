/**
 * The notation alphabet: Bengali akarmatrik and romanised sargam (docs/NOTATION.md).
 * Ported from the prototype's parser block; invisible and look-alike characters are
 * written as escapes.
 */

/** আকার: the vowel sign after a note letter. It never ends a beat. */
export const AKAR = 'া';
/** হসন্ত: after a note it lowers the octave (`ন্`); inside `র্` it forms the রেফ. */
export const HAS = '্';
export const VISARGA = 'ঃ';
/** রেফ: written before a note for the upper octave. */
export const REPH = 'র্';

/** Zero-width non-joiner, zero-width joiner and byte-order mark. */
export const ZW: ReadonlySet<string> = new Set(['‌', '‍', '﻿']);

/** Bengali note letters by semitone above Sa (জ্ঞ and হ্ম are read as conjuncts). */
export const BN_NOTE: ReadonlyMap<string, number> = new Map([
  ['স', 0], ['ঋ', 1], ['র', 2], ['গ', 4], ['ম', 5], ['প', 7], ['দ', 8], ['ধ', 9], ['ণ', 10], ['ন', 11],
]);
/** Letters that can follow a রেফ, so `র্` before one of them marks the upper octave. */
export const BN_START: ReadonlySet<string> = new Set(['স', 'ঋ', 'র', 'গ', 'জ', 'ম', 'হ', 'প', 'দ', 'ধ', 'ণ', 'ন']);
/** Sa Re Ga letters: lower case r g d n are komal; M# is tivra Ma. */
export const LAT_NOTE: ReadonlyMap<string, number> = new Map([
  ['S', 0], ['s', 0], ['r', 1], ['R', 2], ['g', 3], ['G', 4], ['M', 5], ['m', 5],
  ['P', 7], ['p', 7], ['d', 8], ['D', 9], ['n', 10], ['N', 11],
]);

/** Bar lines: | । ॥ ‖ and a Latin capital I. */
export const BAR_CH: ReadonlySet<string> = new Set(['|', '।', '॥', '‖', 'I']);
/** Holds: hyphen, en dash, em dash, tilde, Bengali zero ০. */
export const HOLD_CH: ReadonlySet<string> = new Set(['-', '–', '—', '~', '০']);
/** Rests: x X _ ×. */
export const REST_CH: ReadonlySet<string> = new Set(['x', 'X', '_', '×']);
/** Upper-octave marks after a Sa Re Ga note: ' ’ ` ^ *. */
export const UP_CH: ReadonlySet<string> = new Set(["'", '’', '`', '^', '*']);

/** Note letters by semitone (0 Sa … 11 Ni), as the editor writes them. */
export const BN_LETTER = ['স', 'ঋ', 'র', 'জ্ঞ', 'গ', 'ম', 'হ্ম', 'প', 'দ', 'ধ', 'ণ', 'ন'] as const;
export const LAT_LETTER = ['S', 'r', 'R', 'g', 'G', 'M', 'M#', 'P', 'd', 'D', 'n', 'N'] as const;

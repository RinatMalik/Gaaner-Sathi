/**
 * Turns compact Sa Re Ga exercise specs into Bengali akarmatrik with lyrics, the way the
 * reference generator (reference/tests/exercises.gen.js) does. The output is byte-identical
 * to reference/exercises.json; tests/ported/exercises.test.ts holds it to that.
 */
import { parseNotesLine } from '../notation/parse';
import { AKAR, BN_LETTER, REPH } from '../notation/symbols';
import type { LineBeat, Unit } from '../notation/types';
import type { Exercise, ExerciseSpec } from './types';

/** Sargam syllables sung for each semitone (komal and shuddha share a name). */
const SYL = ['সা', 'রে', 'রে', 'গা', 'গা', 'মা', 'মা', 'পা', 'ধা', 'ধা', 'নি', 'নি'];

const bnUnit = (u: Unit) =>
  u.k === 'hold' ? '-' : u.k === 'rest' ? 'x' : '.'.repeat(Math.max(0, -u.oct)) + REPH.repeat(Math.max(0, u.oct)) + BN_LETTER[u.semi];
const bnBeat = (b: LineBeat) => b.units.map(bnUnit).join('') + AKAR;
const sylBeat = (b: LineBeat) =>
  b.units.every((u) => u.k !== 'note') ? '০' : b.units.map((u) => (u.k === 'note' ? SYL[u.semi] : '')).join('');

/** One Sa Re Ga notes line → its Bengali line, plus a lyrics line. */
export function convertLine(line: string, lyr: ExerciseSpec['lyr']): string {
  const r = parseNotesLine(line, 0);
  const join = (f: (b: LineBeat, j: number) => string) =>
    r.beats.map((b, j) => (j && r.bars.has(j) ? '| ' : '') + f(b, j)).join(' ') + (r.bars.has(r.beats.length) ? ' |' : '');
  const notes = join(bnBeat);
  let ly: string | null = null;
  if (lyr === 'sargam') ly = '> ' + join(sylBeat);
  if (lyr === 'aa') ly = '> ' + join((_b, j) => (j === 0 ? 'আ' : '০'));
  return ly ? notes + '\n' + ly : notes;
}

export function buildExercise(x: ExerciseSpec): Exercise {
  const lines = x.lines.map((l) => (l.startsWith('#') ? l : convertLine(l, x.lyr)));
  const text = lines.join('\n') + '\n';
  return { id: x.id, example: true, title: x.title, taal: x.taal, tempo: x.tempo, saKey: 0, saOct: 4, startOn: 1, text };
}

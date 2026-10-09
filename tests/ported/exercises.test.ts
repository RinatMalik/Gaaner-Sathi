// Ported from reference/tests/exercises.gen.js: each exercise must play identically in
// Sa Re Ga and in Bengali, parse with no errors or warnings, and pass the checker; and the
// generated text must equal reference/exercises.json byte for byte.
import { describe, expect, it } from 'vitest';
import reference from '../../reference/exercises.json';
import { EXERCISES } from '../../src/core/exercises';
import { buildExercise } from '../../src/core/exercises/generate';
import { EXERCISE_SPECS } from '../../src/core/exercises/specs';
import { checkNotation as CK } from '../../src/core/notation/check';
import { parseSong as P } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { taalInfo } from '../../src/core/taal/taals';

const sig = (p: ParsedSong) => p.events.map((e) => e.semi + ':' + e.oct + '@' + e.start.toFixed(3) + 'x' + e.dur.toFixed(3)).join(' ');

describe('exercises (reference generator)', () => {
  for (const x of EXERCISE_SPECS) {
    it(`${x.title} · ${x.taal}: plays identically, checks clean`, () => {
      const { text } = buildExercise(x);
      const latin = P(x.lines.filter((l) => !l.startsWith('#')).join('\n'));
      const bn = P(text);
      expect(sig(bn)).toBe(sig(latin));
      expect(CK(bn, taalInfo(x.taal), 0)).toEqual([]);
      expect(bn.errors).toEqual([]);
      expect(bn.warnings).toEqual([]);
    });
  }

  it('generated exercises equal reference/exercises.json', () => {
    expect(EXERCISE_SPECS.map(buildExercise)).toEqual(reference);
  });

  it('deliberate octave not flagged; real slip still flagged', () => {
    expect(CK(P("S S' S - | S - - -"), taalInfo('keherwa'), 0)).toHaveLength(0);
    expect(CK(P("N S' R' S N D"), taalInfo('dadra'), 0)).toHaveLength(1);
  });
});

describe('exercises (added cases)', () => {
  it('the app lists 13: the 12 generated, then the Sa Re Ga typing example', () => {
    expect(EXERCISES.map((e) => e.id)).toEqual([...EXERCISE_SPECS.map((x) => x.id), 'ex-alankar-lat']);
  });
  it('every built-in exercise, the typing example included, checks clean', () => {
    for (const e of EXERCISES) {
      const p = P(e.text);
      expect({ id: e.id, issues: CK(p, taalInfo(e.taal), e.startOn - 1), errors: p.errors, warnings: p.warnings }).toEqual({
        id: e.id, issues: [], errors: [], warnings: [],
      });
    }
  });
});

// Ported from reference/tests/exercises.gen.js: each exercise must play identically in
// Sa Re Ga and in Bengali, parse with no errors or warnings, and pass the checker; and the
// generator must turn the prototype's specs into reference/exercises.json byte for byte.
// The app's own exercises (Rinat's 12, 2026-10-14) are held to the same rules.
import { describe, expect, it } from 'vitest';
import reference from '../../reference/exercises.json';
import { EXERCISES } from '../../src/core/exercises';
import { buildExercise } from '../../src/core/exercises/generate';
import { EXERCISE_SPECS } from '../../src/core/exercises/specs';
import type { ExerciseSpec } from '../../src/core/exercises/types';
import { checkNotation as CK } from '../../src/core/notation/check';
import { parseSong as P } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { taalInfo } from '../../src/core/taal/taals';
import { REFERENCE_SPECS } from '../reference-exercises';

const sig = (p: ParsedSong) => p.events.map((e) => e.semi + ':' + e.oct + '@' + e.start.toFixed(3) + 'x' + e.dur.toFixed(3)).join(' ');

function playsIdenticallyAndChecksClean(x: ExerciseSpec): void {
  const { text } = buildExercise(x);
  const latin = P(x.lines.filter((l) => !l.startsWith('#')).join('\n'));
  const bn = P(text);
  expect(sig(bn)).toBe(sig(latin));
  expect(CK(bn, taalInfo(x.taal), 0)).toEqual([]);
  expect(bn.errors).toEqual([]);
  expect(bn.warnings).toEqual([]);
}

describe('exercises (reference generator)', () => {
  for (const x of REFERENCE_SPECS) {
    it(`${x.title} · ${x.taal}: plays identically, checks clean`, () => playsIdenticallyAndChecksClean(x));
  }

  it('generated exercises equal reference/exercises.json', () => {
    expect(REFERENCE_SPECS.map(buildExercise)).toEqual(reference);
  });

  it('deliberate octave not flagged; real slip still flagged', () => {
    expect(CK(P("S S' S - | S - - -"), taalInfo('keherwa'), 0)).toHaveLength(0);
    expect(CK(P("N S' R' S N D"), taalInfo('dadra'), 0)).toHaveLength(1);
  });
});

describe('the app’s exercises', () => {
  for (const x of EXERCISE_SPECS) {
    it(`${x.title} · ${x.taal}: plays identically, checks clean`, () => playsIdenticallyAndChecksClean(x));
  }

  it('are Rinat’s 12, in order, with no numbers in their titles', () => {
    expect(EXERCISES.map((e) => e.id)).toEqual([
      'ex-long-notes', 'ex-scale', 'ex-alankar-bn', 'ex-alankar-4', 'ex-skip', 'ex-laya',
      'ex-leaps', 'ex-range', 'ex-komal-tivra', 'ex-repeat-3', 'ex-turn-3', 'ex-turn-4',
    ]);
    for (const e of EXERCISES) expect(e.title).not.toMatch(/^[০-৯0-9]/);
  });

  it('each checks clean as the app reads it', () => {
    for (const e of EXERCISES) {
      const p = P(e.text);
      expect({ id: e.id, issues: CK(p, taalInfo(e.taal), e.startOn - 1), errors: p.errors, warnings: p.warnings }).toEqual({
        id: e.id, issues: [], errors: [], warnings: [],
      });
    }
  });

  it('go up to the next octave and come back as asked, with no line of Sa alone at the end', () => {
    const lines = (id: string) => EXERCISE_SPECS.find((x) => x.id === id)!.lines.filter((l) => !l.startsWith('#'));
    // Each long note held for two Dadra cycles (12 beats).
    expect(lines('ex-long-notes')).toHaveLength(16);
    for (const l of lines('ex-long-notes')) expect(P(l).total).toBe(12);
    expect(lines('ex-scale')).toEqual(["S R G M | P D N S'", "S' N D P | M G R S"]);
    // Up to upper Sa Re Ga (Ma, Ga) and back from there.
    expect(lines('ex-alankar-bn').at(3)).toBe("N S' R' | S' R' G'");
    expect(lines('ex-alankar-bn').at(4)).toBe("G' R' S' | R' S' N");
    expect(lines('ex-alankar-bn').at(-1)).toBe('M G R | G R S');
    expect(lines('ex-alankar-4').at(3)).toBe("N S' R' G' | S' R' G' M'");
    expect(lines('ex-alankar-4').at(4)).toBe("M' G' R' S' | G' R' S' N");
    expect(lines('ex-skip').at(1)).toBe("P N D S' | N R' S' G'");
    expect(lines('ex-skip').at(2)).toBe("G' S' R' N | S' D N P");
    // Every leap line full: Sa and the note back and forth, ending on a held Sa.
    expect(lines('ex-leaps')).toHaveLength(7);
    for (const l of lines('ex-leaps')) expect(l).toMatch(/^S (\S+) S \1 \| S \1 S -$/);
    // The three new patterns, from Sa to the top and back.
    expect(lines('ex-repeat-3').slice(0, 2)).toEqual(['S R G S | R G S R', 'R G M R | G M R G']);
    expect(lines('ex-repeat-3').slice(7, 9)).toEqual(["S' R' G' S' | R' G' S' R'", "G' R' S' G' | R' S' G' R'"]);
    expect(lines('ex-turn-3').slice(0, 2)).toEqual(['S R S R | G G R S', 'R G R G | M M G R']);
    expect(lines('ex-turn-3').slice(7, 9)).toEqual(["S' R' S' R' | G' G' R' S'", "G' R' G' R' | S' S' R' G'"]);
    expect(lines('ex-turn-4').at(0)).toBe('S R G | M G | R S');
    expect(lines('ex-turn-4').slice(7, 9)).toEqual(["S' R' G' | M' G' | R' S'", "M' G' R' | S' R' | G' M'"]);
    expect(lines('ex-turn-4').at(-1)).toBe('M G R | S R | G M');
    for (const id of ['ex-repeat-3', 'ex-turn-3', 'ex-turn-4']) expect(lines(id)).toHaveLength(16);
  });
});

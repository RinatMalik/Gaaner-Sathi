// The port against the prototype's own parser, checker and edit operations, on hand-picked
// edge cases, every built-in exercise and 2,000 generated songs (seeded, so repeatable).
import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../src/core/exercises';
import { checkNotation } from '../../src/core/notation/check';
import { joinBeats, notesInRange, shiftOctaves, splitBeats } from '../../src/core/notation/edit';
import { parseNotesLine, parseSong } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { taalInfo } from '../../src/core/taal/taals';
import { canon, seeded } from '../helpers';
import { EDGE_CASES, randomSelection, randomSong } from './generate';
import { proto, protoRhythm } from './prototype';

const rand = seeded(20261010);
const SONGS = [...EDGE_CASES, ...EXERCISES.map((e) => e.text), ...Array.from({ length: 2000 }, () => randomSong(rand))];
const TAAL_IDS = ['dadra', 'keherwa', 'rupak', 'jhaptal', 'ektal', 'teentaal'];
const NONE = { differing: 0, first: [] };

/** How many cases differ, with the first few to debug from. */
function differences<T>(cases: T[], same: (c: T) => boolean) {
  const bad = cases.filter((c) => !same(c));
  return { differing: bad.length, first: bad.slice(0, 3) };
}

describe('notation matches the prototype', () => {
  const parsed = new Map<string, [ParsedSong, unknown]>(SONGS.map((t) => [t, [parseSong(t), proto.parseSong(t)]]));

  it(`parseSong on ${SONGS.length} songs`, () => {
    expect(differences(SONGS, (t) => canon(parsed.get(t)![0]) === canon(parsed.get(t)![1]))).toEqual(NONE);
  });

  it('parseNotesLine on every line, at an offset', () => {
    const lines = SONGS.flatMap((t) => t.split('\n'));
    expect(differences(lines, (l) => canon(parseNotesLine(l, 7)) === canon(proto.parseNotesLine(l, 7)))).toEqual(NONE);
  });

  it('checkNotation in every taal, from several start beats', () => {
    const cases = SONGS.flatMap((t) => TAAL_IDS.flatMap((id) => [0, 1, 2, 3, 5].map((off) => ({ t, id, off }))));
    expect(
      differences(cases, ({ t, id, off }) => {
        const [P, Q] = parsed.get(t)!;
        return canon(checkNotation(P, taalInfo(id), off)) === canon(proto.checkNotation(Q, protoRhythm.taalInfo(id), off));
      }),
    ).toEqual(NONE);
  });

  it('notesInRange, shiftOctaves, joinBeats and splitBeats on random selections', () => {
    const pick = seeded(7);
    const cases = SONGS.flatMap((t) => Array.from({ length: 4 }, () => ({ t, sel: randomSelection(pick, t.length) })));
    expect(
      differences(cases, ({ t, sel: [s, e] }) => {
        const [P, Q] = parsed.get(t)!;
        return (
          canon(notesInRange(P, s, e)) === canon(proto.notesInRange(Q, s, e)) &&
          canon(shiftOctaves(t, s, e, 1)) === canon(proto.shiftOctaves(t, s, e, 1)) &&
          canon(shiftOctaves(t, s, e, -1)) === canon(proto.shiftOctaves(t, s, e, -1)) &&
          canon(joinBeats(t, s, e)) === canon(proto.joinBeats(t, s, e)) &&
          canon(splitBeats(t, s, e)) === canon(proto.splitBeats(t, s, e))
        );
      }),
    ).toEqual(NONE);
  });
});

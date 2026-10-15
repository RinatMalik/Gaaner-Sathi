// The port against the prototype's own parser, checker and edit operations, on hand-picked
// edge cases, every built-in exercise and 2,000 generated songs (seeded, so repeatable).
import { describe, expect, it } from 'vitest';
import { REFERENCE_EXERCISES as EXERCISES } from '../reference-exercises';
import { checkNotation } from '../../src/core/notation/check';
import { joinBeats, notesInRange, shiftOctaves, splitBeats } from '../../src/core/notation/edit';
import { parseNotesLine, parseSong } from '../../src/core/notation/parse';
import type { NoteUnit, ParsedSong } from '../../src/core/notation/types';
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

/** Where the edit operations differ from the prototype on purpose (2026-10-15): a Bengali
 * note moved two octaves up is written with two marks after it (`সা''`), where the prototype
 * wrote two রেফs (`র্র্সা`), which fonts draw badly (Rinat); and where one note's marks after
 * it meet the next note's before it, ours keep them in that order, where the prototype put
 * them the wrong way round (`Nর্'হ্ম` for N' and upper হ্ম, read as a Re). Such a result must
 * give the same counts and say the same notes as the prototype's, or the notes intended. */
function sameEdit(ours: object, theirs: object, want: () => unknown[]): boolean {
  if (canon(ours) === canon(theirs)) return true;
  const a = ours as { text?: string };
  const b = theirs as { text?: string };
  if (a.text === undefined || b.text === undefined) return false;
  const rest = (r: object) => canon(Object.fromEntries(Object.entries(r).filter(([k]) => !['text', 's', 'e', 'lo', 'hi', 'rep'].includes(k))));
  const mine = canon(notesOf(a.text));
  return rest(ours) === rest(theirs) && (mine === canon(notesOf(b.text)) || mine === canon(want()));
}
/** Every unit of a song in order: [semitone, octave] for a note, else its kind; `oct` gives
 * a note's octave. */
function notesOf(t: string, oct: (u: NoteUnit) => number = (u) => u.oct): unknown[] {
  return parseSong(t).beatList.flatMap((x) => (x ? x.units.map((u) => (u.k === 'note' ? [u.semi, oct(u)] : u.k)) : []));
}
/** The notes after moving those selected `d` octaves (as far as ±2). */
function shifted(t: string, s: number, e: number, d: number): unknown[] {
  const sel = new Set(notesInRange(parseSong(t), s, e).notes.map((u) => u.cs));
  return notesOf(t, (u) => (sel.has(u.cs) ? Math.max(-2, Math.min(2, u.oct + d)) : u.oct));
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
          sameEdit(shiftOctaves(t, s, e, 1), proto.shiftOctaves(t, s, e, 1), () => shifted(t, s, e, 1)) &&
          sameEdit(shiftOctaves(t, s, e, -1), proto.shiftOctaves(t, s, e, -1), () => shifted(t, s, e, -1)) &&
          canon(joinBeats(t, s, e)) === canon(proto.joinBeats(t, s, e)) &&
          sameEdit(splitBeats(t, s, e), proto.splitBeats(t, s, e), () => notesOf(t))
        );
      }),
    ).toEqual(NONE);
  });
});

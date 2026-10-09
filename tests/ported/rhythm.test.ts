// Ported one-for-one from reference/tests/rhythm.test.js: same cases, same expected values.
import { describe, expect, it } from 'vitest';
import { LAYERS, layerHits, rhythmTable as RT, type RhythmTable } from '../../src/core/taal/rhythm';
import { taalInfo as TI } from '../../src/core/taal/taals';

const bols = (R: RhythmTable, i: number) => R.slots[i]!.filter((h) => h.lane === 'bol').map((h) => h.bol + '@' + h.frac);
const TAAL_IDS = ['dadra', 'keherwa', 'rupak', 'jhaptal', 'ektal', 'teentaal'];

describe('rhythm (reference suite)', () => {
  it('dadra normal slot0', () => expect(bols(RT('tabla', 'dadra', 1, []), 0)).toEqual(['Dha@0']));
  it('dadra double slot0', () => expect(bols(RT('tabla', 'dadra', 2, []), 0)).toEqual(['Dha@0', 'Dhin@0.5']));
  it('dadra double slot3 restarts theka', () => expect(bols(RT('tabla', 'dadra', 2, []), 3)).toEqual(['Dha@0', 'Dhin@0.5']));
  it('dadra half: window', () => expect(RT('tabla', 'dadra', 0.5, []).W).toBe(12));
  it('dadra half slot1 empty, slot2 Dhin', () => {
    const R = RT('tabla', 'dadra', 0.5, []);
    expect([bols(R, 1), bols(R, 2)]).toEqual([[], ['Dhin@0']]);
  });
  it('dadra half: theka sam every 2 cycles', () => {
    const R = RT('tabla', 'dadra', 0.5, []);
    expect([bols(R, 6), bols(R, 0)]).toEqual([['Dha@0'], ['Dha@0']]);
  });
  it('kit double: hits per cycle', () => expect(RT('kit', 'keherwa', 2, ['shaker']).slots.flat().length).toBe((3 + 2 + 8 + 1 + 16) * 2));
  it('dadra fill from vibhag 2', () => expect(RT('tabla', 'dadra', 1, []).fillFrom).toBe(3));
  it('dadra fill last matra', () => expect(RT('tabla', 'dadra', 1, []).fill![5]!.map((h) => h.bol)).toEqual(['Dha', 'Ge']));
  it('ektal fill', () =>
    expect([RT('tabla', 'ektal', 1, []).fillFrom, RT('kit', 'ektal', 1, []).fill![11]!.map((h) => h.lane)]).toEqual([10, ['tM', 'tL']]));
  it('every hit lands inside its matra', () => {
    const all = ['tabla', 'dholak', 'kit', 'click'].flatMap((st) =>
      TAAL_IDS.flatMap((t) =>
        [0.5, 1, 2].map((sp) => {
          const ids = Object.keys(LAYERS).filter((id) => (LAYERS[id as keyof typeof LAYERS].styles as readonly string[]).includes(st));
          return RT(st, t, sp, ids).slots.flat().every((h) => h.frac >= 0 && h.frac < 1);
        }),
      ),
    );
    expect(all.every(Boolean)).toBe(true);
  });
  it('every layer used per taal', () => {
    const ok = TAAL_IDS.every((t) =>
      Object.keys(LAYERS).every((id) => layerHits(id, TI(t)).length > 0 && layerHits(id, TI(t)).every((h) => h.pos >= 0 && h.pos < TI(t).cycle)),
    );
    expect(ok).toBe(true);
  });
});

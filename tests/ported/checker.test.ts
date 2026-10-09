// Ported one-for-one from reference/tests/checker.test.js: same cases, same expected values.
import { describe, expect, it } from 'vitest';
import { checkNotation as CK, type CheckIssue } from '../../src/core/notation/check';
import { parseSong as P } from '../../src/core/notation/parse';

const T = {
  dadra: { name: 'Dadra', cycle: 6, starts: [0, 3] },
  keherwa: { name: 'Keherwa', cycle: 8, starts: [0, 4] },
  rupak: { name: 'Rupak', cycle: 7, starts: [0, 3, 5] },
};
const N = ['S', 'r', 'R', 'g', 'G', 'M', 'M#', 'P', 'd', 'D', 'n', 'N'];
const fmt = (r: CheckIssue[]) =>
  r
    .map((x) =>
      x.kind === 'octave'
        ? `oct L${x.line + 1} ${x.notes.map((u) => N[u.semi] + (u.oct > 0 ? "'" : u.oct < 0 ? '.' : '')).join('')} ${x.delta > 0 ? '+' : '-'}`
        : `${x.kind} L${x.line + 1} b${x.bar} len${x.len} exp${x.exp}`,
    )
    .join(' ; ') || 'none';

describe('checker (reference suite)', () => {
  it('dadra clean', () => expect(fmt(CK(P('সা -া রা | গা -া মা | পা -া ধা | পা -া -া'), T.dadra, 0))).toBe('none'));
  it('dadra extra beat in bar 2', () => expect(fmt(CK(P('সা -া রা | গা -া মা পা | পা -া ধা | পা -া -া'), T.dadra, 0))).toBe('bar L1 b2 len4 exp3'));
  it('keherwa missing beat', () => expect(fmt(CK(P("S R G M | P D N | S' - - -"), T.keherwa, 0))).toBe('bar L1 b2 len3 exp4'));
  it('keherwa full-cycle bars ok', () => expect(fmt(CK(P('S R G M P D N S | S - - - - - - -'), T.keherwa, 0))).toBe('none'));
  it('line w/o bars wrong length', () => expect(fmt(CK(P("S R G M P\nD N S' -"), T.keherwa, 0))).toBe('line L1 b1 len5 exp4'));
  it('pickup start (startOn 4 in dadra)', () => expect(fmt(CK(P('S R G | M - - | P - -'), T.dadra, 3))).toBe('none'));
  it('aroha clean', () => expect(fmt(CK(P("S R G M P D N S'"), T.keherwa, 0))).toBe('none'));
  it('lower slip', () => expect(fmt(CK(P('S .N .D D .N S'), T.dadra, 0))).toBe('oct L1 D -'));
  it('two-note slip', () => expect(fmt(CK(P("S' R' S R S' N"), T.dadra, 0))).toBe('oct L1 SR +'));
  it('examples clean', () => expect(fmt(CK(P('পধা নর্সা র্সা | নধা পমা গা | মগা রসা .নসা | সা -া -া'), T.dadra, 0))).toBe('none'));
  // The reference builds this expected value with a string expression that evaluates to 'oct L1 S +'.
  it('octave slip middle Sa among upper', () => expect(fmt(CK(P("N S' R' S N D"), T.dadra, 0))).toBe('oct L1 S +'));
});

// Ported one-for-one from reference/tests/parser.test.js: same cases, same expected values.
import { describe, expect, it } from 'vitest';
import { shiftOctaves as SH } from '../../src/core/notation/edit';
import { parseNotesLine as L, parseSong as P } from '../../src/core/notation/parse';

const N = ['S', 'r', 'R', 'g', 'G', 'M', 'M#', 'P', 'd', 'D', 'n', 'N'];
const show = (line: string) =>
  L(line)
    .beats.map(
      (b) =>
        b.units
          .map((u) =>
            u.k === 'note'
              ? (u.oct < 0 ? '.'.repeat(-u.oct) : '') + N[u.semi] + (u.oct > 0 ? "'".repeat(u.oct) : '')
              : u.k === 'hold'
                ? '-'
                : 'x',
          )
          .join('') + (b.err ? '!' : ''),
    )
    .join(' ');
const sh = (t: string, s: number, e: number, d: number) => {
  const r = SH(t, s, e, d);
  return r.text + ' [' + r.text.slice(r.s, r.e) + '] n=' + r.count;
};

describe('parser (reference suite)', () => {
  // regression: same readings as v1
  const reads: [string, string][] = [
    ['সা সা পা | র্সা র্সা -া | না র্সা না | ধা না ধা', "S S P S' S' - N S' N D N D"],
    ['সারাগা', 'SRG'],
    ['পাধা', 'PD'],
    ['মাপা মা', 'MP M'],
    ['পা ধা', 'P D'],
    ['পধা নর্সা র্সা', "PD NS' S'"],
    ['ন্সা .নসা ধ্‌া', '.NS .NS .D'],
    ['জ্ঞা হ্মা ঋা দা ণা', 'g M# r d n'],
    ['র্রা র্গা র্া', "R' G' .R"],
    ["S R G | S' - - | .N S x | M# PD S-R", "S R G S' - - .N S x M# PD S-R"],
    ['সা -া -া II', 'S - -'],
    ["সা' রা", "S' R"],
    ['সাক', 'S!'],
  ];
  for (const [i, e] of reads) it('read ' + i, () => expect(show(i)).toBe(e));

  // offsets
  it('beat spans', () => {
    const txt = "# head\n  সা রা | র্সা\n> a b c\nS P' .N";
    const p = P(txt);
    expect(p.beatList.map((b) => txt.slice(b.a, b.b)).join(',')).toBe("সা,রা,র্সা,S,P',.N");
  });

  // shifts
  it('caret middle Sa up', () => {
    const t = 'না সা -া';
    const c = t.indexOf('সা') + 2;
    expect(sh(t, c, c, 1)).toBe('না র্সা -া [র্সা] n=1');
  });
  it('caret upper Sa down', () => {
    const t = 'না র্সা -া';
    const c = t.indexOf('সা') + 1;
    expect(sh(t, c, c, -1)).toBe('না সা -া [সা] n=1');
  });
  it('range up', () => {
    const t = 'না সা ধা';
    expect(sh(t, 0, t.length, 1)).toBe('র্না র্সা র্ধা [র্না র্সা র্ধা] n=3');
  });
  it('down twice', () => {
    const t = 'সা রা';
    const r1 = SH(t, 0, t.length, -1);
    const r = SH(r1.text, 0, r1.text.length, -1);
    expect(r.text + ' [' + r.text.slice(r.s, r.e) + '] n=' + r.count).toBe('..সা ..রা [..সা ..রা] n=2');
  });
  it('lower Ni up', () => {
    const t = '.না সা';
    expect(sh(t, 0, 3, 1)).toBe('না সা [না] n=1');
  });
  it('hasanta lower up (whole beat)', () => {
    const t = 'ন্সা';
    expect(sh(t, 0, t.length, 1)).toBe('নর্সা [নর্সা] n=2');
  });
  it('caret picks last note in beat', () => {
    const t = 'পধা';
    const c = t.length;
    expect(sh(t, c, c, 1)).toBe('পর্ধা [পর্ধা] n=1');
  });
  it('latin range down', () => {
    const t = "S R G | N S' -";
    expect(sh(t, 0, t.length, -1)).toBe('.S .R .G | .N S - [.S .R .G | .N S -] n=5');
  });
  it('latin tivra upper down', () => {
    const t = "M#' P";
    expect(sh(t, 0, 2, -1)).toBe('M# P [M#] n=1');
  });
  it('latin adjacent up', () => {
    const t = "S'R";
    expect(sh(t, 0, 3, 1)).toBe("S''R' [S''R'] n=2");
  });
  it('mark after akar', () => {
    const t = "সা' রা";
    const c = 1;
    expect(sh(t, c, c, -1)).toBe('সা রা [সা] n=1');
  });
  it('upper Re', () => {
    const t = 'রা';
    expect(sh(t, 0, 2, 1)).toBe('র্রা [র্রা] n=1');
  });
  it('conjuncts up', () => {
    const t = 'জ্ঞা হ্মা';
    expect(sh(t, 0, t.length, 1)).toBe('র্জ্ঞা র্হ্মা [র্জ্ঞা র্হ্মা] n=2');
  });
  // re-parse shifted text
  it('reparse conjuncts', () => expect(show('র্জ্ঞা র্হ্মা')).toBe("g' M#'"));
  it('cap at +2', () => {
    const t = 'র্র্সা';
    expect(String(SH(t, 0, t.length, 1).count)).toBe('0');
  });

  // events unchanged for multi-line
  const q = P('সা -া রা\n> a b c\nগা -া -া');
  it('events', () => expect(q.events.map((e) => N[e.semi] + '@' + e.start + 'x' + e.dur).join(' ')).toBe('S@0x2 R@2x1 G@3x3'));
  it('lines', () => expect(q.noteLines.map((l) => l.srcLine).join(',')).toBe('1,3'));
});

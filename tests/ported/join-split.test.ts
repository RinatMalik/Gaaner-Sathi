// Ported one-for-one from reference/tests/join-split.test.js: same cases, same expected values.
import { describe, expect, it } from 'vitest';
import { joinBeats as J, splitBeats as SP } from '../../src/core/notation/edit';

const j = (t: string, s: number, e: number) => {
  const r = J(t, s, e);
  return r.ok ? r.text + ' [' + r.text.slice(r.s, r.e) + ']' : 'ERR ' + r.msg;
};
const sp = (t: string, s: number, e: number) => {
  const r = SP(t, s, e);
  return r.ok ? r.text + ' [' + r.text.slice(r.s, r.e) + ']' : 'ERR ' + r.msg;
};

describe('join and split (reference suite)', () => {
  it('join caret beat with next', () => expect(j('সা পা ধা না', 3, 3)).toBe('সা পধা না [পধা]'));
  it('join a selected run of three', () => expect(j('সা পা ধা না | সা', 3, 10)).toBe('সা পধনা | সা [পধনা]'));
  it('join keeps upper mark', () => expect(j('সা র্সা রা', 3, 3)).toBe('সা র্সরা [র্সরা]'));
  it('join latin', () => expect(j('S P D N', 2, 2)).toBe('S PD N [PD]'));
  it('join across bar refused', () => expect(j('সা রা | গা', 3, 3).startsWith('ERR')).toBe(true));
  it('join at line end refused', () => expect(j('সা রা\nগা', 3, 3).startsWith('ERR')).toBe(true));
  it('split bengali', () => expect(sp('সা পধা না', 3, 3)).toBe('সা পা ধা না [পা ধা]'));
  it('split with octaves and hold', () => expect(sp('.নর্সা প-া', 0, 0)).toBe('.না র্সা প-া [.না র্সা]'));
  it('split latin', () => expect(sp("S PD' N", 2, 2)).toBe("S P D' N [P D']"));
  it('split single-note refused', () => expect(sp('সা রা', 0, 0).startsWith('ERR')).toBe(true));
});

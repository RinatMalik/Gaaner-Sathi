// Undo for a song's notation, one list whatever changed the text (src/app/undo.ts).
import { describe, expect, it } from 'vitest';
import { firstDifference, TextUndo, UNDO_JOIN_MS, UNDO_MAX } from '../../src/app/undo';

describe('undo', () => {
  it('takes back each change in turn, to the text before it', () => {
    const u = new TextUndo();
    u.remember('a', 'b:0:0', 0);
    u.remember('a x', '', 10);
    u.remember('a x\n# ', '', 20);
    expect(u.undo()).toEqual({ text: 'a x\n# ', key: '' });
    expect(u.undo()).toEqual({ text: 'a x', key: '' });
    expect(u.undo()).toEqual({ text: 'a', key: 'b:0:0' });
    expect(u.undo()).toBeNull();
  });

  it('counts typing on in one place as one step, until a pause or another place', () => {
    const u = new TextUndo();
    u.remember('', 'b:0:0', 0);
    u.remember('স', 'b:0:0', 500);
    u.remember('সা', 'b:0:0', 500 + UNDO_JOIN_MS);
    u.remember('সা র', 'b:0:1', 6000);
    u.remember('সা রা', 'b:0:1', 6000 + UNDO_JOIN_MS + 1);
    expect(u.size).toBe(3);
    expect(u.undo()!.text).toBe('সা রা');
    expect(u.undo()!.text).toBe('সা র');
    expect(u.undo()!.text).toBe('');
  });

  it('never joins steps of their own, keeps the latest steps, and empties for another song', () => {
    const u = new TextUndo();
    u.remember('a', '', 0);
    u.remember('b', '', 1);
    expect(u.size).toBe(2);
    for (let i = 0; i < UNDO_MAX + 10; i++) u.remember('t' + i, '', i);
    expect(u.size).toBe(UNDO_MAX);
    expect(u.undo()!.text).toBe('t' + (UNDO_MAX + 9));
    u.clear();
    expect(u.undo()).toBeNull();
  });

  it('finds where two texts first differ', () => {
    expect(firstDifference('সা রা গা', 'সা রা মা')).toBe(6);
    expect(firstDifference('abc', 'abc')).toBe(3);
    expect(firstDifference('ab', 'abc')).toBe(2);
    expect(firstDifference('', 'x')).toBe(0);
  });
});

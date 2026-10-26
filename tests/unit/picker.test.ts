// Round forty (Rinat, 2026-10-26): the Lines to practise as a rewaz item's ("The whole song",
// or from one line to another); a round's break counted down in the rewaz bar; the song picker
// as a list that folds by My songs and Exercises, with a find box.
import { describe, expect, it } from 'vitest';
import { roundText } from '../../src/app/rewaz';
import { songPickHTML } from '../../src/app/songpick';
import { loadPrefs, STORE_KEYS } from '../../src/app/store';
import { linesPicked } from '../../src/app/view';
import { wholeIfAll, type RoutineItem } from '../../src/core/practice/routine';

describe('the Lines to practise', () => {
  it('are the whole song unless lines are picked, and the first to the last is the whole song', () => {
    expect(linesPicked(null, 0, 8)).toEqual({ from: 0, to: 7, whole: true });
    expect(linesPicked(0, 7, 8)).toEqual({ from: 0, to: 7, whole: true });
    expect(linesPicked(0, 6, 8)).toEqual({ from: 0, to: 6, whole: false });
    expect(linesPicked(2, 4, 8)).toEqual({ from: 2, to: 4, whole: false });
    // "to" is never before "from", and both stay in the song.
    expect(linesPicked(5, 1, 8)).toEqual({ from: 5, to: 5, whole: false });
    expect(linesPicked(12, 20, 8)).toEqual({ from: 7, to: 7, whole: false });
    expect(linesPicked(0, 0, 1).whole).toBe(true);
    expect(linesPicked(null, 0, 0)).toEqual({ from: 0, to: 0, whole: true });
  });

  it('of a rewaz item, from the first line to the last, are kept as the whole song', () => {
    const it1: RoutineItem = { song: 's', rounds: 2, from: 0, to: 7 };
    wholeIfAll(it1, 8);
    expect(it1).toEqual({ song: 's', rounds: 2 });
    const it2: RoutineItem = { song: 's', rounds: 2, from: 0, to: 6 };
    wholeIfAll(it2, 8);
    expect(it2).toEqual({ song: 's', rounds: 2, from: 0, to: 6 });
    const it3: RoutineItem = { song: 's', rounds: 2, from: 1, to: 7 };
    wholeIfAll(it3, 8);
    expect(it3.from).toBe(1);
  });
});

describe("a rewaz round's break", () => {
  it('is counted down in the bar, as the break between items is', () => {
    expect(roundText(0, 3)).toBe(' · round 1 of 3');
    expect(roundText(1, 3, 3)).toBe(' · round 2 of 3 starting in 3 s');
    // Its count-in: the round to come, no seconds.
    expect(roundText(1, 3, 0)).toBe(' · round 2 of 3');
    expect(roundText(5, 3)).toBe(' · round 3 of 3');
  });
});

describe('the song picker', () => {
  const own = [{ id: 'a', title: 'আমার সোনার বাংলা' }, { id: 'b', title: 'Purano <sei> din' }];
  const ex = [{ id: 'x', title: 'Sa Re Ga Ma' }, { id: 'y', title: 'Alankar' }, { id: 'z', title: 'Long notes' }];
  const html = (o: Partial<Parameters<typeof songPickHTML>[2]> = {}) => songPickHTML(own, ex, { exFirst: false, folded: {}, current: 'b', find: '', ...o });

  it('lists My songs and the Exercises under headings that fold, with their counts, the open one marked', () => {
    const h = html();
    expect(h.indexOf('My songs')).toBeLessThan(h.indexOf('Exercises'));
    expect(h).toContain('data-g="mine" aria-expanded="true" aria-controls="sp-mine">');
    expect(h).toContain('My songs<span class="n">2</span>');
    expect(h).toContain('Exercises<span class="n">3</span>');
    expect(h.match(/class="spitem"/g)).toHaveLength(5);
    expect(h).toContain('data-id="b" aria-current="true"><span>Purano &lt;sei&gt; din</span><svg class="sptick"');
    expect(h.match(/aria-current/g)).toHaveLength(1);
    // The exercises first when the library shows them first.
    const f = html({ exFirst: true });
    expect(f.indexOf('Exercises')).toBeLessThan(f.indexOf('My songs'));
  });

  it('keeps a folded group to its heading', () => {
    const h = html({ folded: { ex: true } });
    expect(h).toContain('data-g="ex" aria-expanded="false" aria-controls="sp-ex">');
    expect(h).toContain('<ul class="splist" id="sp-ex" hidden>');
    expect(h).toContain('<ul class="splist" id="sp-mine">');
  });

  it('finds titles in every group, folded or not, and says when none has it', () => {
    const h = html({ folded: { ex: true, mine: true }, find: '  sa ' });
    expect(h.match(/class="spitem"/g)).toHaveLength(1);
    expect(h).toContain('data-id="x"');
    expect(h).not.toContain('My songs');
    expect(h).not.toContain('hidden');
    // A search's headings do not fold.
    expect(h).not.toContain('data-g=');
    expect(h).toContain('Exercises<span class="n">1</span>');
    expect(html({ find: 'সোনার' })).toContain('data-id="a"');
    expect(html({ find: 'ALANK' })).toContain('data-id="y"');
    expect(html({ find: 'qq<' })).toBe('<p class="spnone">No song or exercise has “qq&lt;” in its title.</p>');
  });

  it('says how to add a song when there are none', () => {
    expect(songPickHTML([], ex, { exFirst: false, folded: {}, current: 'x', find: '' })).toContain('<li class="spnone">No songs yet. Press + New</li>');
  });

  it('keeps its folds on the device', () => {
    const prefs = (o: object) => loadPrefs({ getItem: (k) => (k === STORE_KEYS.prefs ? JSON.stringify(o) : null), setItem() {}, removeItem() {} });
    expect(prefs({ pickFold: { ex: true } }).pickFold).toEqual({ ex: true });
    expect(prefs({ pickFold: { mine: true, ex: true } }).pickFold).toEqual({ mine: true, ex: true });
    expect(prefs({ pickFold: { ex: 1, other: true } }).pickFold).toBeUndefined();
    expect(prefs({ pickFold: 'ex' }).pickFold).toBeUndefined();
  });
});

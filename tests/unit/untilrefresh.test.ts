// Round sixty (Rinat, 2026-11-13): the top panel's Sa, tempo, taal and rhythm speed for every song
// until the page is refreshed, each with a way back to the song's own; how long each rewaz item
// takes; the Music library's Edit for the ticked; the Sa, taal and tempo in full screen's bar.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { durText, itemRowHTML, itemWhat, routineHTML, type ItemSong } from '../../src/app/rewaz';
import { bulkEditHTML, bulkPatch, libSelHTML, NO_EDIT, tagsOf, type LibSel } from '../../src/app/songs';
import { itemSeconds, itemTempo, routineSeconds, type Routine } from '../../src/core/practice/routine';
import { applyBulk } from '../../src/core/song/library';
import { normalize } from '../../src/core/song/model';

const song: ItemSong = { tempo: 60, lineBeats: [8, 8], cycle: 8, labels: ['1 · সা', '2 · রা'], title: 'Alpha' };

describe('how long a rewaz item takes', () => {
  it('its lines and rounds at its tempo', () => {
    expect(itemSeconds({ song: 'a', rounds: 2 }, song, false)).toBe(32);
    expect(itemSeconds({ song: 'a', rounds: 2, tempo: 120 }, song, false)).toBe(16);
    expect(itemSeconds({ song: 'a', rounds: 3, from: 1, to: 1 }, song, false)).toBe(24);
  });

  it('with the count-in, and the breaks between its rounds each with a count-in again', () => {
    expect(itemSeconds({ song: 'a', rounds: 2 }, song, true)).toBe(40);
    expect(itemSeconds({ song: 'a', rounds: 2, roundGap: 5 }, song, true)).toBe(32 + 16 + 5);
    expect(itemSeconds({ song: 'a', rounds: 2, roundGap: 5 }, song, false)).toBe(32 + 5);
  });

  it('at a tempo set at the top, which every item plays at, over its own', () => {
    expect(itemTempo({ song: 'a', rounds: 1, tempo: 90 }, song)).toBe(90);
    expect(itemTempo({ song: 'a', rounds: 1, tempo: 90 }, song, 120)).toBe(120);
    expect(itemTempo({ song: 'a', rounds: 1 }, song)).toBe(60);
    expect(itemSeconds({ song: 'a', rounds: 2, tempo: 30 }, song, false, 120)).toBe(16);
  });

  it('nothing for a song that is gone or has no notes', () => {
    expect(itemSeconds({ song: 'a', rounds: 2 }, null, true)).toBe(0);
    expect(itemSeconds({ song: 'a', rounds: 2 }, { ...song, lineBeats: [] }, true)).toBe(0);
  });

  it('a routine is its items and the breaks between them, at the top’s tempo where one is set', () => {
    const r: Routine = { id: 'r', name: 'R', updatedAt: 0, gap: 4, items: [{ song: 'a', rounds: 2 }, { song: 'a', rounds: 1, tempo: 120 }] };
    expect(routineSeconds(r, () => song, false)).toBe(32 + 4 + 8);
    expect(routineSeconds(r, () => song, false, 0, 120)).toBe(16 + 4 + 8);
    expect(routineSeconds(r, () => song, false, 1, 120)).toBe(8);
  });

  it('is said over the song’s title, and in the break before it the tempo it plays at', () => {
    expect(durText(160)).toBe(' · 2 min 40 s');
    expect(durText(0)).toBe('');
    const row = itemRowHTML({ song: 'a', rounds: 2 }, 0, song, [{ id: 'a', title: 'Alpha' }], [], false, false, 32);
    expect(row).toMatch(/<span>Song<span class="rwdur"[^>]*> · 32 s<\/span><\/span><select/);
    const r: Routine = { id: 'r', name: 'R', updatedAt: 0, items: [{ song: 'a', rounds: 2 }] };
    const html = routineHTML(r, 0, { saved: true, open: true, secs: 40, confirming: false, picking: null, openId: '', exFirst: false, countIn: true, tempo: 120 }, () => song, [{ id: 'a', title: 'Alpha' }], []);
    expect(html).toContain('> · 20 s</span>');
    expect(html).toContain('<p class="rwflat">Every item plays at tempo 120, set at the top. Tick Default under the tempo there for each item’s own.</p>');
    expect(routineHTML(r, 0, { saved: true, open: true, secs: 40, confirming: false, picking: null, openId: '', exFirst: false, countIn: true }, () => song, [{ id: 'a', title: 'Alpha' }], [])).not.toContain('rwflat');
    expect(itemWhat({ song: 'a', rounds: 2, tempo: 90 }, song)).toBe('The whole song · 2 rounds · tempo 90');
    expect(itemWhat({ song: 'a', rounds: 2, tempo: 90 }, song, 120)).toBe('The whole song · 2 rounds · tempo 120');
  });
});

describe('the top panel', () => {
  const deck = page.slice(page.indexOf('class="deck'), page.indexOf('id="fileBar"'));

  it('has Default under the tempo, ticked until the tempo is moved', () => {
    const col = deck.slice(deck.indexOf('class="vcol vtempo"'), deck.indexOf('class="dctl"', deck.indexOf('class="vcol vtempo"')));
    expect(col).toMatch(/id="tempoNum"[\s\S]*<input type="checkbox" id="tempoDef" checked> Default<\/label>/);
  });

  it('offers each song’s own first in the rhythm speed (the Sa’s and taal’s are drawn by the app)', () => {
    expect(deck).toMatch(/<select id="speedSel"[^>]*><option value="">Song’s own<\/option>/);
  });

  it('full screen’s bar has the Sa, a picker laid over it, the taal and the tempo', () => {
    const head = page.slice(page.indexOf('class="sheetHead"'), page.indexOf('id="fullBtn"'));
    expect(head).toContain('id="fullChips"');
    expect(head).toMatch(/<label class="fchip fsa" id="fullSaChip"[^>]*><span id="fullSaText"><\/span><select id="fullSa"/);
    expect(head).toContain('id="fullTaal"');
    expect(head).toContain('id="fullTempo"');
  });
});

describe('the Music library’s Edit', () => {
  const s = (o: object) => normalize({ id: 'x', title: 'X', tempo: 100, saKey: 1, saOct: 4, ...o });

  it('reads its choices: nothing chosen changes nothing', () => {
    expect(bulkPatch(NO_EDIT)).toBeNull();
    expect(bulkPatch({ ...NO_EDIT, tempo: '  ' })).toBeNull();
    expect(bulkPatch({ ...NO_EDIT, add: ' Learning,  Rabindrasangeet ,' })).toEqual({ addTags: ['Learning', 'Rabindrasangeet'] });
    expect(bulkPatch({ ...NO_EDIT, drop: ['Old'], sa: '48', tempo: '300', speed: 'half', list: 'exercise' })).toEqual({ dropTags: ['Old'], sa: { saKey: 0, saOct: 3 }, tempo: 240, speed: 'half', exercise: true });
    expect(bulkPatch({ ...NO_EDIT, list: 'song' })).toEqual({ exercise: false });
  });

  it('adds and takes off tags, whatever their case, and keeps the rest', () => {
    const a = s({ tags: ['Learning', 'Tagore'] });
    expect(applyBulk(a, { dropTags: ['learning'], addTags: ['Exam', 'TAGORE'] })!.tags).toEqual(['Tagore', 'Exam']);
    expect(applyBulk(a, { dropTags: ['Learning', 'Tagore'] })).not.toHaveProperty('tags');
  });

  it('sets the Sa, tempo, rhythm speed and where it is listed; null when it has them already', () => {
    const a = s({});
    const b = applyBulk(a, { sa: { saKey: 0, saOct: 3 }, tempo: 80, speed: 'double', exercise: true })!;
    expect([b.saKey, b.saOct, b.tempo, b.sound, b.exercise]).toEqual([0, 3, 80, { speed: 'double' }, true]);
    expect(applyBulk(b, { exercise: false })).not.toHaveProperty('exercise');
    expect(applyBulk(b, { sa: { saKey: 0, saOct: 3 }, tempo: 80 })).toBeNull();
    expect(applyBulk(a, {})).toBeNull();
    expect(a.tempo).toBe(100);
  });

  it('offers the tags the ticked have, each once', () => {
    expect(tagsOf([s({ tags: ['Tagore', 'Learning'] }), s({ tags: ['learning', 'Exam'] })])).toEqual(['Exam', 'Learning', 'Tagore']);
  });

  const sel: LibSel = { ticked: 3, hidden: 0, own: 2, kinds: 'song', allFav: false, shown: 5, shownTicked: 3, asking: false, menu: null };

  it('is in the bar for the user’s own ticked, folded until opened', () => {
    expect(libSelHTML(sel)).toContain('data-lsel="edit" aria-expanded="false" aria-controls="libEdit">Edit');
    expect(libSelHTML(sel)).not.toContain('id="libEdit"');
    expect(libSelHTML({ ...sel, own: 0 })).not.toContain('data-lsel="edit"');
    expect(libSelHTML({ ...sel, editing: NO_EDIT, tags: [] })).toContain('id="libEdit"');
  });

  it('says what it changes, and that the built-in exercises stay; Apply waits for a choice', () => {
    const html = bulkEditHTML(NO_EDIT, 2, 3, 'song', ['Tagore']);
    expect(html).toContain('Change 2 songs. The built-in exercises ticked stay as they are.');
    expect(html).toContain('<button type="button" class="btn primary" data-lsel="apply" disabled>Apply to 2 songs</button>');
    expect(html).toContain('data-ledrop="Tagore" aria-pressed="false"');
    expect(html.match(/<option value="" selected>Leave each as it is<\/option>/g)).toHaveLength(3);
    const picked = bulkEditHTML({ ...NO_EDIT, sa: '49', drop: ['Tagore'] }, 2, 2, 'song', ['Tagore']);
    expect(picked).not.toContain('stay as they are');
    expect(picked).toContain('<option value="49" selected>C♯3 · Black 1</option>');
    expect(picked).toContain('data-ledrop="Tagore" aria-pressed="true"');
    expect(picked).toContain('data-lsel="apply">Apply to 2 songs');
  });
});

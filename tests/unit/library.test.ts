import { describe, expect, it } from 'vitest';
import { countText, filterChipsHTML, songRowHTML, songsListHTML, type ListOptions } from '../../src/app/songs';
import { EXERCISES } from '../../src/core/exercises';
import { songFileText, songsFromFile } from '../../src/core/song/file';
import { entryFor, lyricForDisplay, lyricRows, matchesFilter, matchesQuery, sortEntries, tagCounts, titleFixes, titleKey, uniqueTitle, whenText, type LibrarySong } from '../../src/core/song/library';
import { cleanNotes, cleanTags, foldText, normalize, NOTES_CHARS, parseTags, TAG_LIMITS } from '../../src/core/song/model';

const SONAR = '# স্থায়ী\nআ মার সো নার | বাং লা -\n> আ মার সো নার | বাং লা ০\nসা রা গা মা\n> আ মি তো মায়\n';
const song = (id: string, title: string, extra: Partial<LibrarySong> = {}): LibrarySong =>
  ({ id, title, text: '', taal: 'dadra', tempo: 100, saKey: 0, updatedAt: 0, ...extra });

describe('tags and favourites on a song', () => {
  it('are kept tidy: trimmed, single-spaced, no commas, no case duplicates, limited', () => {
    expect(cleanTags(['  Rabindra  sangeet ', 'rabindra SANGEET', 'Learning', 5, '', ' , ', 'a,b'])).toEqual(['Rabindra sangeet', 'Learning', 'a b']);
    expect(cleanTags('Learning')).toEqual([]);
    expect(cleanTags(Array.from({ length: 30 }, (_, i) => 'tag' + i))).toHaveLength(TAG_LIMITS.tags);
    expect(cleanTags(['x'.repeat(100)])[0]).toHaveLength(TAG_LIMITS.chars);
    expect(parseTags('রবীন্দ্রসঙ্গীত, Learning ,, learning')).toEqual(['রবীন্দ্রসঙ্গীত', 'Learning']);
  });

  it('normalize keeps them only when set, so the prototype’s songs read exactly as before', () => {
    expect(normalize({ id: 'a', title: 'A' })).not.toHaveProperty('tags');
    expect(normalize({ id: 'a', title: 'A' })).not.toHaveProperty('fav');
    expect(normalize({ id: 'a', tags: ['x', 'X'], fav: true })).toMatchObject({ tags: ['x'], fav: true });
    expect(normalize({ id: 'a', tags: 'x', fav: 'yes' })).not.toHaveProperty('fav');
  });

  it('travel in song files and come back on import', () => {
    const s = normalize({ id: 'a', title: 'গান', text: 'সা', tags: ['Rabindrasangeet', 'Learning'], fav: true });
    const plain = normalize({ id: 'b', title: 'Plain', text: 'S' });
    const text = songFileText([s, plain], '2026-10-10');
    expect(JSON.parse(text).songs[1]).toEqual({ title: 'Plain', taal: 'dadra', tempo: 100, saKey: 0, saOct: 4, startOn: 1, text: 'S' });
    const back = songsFromFile(text, 'backup.json').map((x, i) => normalize({ ...x, id: ['a', 'b'][i]! }));
    expect(back).toEqual([s, plain]);
  });

  it('fold text the same however it was typed', () => {
    // য় as one code point and as য + nukta; a zero-width joiner; capitals.
    expect(foldText('য়')).toBe(foldText('য়'));
    expect(foldText('রা‍গ')).toBe('রাগ');
    expect(foldText('Rabindra')).toBe('rabindra');
  });
});

describe('a song’s notes', () => {
  it('are kept as written, cut to the limit, and left out when there is nothing but space', () => {
    expect(cleanNotes('  Gitabitan, Puja 12\nMeaning: …  ')).toBe('  Gitabitan, Puja 12\nMeaning: …  ');
    for (const v of ['', '  \n\t ', 5, null, undefined, ['x']]) expect(cleanNotes(v)).toBeUndefined();
    expect(cleanNotes('ক'.repeat(NOTES_CHARS + 50))).toHaveLength(NOTES_CHARS);
    expect(normalize({ id: 'a', title: 'A' })).not.toHaveProperty('notes');
    expect(normalize({ id: 'a', notes: '   ' })).not.toHaveProperty('notes');
    expect(normalize({ id: 'a', notes: 'Swarabitan 5' }).notes).toBe('Swarabitan 5');
  });

  it('travel in song files, come back on import, and are found by search', () => {
    const s = normalize({ id: 'a', title: 'গান', text: 'সা', notes: 'Source: Gitabitan\nআমার গুরুর কথা' });
    const text = songFileText([s], '2026-10-11');
    expect(JSON.parse(text).songs[0].notes).toBe('Source: Gitabitan\nআমার গুরুর কথা');
    expect(normalize({ ...songsFromFile(text, 'x.json')[0]!, id: 'a' })).toEqual(s);
    const e = entryFor(song('a', 'X', { notes: s.notes }));
    expect(matchesQuery(e, 'gitabitan')).toBe(true);
    expect(matchesQuery(e, 'গুরুর')).toBe(true);
    expect(matchesQuery(entryFor(song('b', 'X')), 'gitabitan')).toBe(false);
  });
});

describe('library search', () => {
  it('reads the lyric rows and shows the first one without bars or held vowels', () => {
    expect(lyricRows(SONAR)).toEqual(['আ মার সো নার | বাং লা ০', 'আ মি তো মায়']);
    expect(lyricForDisplay('আ মার সো নার | বাং লা ০')).toBe('আ মার সো নার বাং লা');
    expect(entryFor(song('a', 'X', { text: SONAR })).lyric).toBe('আ মার সো নার বাং লা');
    expect(entryFor(song('a', 'X', { text: '> ০ - |\n> তুমি' })).lyric).toBe('তুমি');
  });

  it('finds words in titles, tags, lyrics and the taal name, as written or run together', () => {
    const e = entryFor(song('a', 'Amar Sonar Bangla', { text: SONAR, tags: ['Rabindrasangeet'], taal: 'keherwa' }));
    for (const q of ['sonar', 'SONAR bangla', 'সোনার', 'আমার সোনার', 'আমি', 'rabindra', 'keherwa', 'কাহারবা', '', '  ']) expect(matchesQuery(e, q)).toBe(true);
    for (const q of ['tagore', 'সোনার তরী', 'dadra']) expect(matchesQuery(e, q)).toBe(false);
  });

  it('filters by favourites, exercises and tags (any case)', () => {
    const fav = entryFor(song('a', 'A', { fav: true, tags: ['Learning'] }));
    const ex = entryFor(song('ex', 'E', { example: true }));
    expect([fav, ex].filter((e) => matchesFilter(e, { kind: 'fav' })).map((e) => e.song.id)).toEqual(['a']);
    expect([fav, ex].filter((e) => matchesFilter(e, { kind: 'ex' })).map((e) => e.song.id)).toEqual(['ex']);
    expect([fav, ex].filter((e) => matchesFilter(e, { kind: 'tag', tag: 'LEARNING' })).map((e) => e.song.id)).toEqual(['a']);
    expect([fav, ex].filter((e) => matchesFilter(e, { kind: 'all' }))).toHaveLength(2);
  });

  it('sorts by practice (never practised last, newest change first), by change, or by title', () => {
    const list = [song('a', 'Beta', { updatedAt: 3 }), song('b', 'alpha', { updatedAt: 9 }), song('c', 'Gamma', { updatedAt: 5 }), song('d', 'delta', { updatedAt: 1 })].map(entryFor);
    const at: Record<string, number> = { c: 100, d: 200 };
    const ids = (by: 'practised' | 'changed' | 'title') => sortEntries(list, by, (id) => at[id] ?? 0).map((e) => e.song.id);
    expect(ids('practised')).toEqual(['d', 'c', 'b', 'a']);
    expect(ids('changed')).toEqual(['b', 'c', 'a', 'd']);
    expect(ids('title')).toEqual(['b', 'a', 'd', 'c']);
  });

  it('counts tags across songs, most used first, merging case', () => {
    expect(tagCounts([{ tags: ['Learning', 'Rabindrasangeet'] }, { tags: ['learning'] }, {}, { tags: ['Nazrulgeeti'] }])).toEqual([
      { tag: 'Learning', n: 2 }, { tag: 'Nazrulgeeti', n: 1 }, { tag: 'Rabindrasangeet', n: 1 },
    ]);
  });

  it('says when, in local calendar days', () => {
    const now = new Date(2026, 9, 10, 9, 0).getTime();
    expect(whenText(new Date(2026, 9, 10, 0, 5).getTime(), now)).toBe('today');
    expect(whenText(new Date(2026, 9, 9, 23, 55).getTime(), now)).toBe('yesterday');
    expect(whenText(new Date(2026, 9, 5, 12).getTime(), now)).toBe('5 days ago');
    expect(whenText(new Date(2026, 9, 2, 12).getTime(), now)).toBe('2 Oct');
    expect(whenText(new Date(2025, 11, 31, 12).getTime(), now)).toBe('31 Dec 2025');
  });
});

describe('the Music library', () => {
  const now = new Date(2026, 9, 10, 9, 0).getTime();
  const own = [
    song('s1', 'Amar Sonar Bangla', { text: SONAR, tags: ['Rabindrasangeet'], fav: true, updatedAt: 5 }),
    song('s2', 'Purano <sei> din', { tags: ['Rabindrasangeet', 'Learning'], updatedAt: 9 }),
  ];
  const opts = (o: Partial<ListOptions> = {}): ListOptions =>
    ({ query: '', filter: { kind: 'all' }, sort: 'practised', currentId: 's2', practisedAt: (id) => (id === 's1' ? now - 3_600_000 : 0), now, ...o });

  it('lists the exercises in their own order, then my songs; or in the order dragged', () => {
    const r = songsListHTML(own, EXERCISES, opts());
    expect(r.shown).toBe(2 + EXERCISES.length);
    const ids = (html: string) => Array.from(html.matchAll(/data-edit="([^"]+)"/g), (m) => m[1]);
    expect(ids(r.html)).toEqual([...EXERCISES.map((e) => e.id), 's1', 's2']);
    expect(r.html.indexOf('Exercises')).toBeLessThan(r.html.indexOf('My songs'));
    const mineFirst = songsListHTML(own, EXERCISES, opts({ order: ['mine', 'ex'] })).html;
    expect(ids(mineFirst)).toEqual(['s1', 's2', ...EXERCISES.map((e) => e.id)]);
    expect(mineFirst).toMatch(/^<section class="lsec" data-sec="mine">/);
  });

  it('gives each heading a handle to drag it by, or move it with the arrow keys', () => {
    const html = songsListHTML(own, EXERCISES, opts()).html;
    expect(html).toMatch(/^<section class="lsec" data-sec="ex"><div class="lheadrow"><button type="button" class="lgrip" data-grip="ex" aria-label="Move Exercises: drag, or press the up or down arrow" title="Drag to move this section"><svg/);
    expect(html).toContain('data-grip="mine" aria-label="Move My songs: drag, or press the up or down arrow"');
  });

  it('ends each row with its buttons: practise it, edit it (named for a song or an exercise), and print it', () => {
    const row = songRowHTML(entryFor(own[0]!), opts());
    expect(row).toMatch(/<div class="lacts"><button type="button" class="lact lplay" data-open="s1"><svg[^]*?<span>Practise this song<\/span><\/button><button type="button" class="lact ledit" data-edit="s1"><svg[^]*?<span>Edit this song<\/span><\/button><button type="button" class="lact lprint" data-print="s1" aria-label="Print or save as PDF" title="Print or save as PDF"><svg[^]*?<\/svg><\/button><\/div><\/li>$/);
    // The star, the title and the tags come first, together.
    expect(row.indexOf('class="lmain"')).toBeLessThan(row.indexOf('data-fav'));
    expect(row.indexOf('class="ltags"')).toBeLessThan(row.indexOf('class="lacts"'));
    const ex = songRowHTML(entryFor(EXERCISES[0]!), opts());
    expect(ex).toContain('<span>Practise this exercise</span>');
    expect(ex).toContain('<span>Edit this exercise</span>');
    expect(ex).toContain('data-print="' + EXERCISES[0]!.id + '"');
  });

  it('lets one of the user’s songs be deleted from its row, asking first in the row; never a built-in exercise', () => {
    const row = songRowHTML(entryFor(own[0]!), opts());
    expect(row).toMatch(/data-print="s1"[^>]*><svg[^]*?<\/svg><\/button><button type="button" class="lact ldel" data-del="s1" aria-label="Delete this song" title="Delete this song"><svg/);
    expect(songRowHTML(entryFor(EXERCISES[0]!), opts())).not.toContain('data-del');
    const asking = songRowHTML(entryFor(own[0]!), { ...opts(), confirmDel: 's1' });
    expect(asking).toContain('<li class="lrow sure">');
    expect(asking).toContain('<div class="lacts lsure"><span class="lsuret">Delete this song?</span><button type="button" class="lact ldelyes" data-delyes="s1">Delete</button><button type="button" class="lact" data-delno="s1">Keep</button></div>');
    expect(asking).not.toContain('data-open="s1"><svg');
    // Only the row asked about.
    expect(songRowHTML(entryFor(own[1]!), { ...opts(), confirmDel: 's1' })).not.toContain('lsure');
  });

  it('gives each heading a + New button after its fold button: a song, or an exercise', () => {
    const html = songsListHTML(own, EXERCISES, opts()).html;
    expect(html).toMatch(/<div class="lheadrow"><button type="button" class="lgrip"[^]*?<\/button><h3 class="lhead"><button type="button" class="lfold" data-fold="mine"[^]*?<\/button><\/h3><button type="button" class="btn lnew" data-new="song">\+ New song<\/button><\/div>/);
    expect(html).toMatch(/<h3 class="lhead"><button type="button" class="lfold" data-fold="ex"[^]*?<\/button><\/h3><button type="button" class="btn lnew" data-new="exercise">\+ New exercise<\/button>/);
  });

  it('folds each section away by its heading, and shows every section while searching', () => {
    const open = songsListHTML(own, EXERCISES, opts()).html;
    expect(open).toContain('<button type="button" class="lfold" data-fold="mine" aria-expanded="true" aria-controls="lsec-mine">');
    expect(open).toContain('data-fold="ex" aria-expanded="true"');
    expect(open).toContain('My songs <span class="n">2</span>');
    expect(open).not.toMatch(/id="lsec-(mine|ex)" hidden/);
    const folded = songsListHTML(own, EXERCISES, opts({ folded: { ex: true } }));
    expect(folded.html).toContain('data-fold="ex" aria-expanded="false"');
    expect(folded.html).toContain('<div class="lsecbody" id="lsec-ex" hidden>');
    expect(folded.html).toContain('<div class="lsecbody" id="lsec-mine">');
    expect(folded.shown).toBe(2 + EXERCISES.length);
    // A search shows what matches in every section, with plain headings.
    const found = songsListHTML(own, EXERCISES, opts({ query: 'সা', folded: { mine: true, ex: true } })).html;
    expect(found).not.toContain('data-fold');
    expect(found).not.toContain(' hidden');
    expect(found).toContain('<h3 class="lhead"><span class="lfold">Exercises <span class="n">');
  });

  it('shows each song’s details, star, tags and whether it is open, escaped', () => {
    const row = songRowHTML(entryFor(own[1]!), opts());
    expect(row).toContain('class="lrow cur"');
    expect(row).toContain('Purano &lt;sei&gt; din');
    expect(row).toContain('Dadra · 100 per min · Sa C · not practised yet');
    expect(row).toContain('aria-pressed="false"');
    expect(row).toContain('data-tag="Learning"');
    const first = songRowHTML(entryFor(own[0]!), opts());
    expect(first).toContain('practised today');
    expect(first).toContain('★');
    expect(first).toContain('class="llyric">আ মার সো নার বাং লা<');
    // A first lyric that only repeats the title is left out.
    expect(songRowHTML(entryFor(song('t', 'আমার সোনার বাংলা', { text: SONAR })), opts())).not.toContain('llyric');
    // An exercise has no star to press.
    expect(songRowHTML(entryFor(EXERCISES[0]!), opts())).not.toContain('data-fav');
  });

  it('narrows to a search, a tag, favourites or the exercises, with a message when nothing matches', () => {
    expect(songsListHTML(own, EXERCISES, opts({ query: 'সোনার' })).shown).toBe(1);
    expect(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'tag', tag: 'learning' } })).shown).toBe(1);
    expect(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'fav' } })).shown).toBe(1);
    expect(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'ex' } })).shown).toBe(EXERCISES.length);
    const none = songsListHTML(own, EXERCISES, opts({ query: 'zzz <b>' }));
    expect(none.shown).toBe(0);
    expect(none.html).toContain('Nothing matches “zzz &lt;b&gt;”.');
  });

  it('invites a first song when there are none', () => {
    const r = songsListHTML([], EXERCISES, opts());
    expect(r.html).toContain('No songs of your own yet');
    expect(r.html).toContain('My songs <span class="n">0</span>');
    expect(r.shown).toBe(EXERCISES.length);
  });

  it('offers a chip per tag with counts, and favourites only once there are some', () => {
    const chips = filterChipsHTML(own, 13, { kind: 'tag', tag: 'rabindrasangeet' });
    expect(chips).toContain('All <span class="n">15</span>');
    expect(chips).toContain('★ Favourites <span class="n">1</span>');
    expect(chips).toContain('data-tag="Rabindrasangeet" aria-pressed="true">Rabindrasangeet <span class="n">2</span>');
    expect(filterChipsHTML([own[1]!], 13, { kind: 'all' })).not.toContain('Favourites');
    expect(countText(2, 13, 15)).toBe('2 songs and 13 exercises');
    expect(countText(1, 13, 3)).toBe('Showing 3 of 14');
  });
});

describe('your own exercises', () => {
  const now = new Date(2026, 9, 13, 9, 0).getTime();
  const own = [
    song('s1', 'Amar Sonar Bangla', { updatedAt: 5, tags: ['Learning'] }),
    song('x1', 'My sargam', { exercise: true, updatedAt: 9, fav: true, tags: ['Learning'] }),
    song('x2', 'Alankar in Rupak', { exercise: true, updatedAt: 7 }),
  ];
  const opts = (o: Partial<ListOptions> = {}): ListOptions =>
    ({ query: '', filter: { kind: 'all' }, sort: 'changed', currentId: '', practisedAt: () => 0, now, ...o });
  const ids = (html: string) => Array.from(html.matchAll(/data-edit="([^"]+)"/g), (m) => m[1]);

  it('are kept with the song, in storage and in song files, and only on the user’s own', () => {
    const s = normalize({ id: 'x', title: 'x', exercise: true });
    expect(s.exercise).toBe(true);
    expect(normalize({ id: 'x', title: 'x' })).not.toHaveProperty('exercise');
    expect(normalize({ id: 'x', title: 'x', exercise: 'yes' })).not.toHaveProperty('exercise');
    expect(normalize({ id: 'x', title: 'x', example: true, exercise: true })).not.toHaveProperty('exercise');
    const [back] = songsFromFile(songFileText([s, normalize({ id: 'y', title: 'y' })], '2026-10-13'), 'b.json');
    expect(normalize({ ...back!, id: 'new' }).exercise).toBe(true);
    // A built-in exercise exported and imported comes back as an exercise of your own.
    const [ex] = songsFromFile(songFileText([normalize({ ...EXERCISES[0]!, updatedAt: 1 })], '2026-10-13'), 'e.json');
    expect(ex!.exercise).toBe(true);
  });

  it('are listed under Exercises, newest first, before the built-in ones in their order', () => {
    const r = songsListHTML(own, EXERCISES, opts());
    expect(ids(r.html)).toEqual(['x1', 'x2', ...EXERCISES.map((e) => e.id), 's1']);
    expect(r.html.indexOf('data-edit="s1"')).toBeGreaterThan(r.html.indexOf('data-fold="mine"'));
    expect(r.html).toContain('My songs <span class="n">1</span>');
    expect(r.html).toContain('Exercises <span class="n">' + (EXERCISES.length + 2) + '</span>');
    // By title, the user's own by title, then the built-in ones in their own order.
    expect(ids(songsListHTML(own, EXERCISES, opts({ sort: 'title' })).html).slice(0, 2)).toEqual(['x2', 'x1']);
  });

  it('have a star, tags and the exercise wording, like any of your songs', () => {
    const row = songRowHTML(entryFor(own[1]!), opts());
    expect(row).toContain('data-fav="x1" aria-pressed="true"');
    expect(row).toContain('data-tag="Learning"');
    expect(row).toContain('<span>Practise this exercise</span>');
    expect(row).toContain('<span>Edit this exercise</span>');
  });

  it('count among the exercises; Songs shows only songs; favourites and tags reach them too', () => {
    const chips = filterChipsHTML(own, EXERCISES.length, { kind: 'mine' });
    expect(chips).toContain('All <span class="n">' + (3 + EXERCISES.length) + '</span>');
    expect(chips).toContain('data-filter="mine" aria-pressed="true">Songs <span class="n">1</span>');
    expect(chips).toContain('data-filter="ex" aria-pressed="false">Exercises <span class="n">' + (2 + EXERCISES.length) + '</span>');
    expect(chips.indexOf('data-filter="mine"')).toBeLessThan(chips.indexOf('data-filter="ex"'));
    expect(chips.indexOf('data-filter="ex"')).toBeLessThan(chips.indexOf('data-filter="fav"'));
    expect(ids(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'mine' } })).html)).toEqual(['s1']);
    expect(ids(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'ex' } })).html)).toEqual(['x1', 'x2', ...EXERCISES.map((e) => e.id)]);
    expect(ids(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'fav' } })).html)).toEqual(['x1']);
    expect(ids(songsListHTML(own, EXERCISES, opts({ filter: { kind: 'tag', tag: 'learning' } })).html)).toEqual(['x1', 's1']);
    expect(matchesFilter(entryFor(own[2]!), { kind: 'ex' })).toBe(true);
    expect(matchesFilter(entryFor(own[2]!), { kind: 'mine' })).toBe(false);
  });

  it('leave "My songs" inviting a first song when all your own are exercises', () => {
    const r = songsListHTML(own.slice(1), EXERCISES, opts());
    expect(r.html).toContain('No songs of your own yet');
    expect(r.html).toContain('My songs <span class="n">0</span>');
  });
});

describe('titles of their own', () => {
  it('compares titles without case, extra spaces or Unicode spelling', () => {
    expect(titleKey('  Amar   Sonar Bangla ')).toBe('amar sonar bangla');
    expect(titleKey('আমার সোনার বাংলা')).toBe(titleKey('আমার  সোনার বাংলা'));
  });

  it('keeps a title no one has, and numbers one already taken', () => {
    expect(uniqueTitle('Purano', ['Amar'])).toBe('Purano');
    expect(uniqueTitle('purano ', ['Purano'])).toBe('purano (2)');
    expect(uniqueTitle('Purano', ['Purano', 'Purano (2)'])).toBe('Purano (3)');
    expect(uniqueTitle('Purano (2)', ['Purano', 'Purano (2)'])).toBe('Purano (3)');
    expect(uniqueTitle('Untitled song', ['Untitled song'])).toBe('Untitled song (2)');
  });

  it('gives songs already sharing a title their own, the first made keeping it', () => {
    const at = (t: number) => 'song-' + t.toString(36) + '-abcde';
    const fixes = titleFixes([
      { id: at(3000), title: 'Purano', updatedAt: 1 },
      { id: at(1000), title: 'Purano', updatedAt: 9 },
      { id: at(2000), title: 'purano', updatedAt: 5 },
      { id: at(4000), title: 'Long notes', updatedAt: 1 },
      { id: at(5000), title: 'Amar', updatedAt: 1 },
    ], ['Long notes']);
    expect(Object.fromEntries(fixes)).toEqual({ [at(2000)]: 'purano (2)', [at(3000)]: 'Purano (3)', [at(4000)]: 'Long notes (2)' });
    expect(titleFixes([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], []).size).toBe(0);
  });
});

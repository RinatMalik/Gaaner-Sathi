import { describe, expect, it } from 'vitest';
import { countText, filterChipsHTML, songRowHTML, songsListHTML, type ListOptions } from '../../src/app/songs';
import { EXERCISES } from '../../src/core/exercises';
import { songFileText, songsFromFile } from '../../src/core/song/file';
import { entryFor, lyricForDisplay, lyricRows, matchesFilter, matchesQuery, sortEntries, tagCounts, whenText, type LibrarySong } from '../../src/core/song/library';
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

describe('the Songs view', () => {
  const now = new Date(2026, 9, 10, 9, 0).getTime();
  const own = [
    song('s1', 'Amar Sonar Bangla', { text: SONAR, tags: ['Rabindrasangeet'], fav: true, updatedAt: 5 }),
    song('s2', 'Purano <sei> din', { tags: ['Rabindrasangeet', 'Learning'], updatedAt: 9 }),
  ];
  const opts = (o: Partial<ListOptions> = {}): ListOptions =>
    ({ query: '', filter: { kind: 'all' }, sort: 'practised', currentId: 's2', practisedAt: (id) => (id === 's1' ? now - 3_600_000 : 0), now, ...o });

  it('lists my songs, then the exercises in their own order', () => {
    const r = songsListHTML(own, EXERCISES, opts());
    expect(r.shown).toBe(2 + EXERCISES.length);
    const ids = Array.from(r.html.matchAll(/data-open="([^"]+)"/g), (m) => m[1]);
    expect(ids).toEqual(['s1', 's2', ...EXERCISES.map((e) => e.id)]);
    expect(r.html.indexOf('My songs')).toBeLessThan(r.html.indexOf('Exercises'));
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

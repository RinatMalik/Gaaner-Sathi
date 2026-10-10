/**
 * The Songs view: the library of the user's songs and the exercises, with search, filters
 * and sorting (docs/ROADMAP.md → Song library). The HTML builders are pure and tested in
 * Node; `initSongs` wires them to the page.
 */
import { entryFor, matchesFilter, matchesQuery, sortEntries, tagCounts, whenText, type LibraryEntry, type LibraryFilter, type LibrarySong, type LibrarySort } from '../core/song/library';
import { foldText } from '../core/song/model';
import { TAALS } from '../core/taal/taals';
import { esc, KEYS } from './view';

export interface ListOptions {
  query: string;
  filter: LibraryFilter;
  sort: LibrarySort;
  currentId: string;
  /** When a song was last practised (ms), 0 if never. */
  practisedAt: (id: string) => number;
  now: number;
}

const tight = (s: string) => foldText(s).replace(/[\s|।॥‖০\-–—~]+/g, '');

/** One song: a favourite star (own songs only), the title with its first lyric and details
 * (opens it to practise), its tags (each one filters the list) and an Edit button. */
export function songRowHTML(e: LibraryEntry, o: ListOptions): string {
  const s = e.song;
  const at = o.practisedAt(s.id);
  const meta = [TAALS[s.taal]?.name ?? s.taal, s.tempo + ' per min', 'Sa ' + (KEYS[s.saKey]?.[0] ?? '?'), at ? 'practised ' + whenText(at, o.now) : 'not practised yet'].join(' · ');
  const star = s.example
    ? '<span class="lfav" aria-hidden="true"></span>'
    : '<button type="button" class="lfav" data-fav="' + esc(s.id) + '" aria-pressed="' + !!s.fav + '" aria-label="Favourite">' + (s.fav ? '★' : '☆') + '</button>';
  const tags = (s.tags || []).map((t) => '<button type="button" class="ltag" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('');
  return '<li class="lrow' + (s.id === o.currentId ? ' cur' : '') + '">' + star +
    '<button type="button" class="lopen" data-open="' + esc(s.id) + '"><span class="ltitle">' + esc(s.title) + '</span>' +
    (e.lyric && tight(e.lyric) !== tight(s.title) ? '<span class="llyric">' + esc(e.lyric) + '</span>' : '') +
    '<span class="lmeta">' + esc(meta) + '</span></button>' +
    (tags ? '<span class="ltags">' + tags + '</span>' : '') +
    '<button type="button" class="ibtn ledit" data-edit="' + esc(s.id) + '">Edit</button></li>';
}

/**
 * The list: "My songs" then "Exercises", each searched, filtered and sorted. Exercises
 * keep their built-in order unless sorted by practice.
 */
export function songsListHTML(own: readonly LibrarySong[], exercises: readonly LibrarySong[], o: ListOptions): { html: string; shown: number } {
  const pick = (list: readonly LibrarySong[], by: LibrarySort) =>
    sortEntries(list.map(entryFor).filter((e) => matchesFilter(e, o.filter) && matchesQuery(e, o.query)), by, o.practisedAt);
  const k = o.filter.kind;
  const mine = k === 'ex' ? [] : pick(own, o.sort);
  const ex = k === 'fav' || k === 'tag' ? [] : pick(exercises, o.sort === 'practised' ? 'practised' : 'changed');
  const section = (title: string, rows: LibraryEntry[]) =>
    '<h3 class="lhead">' + title + ' <span>' + rows.length + '</span></h3><ul class="llist">' + rows.map((e) => songRowHTML(e, o)).join('') + '</ul>';
  let html = '';
  if (k !== 'ex') {
    if (mine.length) html += section('My songs', mine);
    else if (!own.length && !o.query) html += '<p class="lempty">No songs of your own yet. Press <b>+ New song</b> to type one in from your diary, or <b>Import from file</b>.</p>';
  }
  if (ex.length) html += section('Exercises', ex);
  if (!mine.length && !ex.length && (own.length || k !== 'all' || o.query)) {
    html += '<p class="lempty">' + (o.query ? 'Nothing matches “' + esc(o.query.trim()) + '”' + (k === 'all' ? '' : ' here') + '.' : 'Nothing here yet.') + '</p>';
  }
  return { html, shown: mine.length + ex.length };
}

/** The filter chips: All, Favourites (once there are any), Exercises, then each tag. */
export function filterChipsHTML(own: readonly LibrarySong[], exCount: number, f: LibraryFilter): string {
  const chip = (label: string, n: number, attrs: string, on: boolean) =>
    '<button type="button" class="chip" ' + attrs + ' aria-pressed="' + on + '">' + label + ' <span class="n">' + n + '</span></button>';
  const favs = own.filter((s) => s.fav).length;
  let html = chip('All', own.length + exCount, 'data-filter="all"', f.kind === 'all');
  if (favs || f.kind === 'fav') html += chip('★ Favourites', favs, 'data-filter="fav"', f.kind === 'fav');
  html += chip('Exercises', exCount, 'data-filter="ex"', f.kind === 'ex');
  for (const t of tagCounts(own)) html += chip(esc(t.tag), t.n, 'data-filter="tag" data-tag="' + esc(t.tag) + '"', f.kind === 'tag' && foldText(f.tag) === foldText(t.tag));
  return html;
}

export const countText = (own: number, ex: number, shown: number): string =>
  shown === own + ex
    ? own + ' song' + (own === 1 ? '' : 's') + ' and ' + ex + ' exercises'
    : 'Showing ' + shown + ' of ' + (own + ex);

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface SongsHost {
  ownSongs(): readonly LibrarySong[];
  exercises: readonly LibrarySong[];
  currentId(): string;
  practisedAt(id: string): number;
  sort(): LibrarySort;
  setSort(s: LibrarySort): void;
  /** Open a song in the practice or edit view. */
  open(id: string, tab: 'practice' | 'edit'): void;
  setFav(id: string, fav: boolean): void;
}

export function initSongs(host: SongsHost): { render(): void } {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const query = $<HTMLInputElement>('#libQ');
  const sortSel = $<HTMLSelectElement>('#libSort');
  let filter: LibraryFilter = { kind: 'all' };

  function render(): void {
    if ($('#songs').hidden) return;
    const own = host.ownSongs();
    // A tag filter whose last song lost the tag falls back to everything.
    if (filter.kind === 'tag') {
      const t = foldText(filter.tag);
      if (!own.some((s) => (s.tags || []).some((x) => foldText(x) === t))) filter = { kind: 'all' };
    }
    if (filter.kind === 'fav' && !own.some((s) => s.fav)) filter = { kind: 'all' };
    const o: ListOptions = { query: query.value, filter, sort: host.sort(), currentId: host.currentId(), practisedAt: host.practisedAt, now: Date.now() };
    const r = songsListHTML(own, host.exercises, o);
    $('#libChips').innerHTML = filterChipsHTML(own, host.exercises.length, filter);
    $('#libList').innerHTML = r.html;
    $('#libCount').textContent = countText(own.length, host.exercises.length, r.shown);
    sortSel.value = host.sort();
  }

  query.addEventListener('input', render);
  sortSel.addEventListener('change', () => {
    const v = sortSel.value;
    host.setSort(v === 'changed' || v === 'title' ? v : 'practised');
    render();
  });
  $('#libChips').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-filter]');
    if (!b) return;
    const k = b.dataset.filter;
    filter = k === 'tag' ? { kind: 'tag', tag: b.dataset.tag || '' } : k === 'fav' ? { kind: 'fav' } : k === 'ex' ? { kind: 'ex' } : { kind: 'all' };
    render();
  });
  $('#libList').addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('button');
    if (!el) return;
    if (el.dataset.open) host.open(el.dataset.open, 'practice');
    else if (el.dataset.edit) host.open(el.dataset.edit, 'edit');
    else if (el.dataset.fav) host.setFav(el.dataset.fav, el.getAttribute('aria-pressed') !== 'true');
    else if (el.dataset.tag) {
      filter = { kind: 'tag', tag: el.dataset.tag };
      render();
    }
  });
  return { render };
}

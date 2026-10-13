/**
 * The Music library: the user's songs and the exercises, with search, filters and sorting
 * (docs/ROADMAP.md → Song library). The HTML builders are pure and tested in Node;
 * `initSongs` wires them to the page.
 */
import { entryFor, isExercise, matchesFilter, matchesQuery, sortEntries, tagCounts, whenText, type LibraryEntry, type LibraryFilter, type LibrarySong, type LibrarySort } from '../core/song/library';
import { foldText } from '../core/song/model';
import { TAALS } from '../core/taal/taals';
import { esc, KEYS } from './view';

/** The library's two sections. */
export type LibSection = 'mine' | 'ex';

export interface ListOptions {
  query: string;
  filter: LibraryFilter;
  sort: LibrarySort;
  currentId: string;
  /** When a song was last practised (ms), 0 if never. */
  practisedAt: (id: string) => number;
  now: number;
  /** The sections folded away (a search shows them all). */
  folded?: Partial<Record<LibSection, boolean>>;
}

const tight = (s: string) => foldText(s).replace(/[\s|।॥‖০\-–—~]+/g, '');

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const FOLD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** One song, laid out like a line in the beat boxes: a favourite star (own songs only), the
 * title with its first lyric and details (opens it to practise), its tags (each one filters
 * the list), and at its end two buttons the row's full height: practise it, edit it. */
export function songRowHTML(e: LibraryEntry, o: ListOptions): string {
  const s = e.song;
  const at = o.practisedAt(s.id);
  const what = isExercise(s) ? 'exercise' : 'song';
  const meta = [TAALS[s.taal]?.name ?? s.taal, s.tempo + ' per min', 'Sa ' + (KEYS[s.saKey]?.[0] ?? '?'), at ? 'practised ' + whenText(at, o.now) : 'not practised yet'].join(' · ');
  const star = s.example
    ? '<span class="lfav" aria-hidden="true"></span>'
    : '<button type="button" class="lfav" data-fav="' + esc(s.id) + '" aria-pressed="' + !!s.fav + '" aria-label="Favourite">' + (s.fav ? '★' : '☆') + '</button>';
  const tags = (s.tags || []).map((t) => '<button type="button" class="ltag" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('');
  return '<li class="lrow' + (s.id === o.currentId ? ' cur' : '') + '"><div class="lmain">' + star +
    '<button type="button" class="lopen" data-open="' + esc(s.id) + '"><span class="ltitle">' + esc(s.title) + '</span>' +
    (e.lyric && tight(e.lyric) !== tight(s.title) ? '<span class="llyric">' + esc(e.lyric) + '</span>' : '') +
    '<span class="lmeta">' + esc(meta) + '</span></button>' +
    (tags ? '<span class="ltags">' + tags + '</span>' : '') + '</div>' +
    '<div class="lacts"><button type="button" class="lact lplay" data-open="' + esc(s.id) + '">' + PLAY_ICON + '<span>Practise this ' + what + '</span></button>' +
    '<button type="button" class="lact ledit" data-edit="' + esc(s.id) + '">' + EDIT_ICON + '<span>Edit this ' + what + '</span></button></div></li>';
}

/**
 * The list: "My songs" then "Exercises" (the user's own, then the built-in ones), each
 * searched, filtered and sorted. Each heading is a row: tapped anywhere it folds its section
 * away (while nothing is searched for), and at its end a button makes a new song or
 * exercise. Built-in exercises keep their own order unless sorted by practice.
 */
export function songsListHTML(own: readonly LibrarySong[], exercises: readonly LibrarySong[], o: ListOptions): { html: string; shown: number } {
  const pick = (list: readonly LibrarySong[], by: LibrarySort) =>
    sortEntries(list.map(entryFor).filter((e) => matchesFilter(e, o.filter) && matchesQuery(e, o.query)), by, o.practisedAt);
  const k = o.filter.kind;
  const searching = !!o.query.trim();
  const songsOnly = own.filter((s) => !isExercise(s));
  const ownEx = own.filter(isExercise);
  const mine = k === 'ex' ? [] : pick(songsOnly, o.sort);
  const ex = k === 'mine'
    ? []
    : o.sort === 'title'
      ? [...pick(ownEx, 'title'), ...pick(exercises, 'changed')]
      : pick([...ownEx, ...exercises], o.sort === 'practised' ? 'practised' : 'changed');
  const section = (id: LibSection, title: string, n: number, body: string) => {
    const folded = !searching && !!o.folded?.[id];
    const label = title + ' <span class="n">' + n + '</span>';
    const head = searching
      ? '<h3 class="lhead"><span class="lfold">' + label + '</span></h3>'
      : '<h3 class="lhead"><button type="button" class="lfold" data-fold="' + id + '" aria-expanded="' + !folded + '" aria-controls="lsec-' + id + '">' + FOLD_ICON + label + '</button></h3>';
    const make = id === 'mine' ? '<button type="button" class="btn lnew" data-new="song">+ New song</button>' : '<button type="button" class="btn lnew" data-new="exercise">+ New exercise</button>';
    return '<section class="lsec"><div class="lheadrow">' + head + make + '</div><div id="lsec-' + id + '"' + (folded ? ' hidden' : '') + '>' + body + '</div></section>';
  };
  const rows = (list: LibraryEntry[]) => '<ul class="llist">' + list.map((e) => songRowHTML(e, o)).join('') + '</ul>';
  let html = '';
  if (k !== 'ex') {
    if (mine.length) html += section('mine', 'My songs', mine.length, rows(mine));
    else if (!songsOnly.length && !o.query) html += section('mine', 'My songs', 0, '<p class="lempty">No songs of your own yet. Press <b>+ New song</b> to type one in from your diary, or <b>Import from file</b>.</p>');
  }
  if (ex.length) html += section('ex', 'Exercises', ex.length, rows(ex));
  if (!mine.length && !ex.length && (songsOnly.length || k !== 'all' || o.query)) {
    html += '<p class="lempty">' + (o.query ? 'Nothing matches “' + esc(o.query.trim()) + '”' + (k === 'all' ? '' : ' here') + '.' : 'Nothing here yet.') + '</p>';
  }
  return { html, shown: mine.length + ex.length };
}

/** The filter chips: All, Songs, Exercises, Favourites (once there are any), then each tag.
 * `own` is all the user's songs, their own exercises among them; `builtIn`, how many
 * exercises come with the app. */
export function filterChipsHTML(own: readonly LibrarySong[], builtIn: number, f: LibraryFilter): string {
  const chip = (label: string, n: number, attrs: string, on: boolean) =>
    '<button type="button" class="chip" ' + attrs + ' aria-pressed="' + on + '">' + label + ' <span class="n">' + n + '</span></button>';
  const favs = own.filter((s) => s.fav).length;
  const ownEx = own.filter(isExercise).length;
  let html = chip('All', own.length + builtIn, 'data-filter="all"', f.kind === 'all');
  html += chip('Songs', own.length - ownEx, 'data-filter="mine"', f.kind === 'mine');
  html += chip('Exercises', ownEx + builtIn, 'data-filter="ex"', f.kind === 'ex');
  if (favs || f.kind === 'fav') html += chip('★ Favourites', favs, 'data-filter="fav"', f.kind === 'fav');
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
  /** The sections folded away, kept on the device. */
  folded(): Partial<Record<LibSection, boolean>>;
  setFolded(id: LibSection, folded: boolean): void;
  /** Start a new song, or a new exercise of the user's own, in the editor. */
  create(kind: 'song' | 'exercise'): void;
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
    const o: ListOptions = { query: query.value, filter, sort: host.sort(), currentId: host.currentId(), practisedAt: host.practisedAt, now: Date.now(), folded: host.folded() };
    const r = songsListHTML(own, host.exercises, o);
    $('#libChips').innerHTML = filterChipsHTML(own, host.exercises.length, filter);
    $('#libList').innerHTML = r.html;
    const ownEx = own.filter(isExercise).length;
    $('#libCount').textContent = countText(own.length - ownEx, ownEx + host.exercises.length, r.shown);
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
    filter = k === 'tag' ? { kind: 'tag', tag: b.dataset.tag || '' } : k === 'fav' ? { kind: 'fav' } : k === 'ex' ? { kind: 'ex' } : k === 'mine' ? { kind: 'mine' } : { kind: 'all' };
    render();
  });
  $('#libList').addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('button');
    if (!el) return;
    if (el.dataset.fold === 'mine' || el.dataset.fold === 'ex') {
      const id = el.dataset.fold;
      host.setFolded(id, el.getAttribute('aria-expanded') === 'true');
      render();
      $<HTMLButtonElement>('button[data-fold="' + id + '"]')?.focus();
    } else if (el.dataset.new === 'song' || el.dataset.new === 'exercise') host.create(el.dataset.new);
    else if (el.dataset.open) host.open(el.dataset.open, 'practice');
    else if (el.dataset.edit) host.open(el.dataset.edit, 'edit');
    else if (el.dataset.fav) host.setFav(el.dataset.fav, el.getAttribute('aria-pressed') !== 'true');
    else if (el.dataset.tag) {
      filter = { kind: 'tag', tag: el.dataset.tag };
      render();
    }
  });
  return { render };
}

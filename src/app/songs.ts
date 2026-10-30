/**
 * The Music library: the user's songs and the exercises, with search, filters and sorting
 * (docs/ROADMAP.md → Song library), as a table (Rinat, 2026-10-30: "add all the bells and
 * whistles of tables"): rows ticked by a tap anywhere along them, Shift for a run of them, a
 * section's or every row shown at once, and the ticked ones added to a rewaz, starred, exported
 * or deleted together. The HTML builders are pure and tested in Node; `initSongs` wires them to
 * the page.
 */
import { entryFor, isExercise, matchesFilter, matchesQuery, sortEntries, tagCounts, whenText, type LibraryEntry, type LibraryFilter, type LibrarySong, type LibrarySort } from '../core/song/library';
import { foldText } from '../core/song/model';
import { lengthText } from '../core/practice/log';
import { TAALS } from '../core/taal/taals';
import { foldSectionHTML, initSectionDrag } from './fold';
import { esc, KEYS, saKeyName, showMixed, tickHTML } from './view';

/** The library's two sections. */
export type LibSection = 'mine' | 'ex';
/** Their order until the user drags one: the exercises first (Rinat, 2026-10-14). */
export const LIB_ORDER: readonly LibSection[] = ['ex', 'mine'];

export interface ListOptions {
  query: string;
  filter: LibraryFilter;
  sort: LibrarySort;
  currentId: string;
  /** When a song was last practised (ms), 0 if never. */
  practisedAt: (id: string) => number;
  /** How long a song plays at its tempo, seconds (Rinat, 2026-10-20). */
  lengthOf?: (id: string) => number | null;
  now: number;
  /** The sections folded away (a search shows them all). */
  folded?: Partial<Record<LibSection, boolean>>;
  /** The sections' order; absent: LIB_ORDER. */
  order?: readonly LibSection[];
  /** The song whose Delete was pressed, asking to confirm in its row. */
  confirmDel?: string;
  /** The songs and exercises ticked. */
  selected?: ReadonlySet<string>;
}


const tight = (s: string) => foldText(s).replace(/[\s|।॥‖০\-–—~]+/g, '');

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const PRINT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5V10.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5V17H17M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** One song, laid out like a line in the beat boxes: a tick box, a favourite star (own songs
 * only), the title with its first lyric and details (a tap there ticks the row; only Practise
 * opens it, Rinat, 2026-10-30), its tags (each one filters the list), and at its end buttons the
 * row's full height: practise it, edit it, and (icons) print it or save it as a PDF and, for the
 * user's own, delete it (Rinat, 2026-10-15), which asks first in the row itself. */
export function songRowHTML(e: LibraryEntry, o: ListOptions): string {
  const s = e.song;
  const at = o.practisedAt(s.id);
  const what = isExercise(s) ? 'exercise' : 'song';
  const secs = o.lengthOf?.(s.id);
  const meta = [TAALS[s.taal]?.name ?? s.taal, s.tempo + ' per min', ...(secs ? [lengthText(secs)] : []), 'Sa ' + (s.saOct != null ? saKeyName(s.saKey, s.saOct) : KEYS[s.saKey]?.[0] ?? '?'), at ? 'practised ' + whenText(at, o.now) : 'not practised yet'].join(' · ');
  const star = s.example
    ? '<span class="lfav" aria-hidden="true"></span>'
    : '<button type="button" class="lfav" data-fav="' + esc(s.id) + '" aria-pressed="' + !!s.fav + '" aria-label="Favourite">' + (s.fav ? '★' : '☆') + '</button>';
  const tags = (s.tags || []).map((t) => '<button type="button" class="ltag" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('');
  const sure = !s.example && o.confirmDel === s.id;
  const ticked = !!o.selected?.has(s.id);
  const acts = sure
    ? '<div class="lacts lsure"><span class="lsuret">Delete this ' + what + '?</span>' +
      '<button type="button" class="lact ldelyes" data-delyes="' + esc(s.id) + '">Delete</button>' +
      '<button type="button" class="lact" data-delno="' + esc(s.id) + '">Keep</button></div>'
    : '<div class="lacts"><button type="button" class="lact lplay" data-open="' + esc(s.id) + '">' + PLAY_ICON + '<span>Practise this ' + what + '</span></button>' +
      '<button type="button" class="lact ledit" data-edit="' + esc(s.id) + '">' + EDIT_ICON + '<span>Edit this ' + what + '</span></button>' +
      '<button type="button" class="lact lprint" data-print="' + esc(s.id) + '" aria-label="Print or save as PDF" title="Print or save as PDF">' + PRINT_ICON + '</button>' +
      (s.example ? '' : '<button type="button" class="lact ldel" data-del="' + esc(s.id) + '" aria-label="Delete this ' + what + '" title="Delete this ' + what + '">' + DEL_ICON + '</button>') + '</div>';
  return '<li class="lrow ltk' + (s.id === o.currentId ? ' cur' : '') + (ticked ? ' sel' : '') + (sure ? ' sure' : '') + '" data-id="' + esc(s.id) + '">' +
    tickHTML('data-sel="' + esc(s.id) + '"', 'Tick ' + esc(s.title), ticked, false) + '<div class="lmain">' + star +
    '<div class="lopen"><span class="ltitle">' + esc(s.title) + '</span>' +
    (e.lyric && tight(e.lyric) !== tight(s.title) ? '<span class="llyric">' + esc(e.lyric) + '</span>' : '') +
    '<span class="lmeta">' + esc(meta) + '</span></div>' +
    (tags ? '<span class="ltags">' + tags + '</span>' : '') + '</div>' + acts + '</li>';
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
  // A tick box for every row of a section shown.
  const lead = (title: string, list: readonly LibraryEntry[]) => {
    const n = list.filter((e) => o.selected?.has(e.song.id)).length;
    return list.length ? tickHTML('data-selsec="1"', 'Tick every one in ' + title, n === list.length, n > 0) : '';
  };
  const section = (id: LibSection, title: string, n: number, body: string, list: readonly LibraryEntry[] = []) =>
    foldSectionHTML({
      id, prefix: 'lsec-', title, n, body, folded: !!o.folded?.[id], fixed: searching, lead: lead(title, list),
      action: id === 'mine' ? '<button type="button" class="btn lnew" data-new="song">+ New song</button>' : '<button type="button" class="btn lnew" data-new="exercise">+ New exercise</button>',
    });
  const rows = (list: LibraryEntry[]) => '<ul class="llist">' + list.map((e) => songRowHTML(e, o)).join('') + '</ul>';
  const parts: Partial<Record<LibSection, string>> = {};
  if (k !== 'ex') {
    if (mine.length) parts.mine = section('mine', 'My songs', mine.length, rows(mine), mine);
    else if (!songsOnly.length && !o.query) parts.mine = section('mine', 'My songs', 0, '<p class="lempty">No songs of your own yet. Press <b>+ New song</b> to type one in from your diary, or <b>Import from file</b>.</p>');
  }
  if (ex.length) parts.ex = section('ex', 'Exercises', ex.length, rows(ex), ex);
  let html = (o.order ?? LIB_ORDER).map((id) => parts[id] ?? '').join('');
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

/** What the bar over the list needs to know about the ticked ones. */
export interface LibSel {
  /** How many are ticked; of them, how many are not shown (searched or filtered out, or in a
   * section folded away), and how many are the user's own (the ones that can be deleted or
   * starred), and whether those are songs, exercises or both. */
  ticked: number;
  hidden: number;
  own: number;
  kinds: 'song' | 'exercise' | 'both';
  /** Every one of the user's own ticked is a favourite already. */
  allFav: boolean;
  /** How many rows are shown, and how many of those are ticked (for Tick all). */
  shown: number;
  shownTicked: number;
  /** Asking whether to delete the user's own ticked. */
  asking: boolean;
  /** Add to rewaz's list of routines, while it is open. */
  menu: readonly { id: string; name: string; n: number }[] | null;
}

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * The bar over the list: Tick all (every row shown), and once some are ticked how many (and how
 * many of them are out of sight), then what to do with them: add them to a rewaz routine (a list
 * of routines, or a new one), star them, export them to a song file, delete the user's own
 * (asked first, in the bar; the built-in exercises stay) or untick them.
 */
export function libSelHTML(o: LibSel): string {
  const all = '<label class="tkall"><input type="checkbox" data-selall="1"' + (o.shown && o.shownTicked === o.shown ? ' checked' : o.shownTicked ? ' data-mixed="1"' : '') + (o.shown ? '' : ' disabled') + '> Tick all</label>';
  if (!o.ticked) return '<div class="lselbar">' + all + '</div>';
  const b = (act: string, label: string, cls = '') => '<button type="button" class="btn' + cls + '" data-lsel="' + act + '">' + label + '</button>';
  const [one, many] = o.kinds === 'song' ? ['song', 'songs'] : o.kinds === 'exercise' ? ['exercise', 'exercises'] : ['one', 'songs and exercises'];
  const count = '<span class="tkseln">' + o.ticked + ' ticked</span>' + (o.hidden ? '<span class="lselhid">(' + o.hidden + ' not shown)</span>' : '');
  if (o.asking && o.own) {
    return '<div class="lselbar on">' + all + '<span class="spacer"></span>' + count +
      '<span class="tksure">Delete ' + (o.own === 1 ? 'this ' + one : 'these ' + o.own + ' ' + many) + '?' + (o.own < o.ticked ? ' The built-in exercises stay.' : '') + '</span>' +
      b('delyes', 'Delete', ' danger') + b('delno', 'Keep') + '</div>';
  }
  const menu = o.menu
    ? '<div class="dmenu" id="libRwMenu" role="group" aria-label="Add to a rewaz routine">' +
      o.menu.map((r) => '<button type="button" data-addto="' + esc(r.id) + '"><b>' + esc(r.name) + '</b><span>' + (r.n ? r.n + ' item' + (r.n === 1 ? '' : 's') : 'No items yet') + '</span></button>').join('') +
      '<button type="button" data-addto=""><b>A new routine</b><span>Named My rewaz; rename it in Rewaz</span></button></div>'
    : '';
  return '<div class="lselbar on">' + all + '<span class="spacer"></span>' + count +
    '<span class="dbk"><button type="button" class="btn bkbtn" data-lsel="rewaz" aria-expanded="' + !!o.menu + '" aria-controls="libRwMenu">Add to rewaz' + CHEVRON + '</button>' + menu + '</span>' +
    (o.own ? b(o.allFav ? 'unfav' : 'fav', o.allFav ? '☆ Unfavourite' : '★ Favourite') : '') +
    b('export', 'Export') +
    (o.own ? b('del', o.own === o.ticked ? (o.own === 1 ? 'Delete it' : 'Delete all ' + o.own) : 'Delete your ' + o.own, ' danger') : '') +
    b('untick', 'Untick') + '</div>';
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
  /** How long a song plays at its tempo, seconds. */
  lengthOf?(id: string): number | null;
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
  /** Print a song, or save it as a PDF. */
  print(id: string): void;
  /** Delete one of the user's songs (asked first). */
  remove(id: string): void;
  /** The sections' order, kept on the device. */
  order(): readonly LibSection[];
  setOrder(o: LibSection[]): void;
  /** Ticked together: delete the user's own (asked first), star or unstar them, export them to a
   * song file (in the order listed). */
  removeAll(ids: readonly string[]): void;
  setFavs(ids: readonly string[], fav: boolean): void;
  exportAll(ids: readonly string[]): void;
  /** The rewaz routines to add them to, and adding them, in the order listed, to one ('' for a
   * new routine). */
  routines(): { id: string; name: string; n: number }[];
  addTo(routine: string, ids: readonly string[]): void;
}

export function initSongs(host: SongsHost): { render(): void } {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const query = $<HTMLInputElement>('#libQ');
  const sortSel = $<HTMLSelectElement>('#libSort');
  const list = $('#libList');
  const bar = $('#libSel');
  let filter: LibraryFilter = { kind: 'all' };
  /** The song whose Delete was pressed, asking to confirm. */
  let confirmDel = '';
  /** The songs and exercises ticked, kept while searching and filtering; the last one ticked or
   * unticked, where Shift ticks a run from; asking to delete the ticked; Add to rewaz open. */
  const selected = new Set<string>();
  let anchor = '';
  let asking = false;
  let menu = false;

  /** The rows shown (in sections not folded away), and every row drawn, in the order listed. */
  const shownIds = () => Array.from(list.querySelectorAll<HTMLElement>('.lsecbody:not([hidden]) .lrow[data-id]'), (r) => r.dataset.id!);
  const listed = () => Array.from(list.querySelectorAll<HTMLElement>('.lrow[data-id]'), (r) => r.dataset.id!);
  /** The ticked, in the order listed (those not drawn last). */
  function tickedInOrder(): string[] {
    const at = new Map(listed().map((id, i) => [id, i]));
    return Array.from(selected).sort((a, b) => (at.get(a) ?? 1e9) - (at.get(b) ?? 1e9));
  }

  function render(): void {
    if ($('#songs').hidden) return;
    const own = host.ownSongs();
    // Ticks on songs no longer here (deleted, perhaps in another tab) go.
    const here = new Set([...own.map((s) => s.id), ...host.exercises.map((s) => s.id)]);
    for (const id of Array.from(selected)) if (!here.has(id)) selected.delete(id);
    // A tag filter whose last song lost the tag falls back to everything.
    if (filter.kind === 'tag') {
      const t = foldText(filter.tag);
      if (!own.some((s) => (s.tags || []).some((x) => foldText(x) === t))) filter = { kind: 'all' };
    }
    if (filter.kind === 'fav' && !own.some((s) => s.fav)) filter = { kind: 'all' };
    const o: ListOptions = { query: query.value, filter, sort: host.sort(), currentId: host.currentId(), practisedAt: host.practisedAt, lengthOf: host.lengthOf, now: Date.now(), folded: host.folded(), order: host.order(), confirmDel, selected };
    const r = songsListHTML(own, host.exercises, o);
    $('#libChips').innerHTML = filterChipsHTML(own, host.exercises.length, filter);
    list.innerHTML = r.html;
    showMixed(list);
    const shown = shownIds();
    const mine = own.filter((s) => selected.has(s.id));
    const ex = mine.filter(isExercise).length;
    if (!mine.length) asking = false;
    if (!selected.size) menu = false;
    bar.innerHTML = libSelHTML({
      ticked: selected.size, hidden: Array.from(selected).filter((id) => !shown.includes(id)).length, own: mine.length,
      kinds: ex === 0 ? 'song' : ex === mine.length ? 'exercise' : 'both', allFav: mine.length > 0 && mine.every((s) => s.fav),
      shown: shown.length, shownTicked: shown.filter((id) => selected.has(id)).length, asking, menu: menu ? host.routines() : null,
    });
    showMixed(bar);
    bar.classList.toggle('lselon', selected.size > 0);
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
  /** Tick or untick a row; with Shift, every row shown from the last one ticked or unticked. */
  function tickRow(id: string, on: boolean, run: boolean): void {
    const shown = shownIds();
    const a = shown.indexOf(anchor);
    const b = shown.indexOf(id);
    const ids = run && a >= 0 && b >= 0 ? shown.slice(Math.min(a, b), Math.max(a, b) + 1) : [id];
    for (const x of ids) {
      if (on) selected.add(x);
      else selected.delete(x);
    }
    anchor = id;
    asking = false;
    render();
  }
  // Shift and a tap ticks a run of rows, without selecting their words.
  list.addEventListener('mousedown', (e) => {
    if (e.shiftKey && (e.target as Element).closest('.lrow[data-id]')) e.preventDefault();
  });
  list.addEventListener('click', (e) => {
    const t = e.target as Element;
    const box = t.closest<HTMLInputElement>('input[data-sel], input[data-selsec]');
    if (box) {
      const focused = document.activeElement === box;
      if (box.dataset.sel) tickRow(box.dataset.sel, box.checked, e.shiftKey);
      else {
        const sec = box.closest<HTMLElement>('.lsec')!.dataset.sec!;
        for (const r of Array.from(list.querySelectorAll<HTMLElement>('.lsec[data-sec="' + sec + '"] .lrow[data-id]'))) {
          if (box.checked) selected.add(r.dataset.id!);
          else selected.delete(r.dataset.id!);
        }
        asking = false;
        render();
      }
      if (focused) list.querySelector<HTMLElement>(box.dataset.sel ? 'input[data-sel="' + CSS.escape(box.dataset.sel) + '"]' : '.lsec[data-sec="' + box.closest<HTMLElement>('.lsec')?.dataset.sec + '"] input[data-selsec]')?.focus();
      return;
    }
    const el = t.closest<HTMLElement>('button');
    if (!el) {
      // A tap anywhere else along a row ticks it or unticks it (Rinat, 2026-10-30: "clicking the
      // line should just select it").
      const row = t.closest<HTMLElement>('.lrow[data-id]');
      if (row && !t.closest('label, a, input')) tickRow(row.dataset.id!, !selected.has(row.dataset.id!), e.shiftKey);
      return;
    }
    if (el.dataset.fold === 'mine' || el.dataset.fold === 'ex') {
      const id = el.dataset.fold;
      host.setFolded(id, el.getAttribute('aria-expanded') === 'true');
      render();
      $<HTMLButtonElement>('button[data-fold="' + id + '"]')?.focus();
    } else if (el.dataset.new === 'song' || el.dataset.new === 'exercise') host.create(el.dataset.new);
    else if (el.dataset.open) host.open(el.dataset.open, 'practice');
    else if (el.dataset.edit) host.open(el.dataset.edit, 'edit');
    else if (el.dataset.print) host.print(el.dataset.print);
    else if (el.dataset.del || el.dataset.delno) {
      // Ask in the row; Keep puts the row back, with the keyboard on its Delete again.
      const id = el.dataset.del ?? el.dataset.delno!;
      confirmDel = el.dataset.del ? id : '';
      render();
      $<HTMLButtonElement>(el.dataset.del ? 'button[data-delno="' + CSS.escape(id) + '"]' : 'button[data-del="' + CSS.escape(id) + '"]')?.focus();
    } else if (el.dataset.delyes) {
      confirmDel = '';
      host.remove(el.dataset.delyes);
      render();
    }
    else if (el.dataset.fav) host.setFav(el.dataset.fav, el.getAttribute('aria-pressed') !== 'true');
    else if (el.dataset.tag) {
      filter = { kind: 'tag', tag: el.dataset.tag };
      render();
    }
  });
  // Moving a section: drag its handle (mouse or touch), or ↑ ↓ on it (fold.ts).
  initSectionDrag(list, { order: host.order, move: (next) => host.setOrder(next as LibSection[]) });

  // The bar over the list: Tick all and what to do with the ticked ones.
  const refocusBar = (sel: string) => bar.querySelector<HTMLElement>(sel)?.focus();
  bar.addEventListener('click', (e) => {
    const t = e.target as Element;
    const all = t.closest<HTMLInputElement>('input[data-selall]');
    if (all) {
      for (const id of shownIds()) {
        if (all.checked) selected.add(id);
        else selected.delete(id);
      }
      asking = false;
      render();
      refocusBar('input[data-selall]');
      return;
    }
    const b = t.closest<HTMLElement>('button');
    if (!b) return;
    const ids = tickedInOrder();
    const own = new Set(host.ownSongs().map((s) => s.id));
    const mine = ids.filter((id) => own.has(id));
    if (b.dataset.addto != null) {
      host.addTo(b.dataset.addto, ids);
      menu = false;
      render();
      refocusBar('[data-lsel="rewaz"]');
      return;
    }
    const act = b.dataset.lsel;
    if (act === 'rewaz') {
      menu = !menu;
      render();
      refocusBar(menu ? '#libRwMenu button' : '[data-lsel="rewaz"]');
    } else if (act === 'fav' || act === 'unfav') {
      host.setFavs(mine, act === 'fav');
      refocusBar('[data-lsel="' + (act === 'fav' ? 'unfav' : 'fav') + '"]');
    } else if (act === 'export') host.exportAll(ids);
    else if (act === 'del' || act === 'delno') {
      asking = act === 'del';
      menu = false;
      render();
      refocusBar(asking ? '[data-lsel="delno"]' : '[data-lsel="del"]');
    } else if (act === 'delyes') {
      asking = false;
      for (const id of mine) selected.delete(id);
      host.removeAll(mine);
      render();
      refocusBar('input[data-selall]');
    } else if (act === 'untick') {
      selected.clear();
      render();
      refocusBar('input[data-selall]');
    }
  });
  // Escape closes Add to rewaz, then stops asking, then unticks everything.
  for (const el of [list, bar]) {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || (!menu && !asking && !selected.size)) return;
      e.preventDefault();
      if (menu) {
        menu = false;
        render();
        refocusBar('[data-lsel="rewaz"]');
        return;
      }
      const was = asking;
      if (was) asking = false;
      else selected.clear();
      render();
      refocusBar(was ? '[data-lsel="del"]' : 'input[data-selall]');
    });
  }
  // A tap outside the bar closes Add to rewaz (the bar's own taps redraw it).
  document.addEventListener('click', (e) => {
    if (!menu || e.composedPath().includes(bar)) return;
    menu = false;
    render();
  });

  return { render };
}

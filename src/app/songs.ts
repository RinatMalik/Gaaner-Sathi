/**
 * The Music library: the user's songs and the exercises, with search, filters and sorting
 * (docs/ROADMAP.md → Song library). The HTML builders are pure and tested in Node;
 * `initSongs` wires them to the page.
 */
import { entryFor, isExercise, matchesFilter, matchesQuery, sortEntries, tagCounts, whenText, type LibraryEntry, type LibraryFilter, type LibrarySong, type LibrarySort } from '../core/song/library';
import { foldText } from '../core/song/model';
import { lengthText } from '../core/practice/log';
import { TAALS } from '../core/taal/taals';
import { esc, KEYS } from './view';

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
}

const GRIP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g></svg>';

const tight = (s: string) => foldText(s).replace(/[\s|।॥‖০\-–—~]+/g, '');

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const PRINT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5V10.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5V17H17M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13M10.5 11v5.5M13.5 11v5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FOLD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** One song, laid out like a line in the beat boxes: a favourite star (own songs only), the
 * title with its first lyric and details (opens it to practise), its tags (each one filters
 * the list), and at its end buttons the row's full height: practise it, edit it, and (icons)
 * print it or save it as a PDF and, for the user's own, delete it (Rinat, 2026-10-15), which
 * asks first in the row itself. */
export function songRowHTML(e: LibraryEntry, o: ListOptions): string {
  const s = e.song;
  const at = o.practisedAt(s.id);
  const what = isExercise(s) ? 'exercise' : 'song';
  const secs = o.lengthOf?.(s.id);
  const meta = [TAALS[s.taal]?.name ?? s.taal, s.tempo + ' per min', ...(secs ? [lengthText(secs)] : []), 'Sa ' + (KEYS[s.saKey]?.[0] ?? '?'), at ? 'practised ' + whenText(at, o.now) : 'not practised yet'].join(' · ');
  const star = s.example
    ? '<span class="lfav" aria-hidden="true"></span>'
    : '<button type="button" class="lfav" data-fav="' + esc(s.id) + '" aria-pressed="' + !!s.fav + '" aria-label="Favourite">' + (s.fav ? '★' : '☆') + '</button>';
  const tags = (s.tags || []).map((t) => '<button type="button" class="ltag" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('');
  const sure = !s.example && o.confirmDel === s.id;
  const acts = sure
    ? '<div class="lacts lsure"><span class="lsuret">Delete this ' + what + '?</span>' +
      '<button type="button" class="lact ldelyes" data-delyes="' + esc(s.id) + '">Delete</button>' +
      '<button type="button" class="lact" data-delno="' + esc(s.id) + '">Keep</button></div>'
    : '<div class="lacts"><button type="button" class="lact lplay" data-open="' + esc(s.id) + '">' + PLAY_ICON + '<span>Practise this ' + what + '</span></button>' +
      '<button type="button" class="lact ledit" data-edit="' + esc(s.id) + '">' + EDIT_ICON + '<span>Edit this ' + what + '</span></button>' +
      '<button type="button" class="lact lprint" data-print="' + esc(s.id) + '" aria-label="Print or save as PDF" title="Print or save as PDF">' + PRINT_ICON + '</button>' +
      (s.example ? '' : '<button type="button" class="lact ldel" data-del="' + esc(s.id) + '" aria-label="Delete this ' + what + '" title="Delete this ' + what + '">' + DEL_ICON + '</button>') + '</div>';
  return '<li class="lrow' + (s.id === o.currentId ? ' cur' : '') + (sure ? ' sure' : '') + '"><div class="lmain">' + star +
    '<button type="button" class="lopen" data-open="' + esc(s.id) + '"><span class="ltitle">' + esc(s.title) + '</span>' +
    (e.lyric && tight(e.lyric) !== tight(s.title) ? '<span class="llyric">' + esc(e.lyric) + '</span>' : '') +
    '<span class="lmeta">' + esc(meta) + '</span></button>' +
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
  const section = (id: LibSection, title: string, n: number, body: string) => {
    const folded = !searching && !!o.folded?.[id];
    const label = title + ' <span class="n">' + n + '</span>';
    const head = searching
      ? '<h3 class="lhead"><span class="lfold">' + label + '</span></h3>'
      : '<h3 class="lhead"><button type="button" class="lfold" data-fold="' + id + '" aria-expanded="' + !folded + '" aria-controls="lsec-' + id + '">' + FOLD_ICON + label + '</button></h3>';
    const make = id === 'mine' ? '<button type="button" class="btn lnew" data-new="song">+ New song</button>' : '<button type="button" class="btn lnew" data-new="exercise">+ New exercise</button>';
    const grip = '<button type="button" class="lgrip" data-grip="' + id + '" aria-label="Move ' + title + ': drag, or press the up or down arrow" title="Drag to move this section">' + GRIP_ICON + '</button>';
    return '<section class="lsec" data-sec="' + id + '"><div class="lheadrow">' + grip + head + make + '</div><div id="lsec-' + id + '"' + (folded ? ' hidden' : '') + '>' + body + '</div></section>';
  };
  const rows = (list: LibraryEntry[]) => '<ul class="llist">' + list.map((e) => songRowHTML(e, o)).join('') + '</ul>';
  const parts: Partial<Record<LibSection, string>> = {};
  if (k !== 'ex') {
    if (mine.length) parts.mine = section('mine', 'My songs', mine.length, rows(mine));
    else if (!songsOnly.length && !o.query) parts.mine = section('mine', 'My songs', 0, '<p class="lempty">No songs of your own yet. Press <b>+ New song</b> to type one in from your diary, or <b>Import from file</b>.</p>');
  }
  if (ex.length) parts.ex = section('ex', 'Exercises', ex.length, rows(ex));
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
}

export function initSongs(host: SongsHost): { render(): void } {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const query = $<HTMLInputElement>('#libQ');
  const sortSel = $<HTMLSelectElement>('#libSort');
  let filter: LibraryFilter = { kind: 'all' };
  /** The song whose Delete was pressed, asking to confirm. */
  let confirmDel = '';

  function render(): void {
    if ($('#songs').hidden) return;
    const own = host.ownSongs();
    // A tag filter whose last song lost the tag falls back to everything.
    if (filter.kind === 'tag') {
      const t = foldText(filter.tag);
      if (!own.some((s) => (s.tags || []).some((x) => foldText(x) === t))) filter = { kind: 'all' };
    }
    if (filter.kind === 'fav' && !own.some((s) => s.fav)) filter = { kind: 'all' };
    const o: ListOptions = { query: query.value, filter, sort: host.sort(), currentId: host.currentId(), practisedAt: host.practisedAt, lengthOf: host.lengthOf, now: Date.now(), folded: host.folded(), order: host.order(), confirmDel };
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
  // ── Moving a section: drag its handle (mouse or touch), or ↑ ↓ on it ──────────
  const list = $('#libList');
  const sectionsShown = () => Array.from(list.querySelectorAll<HTMLElement>('.lsec'));
  /** Put `id` at `at` among the sections shown; the stored order keeps any not shown. */
  function moveTo(id: LibSection, at: number): void {
    const shown = sectionsShown().map((s) => s.dataset.sec as LibSection).filter((s) => s !== id);
    shown.splice(Math.max(0, Math.min(shown.length, at)), 0, id);
    const rest = host.order().filter((s) => !shown.includes(s));
    const next = [...shown, ...rest];
    if (next.join() !== host.order().join()) host.setOrder(next);
    render();
    list.querySelector<HTMLElement>('[data-grip="' + id + '"]')?.focus();
  }
  let drag: { id: LibSection; pointer: number; y0: number; grab: number; on: boolean; at: number } | null = null;
  let dropLine: HTMLElement | null = null;
  function endDrag(): void {
    list.classList.remove('sorting');
    list.style.minHeight = '';
    for (const s of sectionsShown()) {
      s.classList.remove('dragging');
      s.style.transform = '';
    }
    dropLine?.remove();
    dropLine = null;
    drag = null;
  }
  list.addEventListener('pointerdown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('[data-grip]');
    if (!g || e.button !== 0) return;
    e.preventDefault();
    g.setPointerCapture(e.pointerId);
    const head = g.closest<HTMLElement>('.lheadrow')!;
    drag = { id: g.dataset.grip as LibSection, pointer: e.pointerId, y0: e.clientY, grab: e.clientY - head.getBoundingClientRect().top, on: false, at: -1 };
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.on) {
      if (Math.abs(e.clientY - drag.y0) < 5) return;
      // While moving, the sections show only their headings, so a long one is easy to move;
      // the list keeps its height, so the page does not scroll from under the pointer.
      drag.on = true;
      list.style.minHeight = list.offsetHeight + 'px';
      list.classList.add('sorting');
      sectionsShown().find((s) => s.dataset.sec === drag!.id)?.classList.add('dragging');
      dropLine = document.createElement('div');
      dropLine.className = 'ldrop';
      list.appendChild(dropLine);
    }
    const secs = sectionsShown();
    const me = secs.find((s) => s.dataset.sec === drag!.id);
    if (!me) return;
    me.style.transform = '';
    const top = me.getBoundingClientRect().top;
    me.style.transform = 'translateY(' + (e.clientY - drag.grab - top) + 'px)';
    // Where it would go: before the first other section whose middle is below the pointer.
    const others = secs.filter((s) => s !== me);
    let at = others.findIndex((s) => {
      const r = s.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (at < 0) at = others.length;
    drag.at = at;
    const box = list.getBoundingClientRect();
    const ref = others[at];
    const y = ref ? ref.getBoundingClientRect().top - 6 : (others.at(-1)?.getBoundingClientRect().bottom ?? box.top) + 6;
    dropLine!.style.top = y - box.top + 'px';
  });
  list.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const { id, on, at } = drag;
    endDrag();
    if (on && at >= 0) moveTo(id, at);
  });
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('[data-grip]');
    if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = g.dataset.grip as LibSection;
    const i = sectionsShown().findIndex((s) => s.dataset.sec === id);
    moveTo(id, i + (e.key === 'ArrowUp' ? -1 : 1));
  });

  return { render };
}

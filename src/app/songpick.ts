/**
 * The song picker at the top of the deck (Rinat, 2026-10-26: "is it possible to make it
 * collapsible by song and exercises? i found myself spending time looking for songs and the
 * list was too long"). A button with the open song's title opens a list of My songs and the
 * Exercises, in the Music library's order; each group folds away by its heading and stays
 * folded on the device; a find box shows only the titles holding what is typed. The arrow keys
 * move through the list, Escape or a tap anywhere else closes it, and typing a letter finds.
 * The HTML builder is pure and tested in Node.
 */
import { foldText } from '../core/song/model';
import { FOLD_ICON } from './fold';
import { esc } from './view';

export interface PickChoice {
  id: string;
  title: string;
}
/** The groups, named as the Music library's sections are. */
export type PickGroup = 'mine' | 'ex';
export type PickFolds = { mine?: true; ex?: true };

const TICK = '<svg class="sptick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * The list: My songs and Exercises (the exercises first when the library shows them first),
 * each under a heading that folds it, with how many it holds; the open song marked. While
 * `find` is typed, only the titles holding it show, in the groups holding one, none folded.
 */
export function songPickHTML(own: readonly PickChoice[], exercises: readonly PickChoice[], o: { exFirst: boolean; folded: PickFolds; current: string; find: string }): string {
  const want = foldText(o.find.trim());
  const item = (s: PickChoice) =>
    '<li><button type="button" class="spitem" data-id="' + esc(s.id) + '"' + (s.id === o.current ? ' aria-current="true"' : '') + '><span>' + esc(s.title) + '</span>' + (s.id === o.current ? TICK : '') + '</button></li>';
  const group = (id: PickGroup, title: string, list: readonly PickChoice[], empty: string) => {
    const shown = want ? list.filter((s) => foldText(s.title).includes(want)) : list;
    if (want && !shown.length) return '';
    const folded = !want && !!o.folded[id];
    const n = '<span class="n">' + shown.length + '</span>';
    const head = want
      ? '<h3 class="sph"><span class="spfold">' + title + n + '</span></h3>'
      : '<h3 class="sph"><button type="button" class="spfold" data-g="' + id + '" aria-expanded="' + !folded + '" aria-controls="sp-' + id + '">' + FOLD_ICON + title + n + '</button></h3>';
    return '<section class="spgrp">' + head + '<ul class="splist" id="sp-' + id + '"' + (folded ? ' hidden' : '') + '>' +
      (shown.length ? shown.map(item).join('') : '<li class="spnone">' + empty + '</li>') + '</ul></section>';
  };
  const mine = group('mine', 'My songs', own, 'No songs yet. Press + New');
  const ex = group('ex', 'Exercises', exercises, 'No exercises');
  return (o.exFirst ? ex + mine : mine + ex) || '<p class="spnone">No song or exercise has “' + esc(o.find.trim()) + '” in its title.</p>';
}

export interface SongPickHost {
  /** The songs and the exercises, and whether the exercises come first. */
  choices(): { own: readonly PickChoice[]; exercises: readonly PickChoice[]; exFirst: boolean };
  current(): { id: string; title: string };
  folded(): PickFolds;
  fold(g: PickGroup, folded: boolean): void;
  /** Open this song or exercise. */
  pick(id: string): void;
}

export interface SongPick {
  /** The button's title, and the list if it is open (after a song opens, is renamed or added). */
  render(): void;
}

export function initSongPick(host: SongPickHost): SongPick {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const wrap = $('#songPick');
  const btn = $('#songBtn');
  const pop = $('#songPop');
  const find = $<HTMLInputElement>('#songFind');
  const groups = $('#songGroups');

  const isOpen = () => !pop.hidden;
  function draw(): void {
    const { own, exercises, exFirst } = host.choices();
    groups.innerHTML = songPickHTML(own, exercises, { exFirst, folded: host.folded(), current: host.current().id, find: find.value });
  }
  function render(): void {
    $('#songName').textContent = host.current().title;
    if (isOpen()) draw();
  }
  function open(): void {
    find.value = '';
    draw();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    // The open song, or the first heading when its group is folded away.
    const at = groups.querySelector<HTMLElement>('.spitem[aria-current="true"]') ?? groups.querySelector<HTMLElement>('.spfold');
    at?.focus({ preventScroll: true });
    at?.scrollIntoView({ block: 'nearest' });
  }
  function close(focusBtn: boolean): void {
    if (!isOpen()) return;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focusBtn) btn.focus();
  }
  /** What the arrow keys move through: the find box, the headings and the titles showing. */
  const stops = () => [find, ...Array.from(groups.querySelectorAll<HTMLElement>('button.spfold, .splist:not([hidden]) .spitem'))];

  btn.addEventListener('click', () => (isOpen() ? close(false) : open()));
  btn.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen()) {
      e.preventDefault();
      open();
    }
  });
  groups.addEventListener('click', (e) => {
    const t = e.target as Element;
    const it = t.closest<HTMLElement>('.spitem');
    if (it) {
      close(true);
      if (it.dataset.id !== host.current().id) host.pick(it.dataset.id!);
      return;
    }
    const f = t.closest<HTMLElement>('button.spfold');
    if (f) {
      const g = f.dataset.g as PickGroup;
      host.fold(g, f.getAttribute('aria-expanded') === 'true');
      draw();
      groups.querySelector<HTMLElement>('button.spfold[data-g="' + g + '"]')?.focus();
    }
  });
  find.addEventListener('input', draw);
  find.addEventListener('keydown', (e) => {
    // Enter opens the first title found.
    if (e.key === 'Enter') {
      const first = groups.querySelector<HTMLElement>('.splist:not([hidden]) .spitem');
      if (first) {
        e.preventDefault();
        first.click();
      }
    }
  });
  pop.addEventListener('keydown', (e) => {
    const list = stops();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || ((e.key === 'Home' || e.key === 'End') && e.target !== find)) {
      e.preventDefault();
      const to = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : Math.min(list.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
      list[to]?.focus();
    } else if (e.target !== find && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // A letter typed on the list goes into the find box.
      find.focus();
    }
  });
  // Closed by a tap anywhere else, or the focus leaving it. (The path, not the target: a heading
  // tapped is drawn again, so by now it is no longer in the list.)
  document.addEventListener('click', (e) => {
    if (isOpen() && !e.composedPath().includes(wrap)) close(false);
  });
  wrap.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (isOpen() && to && !wrap.contains(to)) close(false);
  });

  return { render };
}

/**
 * The Rewaz view and its runner (docs/ROADMAP.md → Rewaz routine): routines of exercises
 * and songs, each item with its own lines, rounds, tempo and guide, played one after
 * another without touching the screen. Each item's practice goes into the log with the
 * routine's name. Every routine is a row that folds away, as the Music library's sections
 * do (Rinat, 2026-10-13); its items are ticked to remove several together and dragged to move
 * (Rinat, 2026-10-30). The HTML builders are pure and tested in Node.
 */
import { durationText } from '../core/practice/log';
import { gapOf, itemLines, moveItems, newRoutineId, ROUTINE_LIMITS, roundGapOf, routineSeconds, STARTER, stepAt, wholeIfAll, type ItemGuide, type Routine, type RoutineItem, type SongShape } from '../core/practice/routine';
import type { WriteResult } from './store';
import { foldText } from '../core/song/model';
import { isTaalId, TAALS } from '../core/taal/taals';
import { GRIP_ICON } from './fold';
import { esc, leftText, showMixed, tickHTML } from './view';

const svg = (body: string) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
const ICON = {
  fold: svg('<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  play: svg('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>'),
  del: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
};

/** A song as the item pickers show it. */
export interface Choice {
  id: string;
  title: string;
  /** Its tags and taal, written lightly beside its title in the picker and found by its search
   * (Rinat, 2026-10-30: "so they are easy to find"). */
  tags?: readonly string[];
  taal?: string;
}

/** A choice's tags, then its taal. */
const detailsOf = (c: Choice): string[] => [...(c.tags ?? []), ...(c.taal && isTaalId(c.taal) ? [TAALS[c.taal].name] : [])];

/** What an item needs to know about its song: lines, tempo, cycle, line labels, title. */
export type ItemSong = SongShape & { labels: readonly string[]; title: string };

const GUIDES: readonly [ItemGuide | '', string][] = [
  ['', 'As set at the top'],
  ['all', 'Every round'],
  ['first', 'First round only'],
  ['alt', 'Every other round'],
  ['off', 'Off: sing alone'],
];

function songOptions(own: readonly Choice[], exercises: readonly Choice[], selected: string, exFirst = false): string {
  const opt = (c: Choice) => '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.title) + '</option>';
  const mine = own.length ? '<optgroup label="My songs">' + own.map(opt).join('') + '</optgroup>' : '';
  const ex = '<optgroup label="Exercises">' + exercises.map(opt).join('') + '</optgroup>';
  return exFirst ? ex + mine : mine + ex;
}

/**
 * Choosing several songs and exercises to add to a routine at once (Rinat, 2026-10-14):
 * each a row ticked anywhere along it, numbered in the order ticked (the order they will
 * play), the open one marked, its tags and taal beside its title; grouped as in the Music library,
 * with a box to find one by any of them. The
 * box, Add and Cancel at its top, kept in view while the lists scroll with the page (Rinat,
 * 2026-10-23: lists scrolling inside their own boxes caught the mouse wheel).
 */
export function pickerHTML(own: readonly Choice[], exercises: readonly Choice[], exFirst: boolean, picked: readonly string[], openId: string): string {
  const row = (c: Choice) => {
    const n = picked.indexOf(c.id) + 1;
    const more = detailsOf(c);
    return '<li data-q="' + esc(foldText([c.title, ...more].join(' '))) + '"><label class="rwpickrow"><input type="checkbox" data-pick="' + esc(c.id) + '"' + (n ? ' checked' : '') + '>' +
      '<span class="rwpicktitle">' + esc(c.title) + '</span><span class="rwpickmeta">' + esc(more.join(' · ')) + '</span>' + (c.id === openId ? '<span class="rwpickopen">open now</span>' : '') +
      '<span class="rwpickn"' + (n ? '' : ' hidden') + '>' + (n || '') + '</span></label></li>';
  };
  const group = (title: string, list: readonly Choice[]) => (list.length ? '<div class="rwpickgrp"><h4>' + title + '</h4><ul class="rwpicklist">' + list.map(row).join('') + '</ul></div>' : '');
  const groups = exFirst ? group('Exercises', exercises) + group('My songs', own) : group('My songs', own) + group('Exercises', exercises);
  return '<div class="rwpick"><div class="rwpickhead"><span class="rwpicktip">Tick what to add, in the order it should play.</span>' +
    '<input type="search" class="rwpickq" data-act="pickq" placeholder="Find a song or exercise" aria-label="Find a song or exercise" autocomplete="off" spellcheck="false">' +
    pickedButton(picked.length) + '<button type="button" class="btn" data-act="pickcancel">Cancel</button></div>' + groups + '</div>';
}

/** The picker's Add button, for `n` ticked. */
export const pickedButton = (n: number): string =>
  '<button type="button" class="btn primary" data-act="addpicked"' + (n ? '' : ' disabled') + '>' + (n ? 'Add ' + n + ' to this routine' : 'Add to this routine') + '</button>';

/** One item, as a row like a line in the beat boxes: a tick box (Rinat, 2026-10-30: to remove
 * several together); its number, the handle to drag it by or move it with the arrow keys
 * (replacing buttons to move it up or down); its song, lines, rounds, the break between them
 * (Rinat, 2026-10-28: each item its own), tempo and guide, in the same columns in every row
 * (Rinat, 2026-10-30: "keep the title dropdown width a fixed amount"); and at its end a
 * full-height button to remove it (an icon). */
export function itemRowHTML(it: RoutineItem, i: number, song: ItemSong | null, own: readonly Choice[], exercises: readonly Choice[], exFirst = false, ticked = false): string {
  const k = (name: string) => 'data-i="' + i + '" data-k="' + name + '"';
  let html = '<li class="rwitem' + (ticked ? ' sel' : '') + '">' + tickHTML('data-tick="' + i + '"', 'Tick item ' + (i + 1), ticked, false) +
    '<button type="button" class="rwn" data-grip="' + i + '" aria-label="Item ' + (i + 1) + ': drag to move it, or press the up or down arrow" title="Drag to move">' + (i + 1) + GRIP_ICON + '</button><div class="rwfields">';
  if (!song) {
    html += '<span class="rwgone">This song has been deleted, so the rewaz skips it.</span>';
  } else {
    const [a, b] = itemLines(it, song.labels.length);
    const whole = it.from == null;
    const lineOpt = (n: number, sel: boolean) => '<option value="' + n + '"' + (sel ? ' selected' : '') + '>' + esc(song.labels[n]!) + '</option>';
    html += '<label class="rwf rwsong"><span>Song</span><select ' + k('song') + '>' + songOptions(own, exercises, it.song, exFirst) + '</select></label>' +
      '<label class="rwf rwfrom"><span>Lines</span><select ' + k('from') + '><option value=""' + (whole ? ' selected' : '') + '>The whole song</option>' + song.labels.map((_, n) => lineOpt(n, !whole && n === a)).join('') + '</select></label>' +
      (whole ? '' : '<label class="rwf rwto"><span>to</span><select ' + k('to') + '>' + song.labels.map((_, n) => (n >= a ? lineOpt(n, n === b) : '')).join('') + '</select></label>') +
      '<label class="rwf rwnum rwrounds"><span>Rounds</span><input type="number" min="1" max="20" step="1" inputmode="numeric" value="' + it.rounds + '" ' + k('rounds') + '></label>' +
      '<label class="rwf rwnum rwbreak" title="The break between its rounds: seconds of silence before each round after the first, the drone going on; then the count-in again, if it is on"><span>Break, seconds</span><input type="number" min="0" max="' + ROUTINE_LIMITS.gap + '" step="1" inputmode="numeric" value="' + roundGapOf(it) + '" ' + k('roundGap') + '></label>' +
      '<label class="rwf rwnum rwtempo"><span>Tempo</span><input type="number" min="30" max="240" step="1" inputmode="numeric" placeholder="' + song.tempo + '" value="' + (it.tempo ?? '') + '" ' + k('tempo') + '></label>' +
      '<label class="rwf rwguide"><span>Guide</span><select ' + k('guide') + '>' + GUIDES.map(([v, t]) => '<option value="' + v + '"' + ((it.guide ?? '') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
  }
  html += '</div><span class="rwside"><button type="button" class="rwbtn rwdel" data-i="' + i + '" data-act="remove" aria-label="Remove from this routine" title="Remove from this routine">' + ICON.del + '</button></span></li>';
  return html;
}

/** Over a routine's items: Tick all, and once some are ticked how many, Remove (asked first, in
 * the bar) and Untick, as in My takes. Hidden for a single item until it is ticked. */
export function tickBarHTML(count: number, sel: number, asking: boolean): string {
  const acts = !sel
    ? ''
    : asking
      ? '<span class="tksure">Remove ' + (sel === 1 ? 'this item' : 'these ' + sel + ' items') + ' from the routine?</span><button type="button" class="btn danger" data-act="rmyes">Remove</button><button type="button" class="btn" data-act="rmno">Keep</button>'
      : '<span class="tkseln">' + sel + ' ticked</span><button type="button" class="btn danger" data-act="rmsel">Remove ' + (sel === 1 ? 'it' : 'all ' + sel) + '</button><button type="button" class="btn" data-act="untick">Untick</button>';
  return '<div class="tkbar rwsel"' + (count > 1 || sel ? '' : ' hidden') + '><label class="tkall"><input type="checkbox" data-act="tickall"' + (sel && sel === count ? ' checked' : sel ? ' data-mixed="1"' : '') + '> Tick all</label><span class="spacer"></span>' + acts + '</div>';
}

/** The rewaz bar's round, 0-based `pass` of `rounds`: " · round 2 of 3", and while a break
 * before it counts down " · round 2 of 3 starting in 3 s", as the break between items is
 * (Rinat, 2026-10-26). */
export const roundText = (pass: number, rounds: number, left = 0): string =>
  ' · round ' + Math.min(pass + 1, rounds) + ' of ' + rounds + (left > 0 ? ' starting in ' + left + ' s' : '');

/** What a routine's row shows besides the routine itself. */
export interface RoutineRow {
  /** Saved in this browser (the ready-made warm-up is not, until changed). */
  saved: boolean;
  open: boolean;
  /** Its length, seconds, as estimated. */
  secs: number;
  /** "Delete routine" was pressed: ask first. */
  confirming: boolean;
  /** The songs and exercises ticked so far while choosing what to add, in order; null
   * when not choosing. */
  picking: readonly string[] | null;
  /** The open song, marked in the picker. */
  openId: string;
  /** The exercises listed first, as in the Music library. */
  exFirst: boolean;
  /** The items ticked, by index. */
  ticked?: ReadonlySet<number>;
  /** Asking whether to remove the items ticked. */
  removing?: boolean;
}

/** A routine's length beside its name: "4 items · about 6 min", and "ready-made" while the
 * warm-up is not saved. */
export function metaText(r: Routine, saved: boolean, secs: number): string {
  const count = r.items.length;
  return (count ? count + ' item' + (count === 1 ? '' : 's') + ' · about ' + durationText(Math.max(60, secs)) : 'No items yet') + (saved ? '' : ' · ready-made');
}

/**
 * One routine: a heading row (its name and length; tapped anywhere it folds the routine
 * away) with a full-height Start button at its end; unfolded, its name, the break between its
 * items, its items, and a row to add songs and exercises (choosing several at once) or
 * delete the routine. `n` numbers its parts on the page.
 */
export function routineHTML(r: Routine, n: number, o: RoutineRow, song: (id: string) => ItemSong | null, own: readonly Choice[], exercises: readonly Choice[]): string {
  const count = r.items.length;
  const meta = metaText(r, o.saved, o.secs);
  const ticked = o.ticked ?? new Set<number>();
  const items = r.items.map((it, i) => itemRowHTML(it, i, song(it.song), own, exercises, o.exFirst, ticked.has(i))).join('') ||
    '<li class="rwempty">No items yet. Add songs and exercises, then choose their lines, rounds and tempo.</li>';
  const del = !o.saved
    ? ''
    : o.confirming
      ? '<span class="confirm">Delete this routine? <button type="button" class="btn danger" data-act="delyes">Delete</button><button type="button" class="btn" data-act="delno">Keep</button></span>'
      : '<button type="button" class="btn danger" data-act="del">Delete routine</button>';
  return '<section class="rwr' + (o.open ? ' open' : '') + '" data-r="' + esc(r.id) + '">' +
    '<div class="rwhead"><h3 class="rwh"><button type="button" class="rwfold" data-act="fold" aria-expanded="' + o.open + '" aria-controls="rwb-' + n + '">' + ICON.fold +
    '<span class="rwname">' + esc(r.name) + '</span><span class="rwmeta">' + meta + '</span></button></h3>' +
    '<button type="button" class="rwgo" data-act="start"' + (count ? '' : ' disabled') + '>' + ICON.play + '<span>Start rewaz</span></button></div>' +
    '<div class="rwbody" id="rwb-' + n + '"' + (o.open ? '' : ' hidden') + '>' +
    '<div class="rwopts"><label class="rwf rwnamef"><span>Name</span><input type="text" data-act="name" value="' + esc(r.name) + '" maxlength="' + ROUTINE_LIMITS.name + '" autocomplete="off"></label>' +
    '<label class="rwf rwnum rwgapf"><span>Break between items, seconds</span><input type="number" min="0" max="' + ROUTINE_LIMITS.gap + '" step="1" inputmode="numeric" data-act="gap" value="' + gapOf(r) + '"></label></div>' +
    (count ? tickBarHTML(count, r.items.filter((_, i) => ticked.has(i)).length, !!o.removing) : '') +
    // A column for "to" only where an item plays some of its lines.
    '<ol class="rwlist' + (r.items.some((it) => it.from != null) ? ' rwranges' : '') + '">' + items + '</ol>' +
    (o.picking ? pickerHTML(own, exercises, o.exFirst, o.picking, o.openId) : '') +
    '<div class="rwfoot">' + (o.picking ? '' : '<button type="button" class="btn" data-act="pick"' + (count >= ROUTINE_LIMITS.items ? ' disabled' : '') + '>+ Add songs and exercises</button>') +
    '<span class="spacer"></span>' + del + '</div></div></section>';
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface RewazHost {
  /** The songs and the exercises to choose from, and whether the exercises come first. */
  choices(): { own: readonly Choice[]; exercises: readonly Choice[]; exFirst?: boolean };
  /** An item's song, or null when it is gone. */
  song(id: string): ItemSong | null;
  countIn(): boolean;
  currentSongId(): string;
  routines(): Map<string, Routine>;
  save(r: Routine): WriteResult;
  remove(id: string): WriteResult;
  /** Which routines are unfolded, kept on the device. */
  unfolded: { has(id: string): boolean; set(id: string, open: boolean): void };
  /** Load the item's song and play its lines for its rounds, with its tempo and guide and
   * `roundGap` seconds of break between rounds; false when there is nothing to play. */
  play(it: RoutineItem, roundGap: number): boolean;
  /** Stop playing (the routine continues: Skip). */
  stop(): void;
  playing(): boolean;
  showPractice(): void;
}

export interface Rewaz {
  render(): void;
  /** A routine is running: playing an item, or between items. */
  readonly active: boolean;
  readonly name: string;
  /** The item playing ended by itself: on to the next after a breath. */
  finished(): void;
  /** Playing stopped for any other reason: the routine stops too. */
  cancel(): void;
  /** A beat is showing in round `pass` (0-based). */
  beat(pass: number): void;
  /** A break before round `pass` (0-based), `left` seconds to go; 0 once its count-in plays. */
  rest(pass: number, left: number): void;
  /** The item playing has `secs` seconds to go, its rounds and their breaks with it. */
  left(secs: number): void;
}

/** What a rewaz still takes, roughly, as its bar shows it: `itemLeft` seconds of item `i` (null:
 * all of it, not started yet) and then the items after it, with the breaks between them
 * (Rinat, 2026-10-31: "add total remaining time on rewaz bar"). */
export function rewazLeft(r: Routine, i: number, itemLeft: number | null, shapeOf: (id: string) => SongShape | null, countIn: boolean): number {
  if (itemLeft == null) return routineSeconds(r, shapeOf, countIn, i);
  return itemLeft + (i + 1 < r.items.length ? gapOf(r) + routineSeconds(r, shapeOf, countIn, i + 1) : 0);
}

export function initRewaz(host: RewazHost): Rewaz {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const view = $('#rewaz');
  const list = $('#rwRoutines');
  const bar = $('#rwBar');
  const barText = $('#rwBarText');
  const barLeft = $('#rwLeft');

  let run: { r: Routine; i: number; started: number; timer: number; skipping: boolean } | null = null;
  /** The routine whose "Delete routine" was pressed, asking to confirm. */
  let confirming = '';
  /** Choosing what to add to a routine: which, and what is ticked so far, in order. */
  let picking: { id: string; picked: string[] } | null = null;
  /** Each routine's items ticked, by index; and the routine asking whether to remove them. */
  const ticks = new Map<string, Set<number>>();
  let removing = '';

  const byName = (a: Routine, b: Routine) => a.name.localeCompare(b.name);

  /** Every routine, by name; the ready-made warm-up first while it is not saved: it stays on
   * offer, like the exercises, and changing it saves it as the user's. */
  function routines(): { r: Routine; saved: boolean }[] {
    const all = Array.from(host.routines().values()).sort(byName).map((r) => ({ r, saved: true }));
    return all.some((x) => x.r.id === STARTER.id) ? all : [{ r: structuredClone(STARTER), saved: false }, ...all];
  }
  function routine(id: string): { r: Routine; saved: boolean } | null {
    const saved = host.routines().get(id);
    if (saved) return { r: saved, saved: true };
    return id === STARTER.id ? { r: structuredClone(STARTER), saved: false } : null;
  }

  function status(t: string): void {
    $('#rwStatus').textContent = t;
  }

  function store(r: Routine): void {
    r.updatedAt = Date.now();
    const w = host.save(r);
    status(w === 'ok' ? 'Saved in this browser' : w === 'full' ? 'Not saved: storage is full.' : 'Not saved. This browser blocks storage.');
  }

  function render(): void {
    if (view.hidden) return;
    const { own, exercises, exFirst = false } = host.choices();
    const openId = host.currentSongId();
    // Keep what is being typed in a routine's name while the list is redrawn.
    const typing = document.activeElement instanceof HTMLInputElement && document.activeElement.dataset.act === 'name' ? document.activeElement : null;
    const typingIn = typing?.closest<HTMLElement>('.rwr')?.dataset.r;
    list.innerHTML = routines().map(({ r, saved }, n) => {
      // Ticks past the end (a routine changed in another tab) go.
      const set = ticks.get(r.id);
      if (set) for (const i of Array.from(set)) if (i >= r.items.length) set.delete(i);
      if (removing === r.id && !set?.size) removing = '';
      return routineHTML(r, n, {
        saved, open: host.unfolded.has(r.id), secs: routineSeconds(r, host.song, host.countIn()), confirming: confirming === r.id,
        picking: picking && picking.id === r.id ? picking.picked : null, openId, exFirst, ticked: set, removing: removing === r.id,
      }, host.song, own, exercises);
    }).join('');
    showMixed(list);
    if (typing && typingIn) {
      const again = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === typingIn)?.querySelector<HTMLInputElement>('input[data-act="name"]');
      if (again) {
        again.value = typing.value;
        again.focus();
      }
    }
  }

  function change(id: string, fn: (r: Routine) => void): void {
    const got = routine(id);
    if (!got) return;
    fn(got.r);
    store(got.r);
    render();
  }

  // ── Running ────────────────────────────────────────────────────────────────

  function showBar(text: string): void {
    bar.hidden = false;
    barText.textContent = text;
  }
  /** The time the whole rewaz still takes, from item `i` on, `itemLeft` seconds of it to go
   * (null: not started) and `wait` seconds of break before it; hidden once it is done. */
  function showLeft(i: number, itemLeft: number | null, wait = 0): void {
    barLeft.hidden = !run;
    if (run) barLeft.textContent = leftText(wait + rewazLeft(run.r, i, itemLeft, host.song, host.countIn())) + ' in all';
  }

  function itemText(i: number, extra = ''): string {
    const r = run!.r;
    const it = r.items[i]!;
    return r.name + ' · ' + (i + 1) + ' of ' + r.items.length + ' · ' + (host.song(it.song)?.title ?? '') + extra;
  }

  function go(i: number): void {
    if (!run) return;
    run.i = i;
    showBar(itemText(i, run.r.items[i]!.rounds > 1 ? ' · round 1 of ' + run.r.items[i]!.rounds : ''));
    showLeft(i, null);
    if (!host.play(run.r.items[i]!, roundGapOf(run.r.items[i]!))) next(i + 1, 0);
  }

  function next(from: number, gap: number): void {
    if (!run) return;
    let i = from;
    while (i < run.r.items.length && !host.song(run.r.items[i]!.song)) i++;
    if (i >= run.r.items.length) {
      const secs = (Date.now() - run.started) / 1000;
      const n = run.r.items.length;
      run = null;
      showBar('Rewaz done · ' + n + ' item' + (n === 1 ? '' : 's') + ' in ' + durationText(secs) + '. Well sung!');
      showLeft(i, null);
      $('#rwSkip').hidden = true;
      $('#rwStop').textContent = 'Close';
      return;
    }
    if (!gap) {
      go(i);
      return;
    }
    // The break, counting down each second.
    run.i = i;
    let left = gap;
    const say = () => {
      showBar('Next: ' + itemText(i) + ' · starting in ' + left + ' s');
      showLeft(i, null, left);
    };
    say();
    run.timer = window.setInterval(() => {
      if (!run) return;
      left--;
      if (left > 0) say();
      else {
        clearInterval(run.timer);
        go(i);
      }
    }, 1000);
  }

  function start(id: string): void {
    const got = routine(id);
    if (!got || !got.r.items.length) return;
    const { r, saved } = got;
    if (!saved) store(r);
    if (run) cancelRun();
    run = { r: structuredClone(r), i: 0, started: Date.now(), timer: 0, skipping: false };
    $('#rwSkip').hidden = false;
    $('#rwStop').textContent = 'Stop rewaz';
    host.showPractice();
    next(0, 0);
  }

  function cancelRun(): void {
    if (!run) return;
    clearInterval(run.timer);
    run = null;
    bar.hidden = true;
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  /** The routine a row or button belongs to. */
  const routineOf = (el: Element) => el.closest<HTMLElement>('.rwr')?.dataset.r ?? '';
  /** After a redraw, put the focus back on the same control of the same routine. */
  function focusIn(id: string, sel: string): void {
    const sec = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === id);
    sec?.querySelector<HTMLElement>(sel)?.focus();
  }
  const refocus = (id: string, act: string) => focusIn(id, '[data-act="' + act + '"]');

  $('#rwNew').addEventListener('click', () => {
    const r: Routine = { id: newRoutineId(), name: 'My rewaz', items: [{ song: host.currentSongId(), rounds: 2 }], updatedAt: Date.now() };
    store(r);
    host.unfolded.set(r.id, true);
    render();
    const sec = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === r.id);
    sec?.scrollIntoView({ block: 'nearest' });
    const name = sec?.querySelector<HTMLInputElement>('input[data-act="name"]');
    name?.focus();
    name?.select();
  });
  list.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-act]');
    if (!b) return;
    const id = routineOf(b);
    const act = b.dataset.act;
    if (act === 'fold') {
      host.unfolded.set(id, b.getAttribute('aria-expanded') !== 'true');
      render();
      refocus(id, 'fold');
    } else if (act === 'start') start(id);
    else if (act === 'pick') {
      picking = { id, picked: [] };
      render();
      refocus(id, 'pickq');
    } else if (act === 'pickcancel') {
      picking = null;
      render();
      refocus(id, 'pick');
    } else if (act === 'addpicked' && picking && picking.id === id) {
      const want = picking.picked;
      let added = 0;
      change(id, (r) => {
        for (const song of want) {
          if (r.items.length >= ROUTINE_LIMITS.items) break;
          r.items.push({ song, rounds: 2 });
          added++;
        }
      });
      picking = null;
      render();
      status('Added ' + added + (added < want.length ? ' of ' + want.length + ': a routine holds ' + ROUTINE_LIMITS.items + ' items' : '') + '.');
      refocus(id, 'pick');
    } else if (act === 'del' || act === 'delno') {
      confirming = act === 'del' ? id : '';
      render();
      refocus(id, act === 'del' ? 'delno' : 'del');
    } else if (act === 'delyes') {
      const got = routine(id);
      confirming = '';
      if (!got) return;
      host.remove(id);
      host.unfolded.set(id, false);
      status('Deleted ' + got.r.name);
      render();
    } else if (act === 'remove') {
      const i = Number(b.dataset.i);
      const set = ticks.get(id);
      change(id, (r) => {
        if (!r.items[i]) return;
        r.items.splice(i, 1);
        // The ticks after it move up with their items.
        if (set) {
          const was = Array.from(set);
          set.clear();
          for (const t of was) if (t !== i) set.add(t > i ? t - 1 : t);
        }
      });
    } else if (act === 'rmsel' || act === 'rmno') {
      removing = act === 'rmsel' ? id : '';
      render();
      refocus(id, act === 'rmsel' ? 'rmno' : 'rmsel');
    } else if (act === 'rmyes') {
      const set = ticks.get(id);
      removing = '';
      if (!set?.size) return;
      const n = set.size;
      change(id, (r) => {
        r.items = r.items.filter((_, i) => !set.has(i));
        set.clear();
      });
      status('Removed ' + n + ' item' + (n === 1 ? '' : 's') + ' from the routine.');
      refocus(id, 'tickall');
    } else if (act === 'untick') {
      ticks.delete(id);
      removing = '';
      render();
      refocus(id, 'tickall');
    }
  });
  /** A tick box on an item, or Tick all, ticked or not. */
  function tick(box: HTMLInputElement): void {
    const id = routineOf(box);
    const got = routine(id);
    if (!got) return;
    const set = ticks.get(id) ?? new Set<number>();
    if (box.dataset.act === 'tickall') {
      set.clear();
      if (box.checked) got.r.items.forEach((_, i) => set.add(i));
    } else if (box.checked) set.add(Number(box.dataset.tick));
    else set.delete(Number(box.dataset.tick));
    ticks.set(id, set);
    if (!set.size && removing === id) removing = '';
    render();
    focusIn(id, box.dataset.act === 'tickall' ? '[data-act="tickall"]' : '[data-tick="' + box.dataset.tick + '"]');
  }

  // ── Moving items: drag the number (mouse or touch), or ↑ ↓ on it ────────────
  /** The items that move with item `i`: the ticked ones when it is one of them, else it alone. */
  function movingWith(id: string, i: number): number[] {
    const set = ticks.get(id);
    return set && set.has(i) && set.size > 1 ? Array.from(set).sort((a, b) => a - b) : [i];
  }
  /** Move `moving` before the `at`-th of the other items (moveItems), the ticks going with their
   * items, and keep the keyboard on the handle of item `grip`. */
  function moveTo(id: string, moving: number[], at: number, grip: number): void {
    const got = routine(id);
    if (!got) return;
    const next = [...got.r.items];
    const to = moveItems(next, moving, at);
    if (next.every((x, j) => x === got.r.items[j])) {
      focusIn(id, '[data-grip="' + grip + '"]');
      return;
    }
    const set = ticks.get(id);
    change(id, (r) => {
      const flags = r.items.map((_, j) => !!set?.has(j));
      moveItems(r.items, moving, at);
      moveItems(flags, moving, at);
      if (set) {
        set.clear();
        flags.forEach((f, j) => f && set.add(j));
      }
    });
    focusIn(id, '[data-grip="' + to[moving.indexOf(grip)] + '"]');
  }
  let drag: { id: string; grip: number; moving: number[]; pointer: number; y0: number; on: boolean; at: number } | null = null;
  let dropLine: HTMLElement | null = null;
  const rowsOf = (id: string) => Array.from(Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === id)?.querySelectorAll<HTMLElement>('.rwitem') ?? []);
  function endDrag(): void {
    for (const li of Array.from(list.querySelectorAll<HTMLElement>('.rwitem.dragging'))) {
      li.classList.remove('dragging');
      li.style.transform = '';
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
    const id = routineOf(g);
    const i = Number(g.dataset.grip);
    // Page coordinates, so the rows follow the pointer when the page scrolls under it.
    drag = { id, grip: i, moving: movingWith(id, i), pointer: e.pointerId, y0: e.clientY + scrollY, on: false, at: -1 };
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag;
    const y = e.clientY + scrollY;
    if (!d.on && Math.abs(y - d.y0) < 5) return;
    const rows = rowsOf(d.id);
    if (!rows.length) return;
    if (!d.on) {
      d.on = true;
      for (const m of d.moving) rows[m]?.classList.add('dragging');
      dropLine = document.createElement('li');
      dropLine.className = 'rwdrop';
      dropLine.setAttribute('aria-hidden', 'true');
      rows[0]!.parentElement!.appendChild(dropLine);
    }
    // Near the top or bottom of the screen the page scrolls, to reach the items out of view.
    if (e.clientY < 48) scrollBy(0, -16);
    else if (e.clientY > innerHeight - 48) scrollBy(0, 16);
    for (const m of d.moving) if (rows[m]) rows[m]!.style.transform = 'translateY(' + (y - d.y0) + 'px)';
    // Where they would go: before the first other item whose middle is below the pointer.
    const others = rows.filter((_, j) => !d.moving.includes(j));
    let at = others.findIndex((r) => {
      const b = r.getBoundingClientRect();
      return e.clientY < b.top + b.height / 2;
    });
    if (at < 0) at = others.length;
    d.at = at;
    const box = rows[0]!.parentElement!.getBoundingClientRect();
    const ref = others[at];
    const line = ref ? ref.getBoundingClientRect().top : (others.at(-1)?.getBoundingClientRect().bottom ?? box.top);
    dropLine!.style.top = line - box.top + 'px';
  });
  list.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const { id, grip, moving, on, at } = drag;
    endDrag();
    if (on && at >= 0) moveTo(id, moving, at, grip);
  });
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest<HTMLElement>('[data-grip]');
    if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = routineOf(g);
    const got = routine(id);
    if (!got) return;
    const i = Number(g.dataset.grip);
    const moving = movingWith(id, i);
    moveTo(id, moving, stepAt(got.r.items.length, moving, e.key === 'ArrowUp' ? -1 : 1), i);
  });
  /** Ticking and unticking in the picker: the order numbers and the Add button change in
   * place, so the keyboard stays on the row. */
  function picked(box: HTMLInputElement): void {
    if (!picking) return;
    const songId = box.dataset.pick!;
    picking.picked = picking.picked.filter((x) => x !== songId);
    if (box.checked) picking.picked.push(songId);
    const panel = box.closest<HTMLElement>('.rwpick');
    if (!panel) return;
    for (const b of Array.from(panel.querySelectorAll<HTMLInputElement>('input[data-pick]'))) {
      const n = picking.picked.indexOf(b.dataset.pick!) + 1;
      const badge = b.parentElement!.querySelector<HTMLElement>('.rwpickn')!;
      badge.hidden = !n;
      badge.textContent = n ? String(n) : '';
    }
    panel.querySelector('[data-act="addpicked"]')!.outerHTML = pickedButton(picking.picked.length);
  }
  list.addEventListener('input', (e) => {
    const q = e.target as HTMLInputElement;
    if (q.dataset.act !== 'pickq') return;
    const want = foldText(q.value.trim());
    const panel = q.closest<HTMLElement>('.rwpick')!;
    for (const li of Array.from(panel.querySelectorAll<HTMLElement>('.rwpicklist > li'))) li.hidden = !!want && !(li.dataset.q ?? '').includes(want);
    for (const g of Array.from(panel.querySelectorAll<HTMLElement>('.rwpickgrp'))) g.hidden = !g.querySelector('.rwpicklist > li:not([hidden])');
  });
  list.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.dataset.pick) {
      picked(el);
      return;
    }
    if (el instanceof HTMLInputElement && (el.dataset.tick != null || el.dataset.act === 'tickall')) {
      tick(el);
      return;
    }
    const id = routineOf(el);
    const act = el.dataset.act;
    if (act === 'gap') {
      const got = routine(id);
      if (!got) return;
      const v = Math.round(Number(el.value));
      const to = Number.isFinite(v) && el.value !== '' ? Math.max(0, Math.min(ROUTINE_LIMITS.gap, v)) : gapOf(got.r);
      got.r.gap = to;
      store(got.r);
      if (got.saved) {
        el.value = String(to);
        const meta = el.closest('.rwr')?.querySelector('.rwmeta');
        if (meta) meta.textContent = metaText(got.r, true, routineSeconds(got.r, host.song, host.countIn()));
      } else {
        render();
        refocus(id, act);
      }
      return;
    }
    if (el.dataset.act === 'name') {
      const got = routine(id);
      if (!got) return;
      got.r.name = el.value.trim().slice(0, ROUTINE_LIMITS.name) || 'My rewaz';
      store(got.r);
      // A saved routine's name changes in place, so Tab goes on to the next field; the
      // ready-made one, saved now, is drawn again (it can be deleted from now on).
      if (got.saved) {
        el.value = got.r.name;
        const shown = el.closest('.rwr')?.querySelector('.rwname');
        if (shown) shown.textContent = got.r.name;
      } else {
        render();
        refocus(id, 'name');
      }
      return;
    }
    const i = Number(el.dataset.i);
    const key = el.dataset.k;
    if (!key || !Number.isInteger(i)) return;
    const got = routine(id);
    if (!got) return;
    const edit = (r: Routine) => {
      const it = r.items[i];
      if (!it) return;
      const v = el.value;
      if (key === 'song') {
        r.items[i] = { song: v, rounds: it.rounds, ...(it.guide ? { guide: it.guide } : {}), ...(it.roundGap ? { roundGap: it.roundGap } : {}) };
      } else if (key === 'from') {
        if (v === '') {
          delete it.from;
          delete it.to;
        } else {
          it.from = Number(v);
          it.to = Math.max(it.from, it.to ?? it.from);
          wholeIfAll(it, host.song(it.song)?.labels.length ?? 0);
        }
      } else if (key === 'to') {
        it.to = Number(v);
        wholeIfAll(it, host.song(it.song)?.labels.length ?? 0);
      } else if (key === 'rounds') it.rounds = Math.max(1, Math.min(20, Math.round(Number(v)) || 1));
      else if (key === 'roundGap') {
        const t = Math.max(0, Math.min(ROUTINE_LIMITS.gap, Math.round(Number(v)) || 0));
        if (t) it.roundGap = t;
        else delete it.roundGap;
      }
      else if (key === 'tempo') {
        const t = Math.round(Number(v));
        if (v === '' || !t) delete it.tempo;
        else it.tempo = Math.max(30, Math.min(240, t));
      } else if (key === 'guide') {
        if (v) it.guide = v as ItemGuide;
        else delete it.guide;
      }
    };
    // Rounds, their break, tempo, guide and the last line change in place, so Tab goes on to the next
    // field. A new song or first line changes the other fields, as does a last line making it
    // the whole song: the routine is drawn again and the focus put back on the same choice, or
    // on the lines' first (as is the ready-made one, saved now).
    const all = key === 'to' && (got.r.items[i]?.from ?? 0) <= 0 && Number(el.value) >= (host.song(got.r.items[i]?.song ?? '')?.labels.length ?? 0) - 1;
    if (got.saved && key !== 'song' && key !== 'from' && !all) {
      edit(got.r);
      store(got.r);
      const it = got.r.items[i];
      if (it && key === 'rounds') el.value = String(it.rounds);
      if (it && key === 'roundGap') el.value = String(roundGapOf(it));
      if (it && key === 'tempo') el.value = it.tempo == null ? '' : String(it.tempo);
      const meta = el.closest('.rwr')?.querySelector('.rwmeta');
      if (meta) meta.textContent = metaText(got.r, true, routineSeconds(got.r, host.song, host.countIn()));
      return;
    }
    change(id, edit);
    const sec = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === id);
    sec?.querySelector<HTMLElement>('[data-i="' + i + '"][data-k="' + (all ? 'from' : key) + '"]')?.focus();
  });
  // While an item plays, Skip moves on to the next; in the pause before one, it starts it now.
  $('#rwSkip').addEventListener('click', () => {
    if (!run) return;
    clearInterval(run.timer);
    if (host.playing()) {
      run.skipping = true;
      host.stop();
    } else go(run.i);
  });
  $('#rwStop').addEventListener('click', () => {
    if (run && host.playing()) host.stop();
    cancelRun();
    bar.hidden = true;
  });

  return {
    render,
    get active() {
      return !!run;
    },
    get name() {
      return run ? run.r.name : '';
    },
    finished() {
      if (run) next(run.i + 1, gapOf(run.r));
    },
    cancel() {
      if (!run) return;
      if (run.skipping) {
        run.skipping = false;
        next(run.i + 1, 0);
        return;
      }
      cancelRun();
    },
    beat(pass) {
      if (!run || pass < 0) return;
      const it = run.r.items[run.i];
      if (it && it.rounds > 1) showBar(itemText(run.i, roundText(pass, it.rounds)));
    },
    rest(pass, left) {
      const it = run?.r.items[run.i];
      if (it) showBar(itemText(run!.i, roundText(pass, it.rounds, left)));
    },
    left(secs) {
      if (run && host.playing()) showLeft(run.i, secs);
    },
  };
}

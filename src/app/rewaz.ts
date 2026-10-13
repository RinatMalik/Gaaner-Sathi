/**
 * The Rewaz view and its runner (docs/ROADMAP.md → Rewaz routine): routines of exercises
 * and songs, each item with its own lines, rounds, tempo and guide, played one after
 * another without touching the screen. Each item's practice goes into the log with the
 * routine's name. Every routine is a row that folds away, as the Music library's sections
 * do (Rinat, 2026-10-13). The HTML builders are pure and tested in Node.
 */
import { durationText } from '../core/practice/log';
import { ITEM_GAP, itemLines, newRoutineId, ROUTINE_LIMITS, routineSeconds, STARTER, type ItemGuide, type Routine, type RoutineItem, type SongShape } from '../core/practice/routine';
import type { WriteResult } from './store';
import { esc } from './view';

const svg = (body: string) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
const ICON = {
  fold: svg('<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  play: svg('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>'),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  del: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
};

/** A song as the item pickers show it. */
export interface Choice {
  id: string;
  title: string;
}

/** What an item needs to know about its song: lines, tempo, cycle, line labels, title. */
export type ItemSong = SongShape & { labels: readonly string[]; title: string };

const GUIDES: readonly [ItemGuide | '', string][] = [
  ['', 'As in Practice settings'],
  ['all', 'Every round'],
  ['first', 'First round only'],
  ['alt', 'Every other round'],
  ['off', 'Off: sing alone'],
];

function songOptions(own: readonly Choice[], exercises: readonly Choice[], selected: string): string {
  const opt = (c: Choice) => '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.title) + '</option>';
  return (own.length ? '<optgroup label="My songs">' + own.map(opt).join('') + '</optgroup>' : '') + '<optgroup label="Exercises">' + exercises.map(opt).join('') + '</optgroup>';
}

/** One item, as a row like a line in the beat boxes: its number down the left; its song,
 * lines, rounds, tempo and guide; and at its end full-height buttons to move it up or down
 * or remove it (icons only). */
export function itemRowHTML(it: RoutineItem, i: number, count: number, song: ItemSong | null, own: readonly Choice[], exercises: readonly Choice[]): string {
  const k = (name: string) => 'data-i="' + i + '" data-k="' + name + '"';
  let html = '<li class="rwitem"><span class="rwn">' + (i + 1) + '</span><div class="rwfields">';
  if (!song) {
    html += '<span class="rwgone">This song has been deleted, so the rewaz skips it.</span>';
  } else {
    const [a, b] = itemLines(it, song.labels.length);
    const whole = it.from == null;
    const lineOpt = (n: number, sel: boolean) => '<option value="' + n + '"' + (sel ? ' selected' : '') + '>' + esc(song.labels[n]!) + '</option>';
    html += '<label class="rwf rwsong"><span>Song</span><select ' + k('song') + '>' + songOptions(own, exercises, it.song) + '</select></label>' +
      '<label class="rwf"><span>Lines</span><select ' + k('from') + '><option value=""' + (whole ? ' selected' : '') + '>The whole song</option>' + song.labels.map((_, n) => lineOpt(n, !whole && n === a)).join('') + '</select></label>' +
      (whole ? '' : '<label class="rwf"><span>to</span><select ' + k('to') + '>' + song.labels.map((_, n) => (n >= a ? lineOpt(n, n === b) : '')).join('') + '</select></label>') +
      '<label class="rwf rwnum"><span>Rounds</span><input type="number" min="1" max="20" step="1" inputmode="numeric" value="' + it.rounds + '" ' + k('rounds') + '></label>' +
      '<label class="rwf rwnum"><span>Tempo</span><input type="number" min="30" max="240" step="1" inputmode="numeric" placeholder="' + song.tempo + '" value="' + (it.tempo ?? '') + '" ' + k('tempo') + '></label>' +
      '<label class="rwf"><span>Guide</span><select ' + k('guide') + '>' + GUIDES.map(([v, t]) => '<option value="' + v + '"' + ((it.guide ?? '') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
  }
  const btn = (act: string, label: string, icon: string, off: boolean, cls = '') =>
    '<button type="button" class="rwbtn' + cls + '" data-i="' + i + '" data-act="' + act + '" aria-label="' + label + '" title="' + label + '"' + (off ? ' disabled' : '') + '>' + icon + '</button>';
  html += '</div><span class="rwside">' + btn('up', 'Move up', ICON.up, i === 0) + btn('down', 'Move down', ICON.down, i === count - 1) +
    btn('remove', 'Remove from this routine', ICON.del, false, ' rwdel') + '</span></li>';
  return html;
}

/** What a routine's row shows besides the routine itself. */
export interface RoutineRow {
  /** Saved in this browser (the ready-made warm-up is not, until changed). */
  saved: boolean;
  open: boolean;
  /** Its length, seconds, as estimated. */
  secs: number;
  /** "Delete routine" was pressed: ask first. */
  confirming: boolean;
  /** The open song's title, for "+ Add". */
  openTitle: string;
}

/**
 * One routine: a heading row (its name and length; tapped anywhere it folds the routine
 * away) with a full-height Start button at its end; unfolded, its name, its items and a
 * row to add the open song or delete the routine. `n` numbers its parts on the page.
 */
/** A routine's length beside its name: "4 items · about 6 min", and "ready-made" while the
 * warm-up is not saved. */
export function metaText(r: Routine, saved: boolean, secs: number): string {
  const count = r.items.length;
  return (count ? count + ' item' + (count === 1 ? '' : 's') + ' · about ' + durationText(Math.max(60, secs)) : 'No items yet') + (saved ? '' : ' · ready-made');
}

export function routineHTML(r: Routine, n: number, o: RoutineRow, song: (id: string) => ItemSong | null, own: readonly Choice[], exercises: readonly Choice[]): string {
  const count = r.items.length;
  const meta = metaText(r, o.saved, o.secs);
  const items = r.items.map((it, i) => itemRowHTML(it, i, count, song(it.song), own, exercises)).join('') ||
    '<li class="rwempty">No items yet. Add the song that is open, then choose its lines, rounds and tempo.</li>';
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
    '<label class="rwf rwnamef"><span>Name</span><input type="text" data-act="name" value="' + esc(r.name) + '" maxlength="' + ROUTINE_LIMITS.name + '" autocomplete="off"></label>' +
    '<ol class="rwlist">' + items + '</ol>' +
    '<div class="rwfoot"><button type="button" class="btn" data-act="add"' + (count >= ROUTINE_LIMITS.items ? ' disabled' : '') + '>+ Add the open song: <b>' + esc(o.openTitle) + '</b></button>' +
    '<span class="spacer"></span>' + del + '</div></div></section>';
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface RewazHost {
  choices(): { own: readonly Choice[]; exercises: readonly Choice[] };
  /** An item's song, or null when it is gone. */
  song(id: string): ItemSong | null;
  countIn(): boolean;
  currentSongId(): string;
  routines(): Map<string, Routine>;
  save(r: Routine): WriteResult;
  remove(id: string): WriteResult;
  /** Which routines are unfolded, kept on the device. */
  unfolded: { has(id: string): boolean; set(id: string, open: boolean): void };
  /** Load the item's song and play its lines for its rounds, with its tempo and guide;
   * false when there is nothing to play. */
  play(it: RoutineItem): boolean;
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
}

export function initRewaz(host: RewazHost): Rewaz {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const view = $('#rewaz');
  const list = $('#rwRoutines');
  const bar = $('#rwBar');
  const barText = $('#rwBarText');

  let run: { r: Routine; i: number; started: number; timer: number; skipping: boolean } | null = null;
  /** The routine whose "Delete routine" was pressed, asking to confirm. */
  let confirming = '';

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
    const { own, exercises } = host.choices();
    const openTitle = host.song(host.currentSongId())?.title ?? '';
    // Keep what is being typed in a routine's name while the list is redrawn.
    const typing = document.activeElement instanceof HTMLInputElement && document.activeElement.dataset.act === 'name' ? document.activeElement : null;
    const typingIn = typing?.closest<HTMLElement>('.rwr')?.dataset.r;
    list.innerHTML = routines().map(({ r, saved }, n) => routineHTML(r, n, {
      saved, open: host.unfolded.has(r.id), secs: routineSeconds(r, host.song, host.countIn()), confirming: confirming === r.id, openTitle,
    }, host.song, own, exercises)).join('');
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

  function itemText(i: number, extra = ''): string {
    const r = run!.r;
    const it = r.items[i]!;
    return r.name + ' · ' + (i + 1) + ' of ' + r.items.length + ' · ' + (host.song(it.song)?.title ?? '') + extra;
  }

  function go(i: number): void {
    if (!run) return;
    run.i = i;
    showBar(itemText(i, run.r.items[i]!.rounds > 1 ? ' · round 1 of ' + run.r.items[i]!.rounds : ''));
    if (!host.play(run.r.items[i]!)) next(i + 1, 0);
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
      $('#rwSkip').hidden = true;
      $('#rwStop').textContent = 'Close';
      return;
    }
    if (!gap) {
      go(i);
      return;
    }
    run.i = i;
    showBar('Next: ' + itemText(i) + ' · starting in ' + gap + ' s');
    run.timer = window.setTimeout(() => go(i), gap * 1000);
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
    clearTimeout(run.timer);
    run = null;
    bar.hidden = true;
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  /** The routine a row or button belongs to. */
  const routineOf = (el: Element) => el.closest<HTMLElement>('.rwr')?.dataset.r ?? '';
  /** After a redraw, put the focus back on the same button of the same routine. */
  function refocus(id: string, act: string): void {
    const sec = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === id);
    sec?.querySelector<HTMLElement>('[data-act="' + act + '"]')?.focus();
  }

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
    else if (act === 'add') {
      change(id, (r) => {
        if (r.items.length < ROUTINE_LIMITS.items) r.items.push({ song: host.currentSongId(), rounds: 2 });
      });
      refocus(id, 'add');
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
    } else if (act === 'up' || act === 'down' || act === 'remove') {
      const i = Number(b.dataset.i);
      change(id, (r) => {
        const it = r.items[i];
        if (!it) return;
        if (act === 'remove') r.items.splice(i, 1);
        else {
          const j = act === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= r.items.length) return;
          r.items[i] = r.items[j]!;
          r.items[j] = it;
        }
      });
    }
  });
  list.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const id = routineOf(el);
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
        r.items[i] = { song: v, rounds: it.rounds, ...(it.guide ? { guide: it.guide } : {}) };
      } else if (key === 'from') {
        if (v === '') {
          delete it.from;
          delete it.to;
        } else {
          it.from = Number(v);
          it.to = Math.max(it.from, it.to ?? it.from);
        }
      } else if (key === 'to') it.to = Number(v);
      else if (key === 'rounds') it.rounds = Math.max(1, Math.min(20, Math.round(Number(v)) || 1));
      else if (key === 'tempo') {
        const t = Math.round(Number(v));
        if (v === '' || !t) delete it.tempo;
        else it.tempo = Math.max(30, Math.min(240, t));
      } else if (key === 'guide') {
        if (v) it.guide = v as ItemGuide;
        else delete it.guide;
      }
    };
    // Rounds, tempo, guide and the last line change in place, so Tab goes on to the next
    // field. A new song or first line changes the other fields: the routine is drawn again
    // and the focus put back on the same choice (as is the ready-made one, saved now).
    if (got.saved && key !== 'song' && key !== 'from') {
      edit(got.r);
      store(got.r);
      const it = got.r.items[i];
      if (it && key === 'rounds') el.value = String(it.rounds);
      if (it && key === 'tempo') el.value = it.tempo == null ? '' : String(it.tempo);
      const meta = el.closest('.rwr')?.querySelector('.rwmeta');
      if (meta) meta.textContent = metaText(got.r, true, routineSeconds(got.r, host.song, host.countIn()));
      return;
    }
    change(id, edit);
    const sec = Array.from(list.querySelectorAll<HTMLElement>('.rwr')).find((s) => s.dataset.r === id);
    sec?.querySelector<HTMLElement>('[data-i="' + i + '"][data-k="' + key + '"]')?.focus();
  });
  // While an item plays, Skip moves on to the next; in the pause before one, it starts it now.
  $('#rwSkip').addEventListener('click', () => {
    if (!run) return;
    clearTimeout(run.timer);
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
      if (run) next(run.i + 1, ITEM_GAP);
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
      if (it && it.rounds > 1) showBar(itemText(run.i, ' · round ' + Math.min(pass + 1, it.rounds) + ' of ' + it.rounds));
    },
  };
}

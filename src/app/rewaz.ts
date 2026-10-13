/**
 * The Rewaz view and its runner (docs/ROADMAP.md → Rewaz routine): routines of exercises
 * and songs, each item with its own lines, rounds, tempo and guide, played one after
 * another without touching the screen. Each item's practice goes into the log with the
 * routine's name. The HTML builders are pure and tested in Node.
 */
import { durationText } from '../core/practice/log';
import { ITEM_GAP, itemLines, newRoutineId, routineSeconds, STARTER, type ItemGuide, type Routine, type RoutineItem, type SongShape } from '../core/practice/routine';
import type { WriteResult } from './store';
import { esc } from './view';

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

/** One item: its song, lines, rounds, tempo, guide, and buttons to move or remove it. */
export function itemRowHTML(it: RoutineItem, i: number, count: number, song: ItemSong | null, own: readonly Choice[], exercises: readonly Choice[]): string {
  const k = (name: string) => 'data-i="' + i + '" data-k="' + name + '"';
  let html = '<li class="rwitem"><span class="rwn">' + (i + 1) + '</span>';
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
  html += '<span class="rwacts"><button type="button" class="ibtn" data-i="' + i + '" data-act="up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
    '<button type="button" class="ibtn" data-i="' + i + '" data-act="down" aria-label="Move down"' + (i === count - 1 ? ' disabled' : '') + '>↓</button>' +
    '<button type="button" class="ibtn" data-i="' + i + '" data-act="del">Remove</button></span></li>';
  return html;
}

/** The routine picker: saved routines by name, or the starter when there are none. */
export function routineOptionsHTML(all: readonly Routine[], selected: string): string {
  return all.map((r) => '<option value="' + esc(r.id) + '"' + (r.id === selected ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('');
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
  selected: { get(): string | undefined; set(id: string): void };
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
  const sel = $<HTMLSelectElement>('#rwSel');
  const nameIn = $<HTMLInputElement>('#rwName');
  const list = $('#rwList');
  const bar = $('#rwBar');
  const barText = $('#rwBarText');

  let run: { r: Routine; i: number; started: number; timer: number; skipping: boolean } | null = null;

  const byName = (a: Routine, b: Routine) => a.name.localeCompare(b.name);

  /** The routine shown: the one chosen, else the first saved, else the starter. The
   * starter stays on offer, like the exercises; changing it saves it as the user's. */
  function routine(): { r: Routine; saved: boolean } {
    const all = host.routines();
    const id = host.selected.get();
    const chosen = id ? all.get(id) : undefined;
    if (chosen) return { r: chosen, saved: true };
    const first = Array.from(all.values()).sort(byName)[0];
    return first && id !== STARTER.id ? { r: first, saved: true } : { r: structuredClone(STARTER), saved: false };
  }

  function status(t: string): void {
    $('#rwStatus').textContent = t;
  }

  function store(r: Routine): void {
    r.updatedAt = Date.now();
    const w = host.save(r);
    host.selected.set(r.id);
    status(w === 'ok' ? 'Saved in this browser' : w === 'full' ? 'Not saved: storage is full.' : 'Not saved. This browser blocks storage.');
  }

  function render(): void {
    if (view.hidden) return;
    const { r, saved } = routine();
    const all = Array.from(host.routines().values()).sort(byName);
    sel.innerHTML = routineOptionsHTML(all.some((x) => x.id === STARTER.id) ? all : [STARTER, ...all], r.id);
    if (document.activeElement !== nameIn) nameIn.value = r.name;
    const { own, exercises } = host.choices();
    list.innerHTML = r.items.map((it, i) => itemRowHTML(it, i, r.items.length, host.song(it.song), own, exercises)).join('') ||
      '<li class="lempty">No items yet. Add the song that is open, then choose its lines, rounds and tempo.</li>';
    const secs = routineSeconds(r, host.song, host.countIn());
    $('#rwTime').textContent = r.items.length ? r.items.length + ' item' + (r.items.length === 1 ? '' : 's') + ' · about ' + durationText(Math.max(60, secs)) : '';
    $('#rwDel').hidden = !saved;
    $<HTMLButtonElement>('#rwStart').disabled = !r.items.length;
  }

  function change(fn: (r: Routine) => void): void {
    const { r } = routine();
    fn(r);
    store(r);
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

  function start(): void {
    const { r, saved } = routine();
    if (!r.items.length) return;
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

  sel.addEventListener('change', () => {
    host.selected.set(sel.value);
    render();
  });
  nameIn.addEventListener('change', () => change((r) => (r.name = nameIn.value.trim().slice(0, 80) || 'My rewaz')));
  $('#rwNew').addEventListener('click', () => {
    const r: Routine = { id: newRoutineId(), name: 'My rewaz', items: [{ song: host.currentSongId(), rounds: 2 }], updatedAt: Date.now() };
    store(r);
    render();
    nameIn.focus();
    nameIn.select();
  });
  $('#rwAdd').addEventListener('click', () => change((r) => {
    if (r.items.length < 40) r.items.push({ song: host.currentSongId(), rounds: 2 });
  }));
  $('#rwStart').addEventListener('click', start);
  $('#rwDel').addEventListener('click', () => {
    $('#rwDelConfirm').hidden = false;
    $('#rwDel').hidden = true;
  });
  $('#rwDelNo').addEventListener('click', () => {
    $('#rwDelConfirm').hidden = true;
    $('#rwDel').hidden = false;
  });
  $('#rwDelYes').addEventListener('click', () => {
    const { r } = routine();
    host.remove(r.id);
    const rest = Array.from(host.routines().keys());
    if (rest[0]) host.selected.set(rest[0]);
    $('#rwDelConfirm').hidden = true;
    status('Deleted ' + r.name);
    render();
  });
  list.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const i = Number(el.dataset.i);
    const key = el.dataset.k;
    if (!key || !Number.isInteger(i)) return;
    change((r) => {
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
    });
  });
  list.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    change((r) => {
      const it = r.items[i];
      if (!it) return;
      if (b.dataset.act === 'del') r.items.splice(i, 1);
      else {
        const j = b.dataset.act === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= r.items.length) return;
        r.items[i] = r.items[j]!;
        r.items[j] = it;
      }
    });
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

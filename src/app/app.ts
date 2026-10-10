/**
 * The app's screen: everything on the page apart from the HTML builders in view.ts,
 * ported from the prototype's page script (reference/gaaner-sathi.html, from "State" to
 * the end). Names follow the prototype's, so the two read side by side.
 *
 * Changes from the prototype:
 * - The Sound settings fold away behind a bar that says what is on: folded at first on
 *   narrow screens and open on wide ones, then as the user leaves them (Rinat kept this
 *   layout change, 2026-10-10).
 * - Songs and settings stay in this browser, with no claude.ai storage or downloads;
 *   store.ts explains how the prototype's saved songs are read. Changes saved in another
 *   tab show up here, as the claude.ai version's live sync did.
 * - Batch imports are saved in one write.
 *
 * Added since (docs/ROADMAP.md → Phase 1): the Songs view (songs.ts), tags and favourites,
 * the practice log, written each time a song has been practised for a while, pitch
 * feedback from the microphone (pitch.ts), whose scores go into the log, rewaz routines
 * that play items one after another (rewaz.ts), and the Progress view (progress.ts).
 */
import { saFreq } from '../audio/dsp/pitch';
import { createEngine, createLiveContext } from '../audio/engine';
import type { GuideLevel, GuideLoop, SoundSettings } from '../audio/sound';
import { Transport, type BeatEntry, type PlaySource } from '../audio/transport';
import { EXERCISES } from '../core/exercises';
import type { Exercise } from '../core/exercises/types';
import { joinBeats, notesInRange, shiftOctaves, splitBeats, type TextEdit } from '../core/notation/edit';
import { parseSong } from '../core/notation/parse';
import { AKAR } from '../core/notation/symbols';
import type { Beat, ParsedSong, Unit } from '../core/notation/types';
import { lastPractised, logFileText, MIN_LOG_SECS, type LogEntry } from '../core/practice/log';
import { itemLines, type RoutineItem } from '../core/practice/routine';
import { fileName, IMPORT_LIMITS, songFileText, songsFromFile, stripExamplePrefix, type ImportedSong } from '../core/song/file';
import { newId, normalize, parseTags, type Song } from '../core/song/model';
import { beatLabel, SPEEDS } from '../core/taal/rhythm';
import { isTaalId, taalInfo, type TaalInfo } from '../core/taal/taals';
import { initPitch, type PitchUI } from './pitch';
import { initProgress } from './progress';
import { initRewaz, type ItemSong, type Rewaz } from './rewaz';
import { initSongs } from './songs';
import { loadPrefs, LogStore, RoutineStore, savePrefs as writePrefs, SongStore, TABS, type KeyValueStore, type Tab, type WriteResult } from './store';
import * as V from './view';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const select = (s: string) => $<HTMLSelectElement>(s);
const input = (s: string) => $<HTMLInputElement>(s);
const notationBox = () => $<HTMLTextAreaElement>('#notation');

// ── Preferences (this browser only) ──────────────────────────────────────────

let storage: KeyValueStore | null = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const prefs = loadPrefs(storage);
const savePrefs = () => {
  writePrefs(storage, prefs);
  renderSoundSummary();
};
const wanted = prefs.lastSong;
const layersOf = (style: string) => (prefs.layers as Record<string, string[] | undefined>)[style];

// ── State ────────────────────────────────────────────────────────────────────

let songs = new Map<string, Song>(); // the user's own songs
let current!: Song; // the song being shown (set by init)
let parsed: ParsedSong = parseSong('');
let taal: TaalInfo = taalInfo('dadra');
let insOct = 0;
let userPicked = false;
const beatEls = new Map<number, HTMLElement[]>();
const store = new SongStore(storage);
const logStore = new LogStore(storage);
/** When each song was last practised, from the log. */
let practised = lastPractised(logStore.load());
/** The Songs view and pitch feedback, wired up by init. */
let songsView: { render(): void } = { render() {} };
let pitchUI: PitchUI = { on: false, startRun() {}, beat() {}, endRun: () => null };
/** Rewaz routines and the Progress view, wired up by init. */
let rewaz: Rewaz = { render() {}, active: false, name: '', finished() {}, cancel() {}, beat() {} };
let progressView: { render(): void } = { render() {} };
const routineStore = new RoutineStore(storage);
/** While a rewaz item plays: its own tempo and guide, over the song's and the settings'. */
let itemOverride: { tempo?: number; guide?: GuideLevel; guideLoop?: GuideLoop } | null = null;
/** Set while the rewaz itself opens a song, which must not stop the rewaz. */
let runnerLoading = false;

const startOff = () => (current ? current.startOn : 1) - 1;

// ── Transport: one clock drives the rhythm, the melody and the highlight ─────

let T: Transport | null = null; // made on the first Play: browsers start audio only after a tap
let timer = 0;
let raf = 0;
let curEls: HTMLElement[] = [];
let lastLine = -1;
let wakeLock: WakeLockSentinel | null = null;
const playing = () => !!T && T.playing;

/** The song as played: a rewaz item's tempo over the song's own. */
const songSource = {
  get saKey() {
    return current.saKey;
  },
  get saOct() {
    return current.saOct;
  },
  get startOn() {
    return current.startOn;
  },
  get tempo() {
    return itemOverride?.tempo ?? current.tempo;
  },
};
/** The sound settings as played: a rewaz item's guide over the device's settings. */
const soundSource = new Proxy<SoundSettings>(prefs, {
  get(t, k) {
    if (k === 'guide' && itemOverride?.guide) return itemOverride.guide;
    if (k === 'guideLoop' && itemOverride?.guideLoop) return itemOverride.guideLoop;
    return Reflect.get(t, k);
  },
});

/** What the transport plays, read live as the prototype read its globals. */
const source: PlaySource = {
  get parsed() {
    return parsed;
  },
  get taal() {
    return taal;
  },
  get song() {
    return songSource;
  },
  get sound() {
    return soundSource;
  },
};

function ensureAudio(): Transport {
  if (!T) {
    T = new Transport(createEngine(createLiveContext()));
    T.onBeat = (q, spb) => pitchUI.beat(q, spb);
  }
  return T;
}

/** Play from line `fromN` (or the picker's); `rounds` stops a loop after that many. */
function play(fromN?: number, rounds?: number): void {
  if (!parsed.noteLines.length) {
    setNowMessage('No notes to play yet', 'Open Edit notation and type a line from your diary.');
    return;
  }
  let tr: Transport;
  try {
    tr = ensureAudio();
  } catch (e) {
    setNowMessage('Sound is unavailable', e instanceof Error ? e.message : String(e));
    return;
  }
  const ctx = tr.E.ctx as AudioContext;
  if (ctx.state !== 'running') void ctx.resume();
  if (tr.playing) stop(true);
  const L = parsed.noteLines;
  const from = clamp(fromN != null ? fromN : +select('#fromLine').value || 0, 0, L.length - 1);
  select('#fromLine').value = String(from);
  const loop = input('#loopChk').checked;
  let to = clamp(+select('#toLine').value || 0, 0, L.length - 1);
  if (to < from) {
    to = from;
    select('#toLine').value = String(to);
  }
  lastLine = -1;
  // Before start: starting schedules the first beat, and pitch feedback must hear of it.
  pitchUI.startRun();
  const r = tr.start(source, { from, to, loop, rounds });
  if (!r) return;
  startRun(r.from, r.to, loop);
  setPlayUI(true);
  if (r.pre > 0) setNowMessage('Count-in', '', String(r.pre));
  timer = window.setInterval(tick, 25);
  raf = requestAnimationFrame(frame);
  void wake();
}

/** Stop playing. `ended`: the song or its rounds came to their end by themselves. */
function stop(silent?: boolean, ended = false): void {
  if (!T || !T.playing) return;
  endRun(T.E.ctx.currentTime, pitchUI.endRun());
  T.stop();
  clearInterval(timer);
  timer = 0;
  cancelAnimationFrame(raf);
  clearHighlight();
  markTaal(-1);
  setPlayUI(false);
  unwake();
  if (!silent) showIdle();
  // A rewaz goes on to its next item when this one ended by itself; any other stop ends it.
  if (ended) rewaz.finished();
  else rewaz.cancel();
  if (!rewaz.active) clearOverride();
}

/** The play button and the space bar. During a rewaz they stop it. */
function userToggle(): void {
  if (rewaz.active) {
    if (playing()) stop();
    rewaz.cancel();
    clearOverride();
    return;
  }
  if (playing()) stop();
  else play();
}
/** A tap on a line number: play from there (ending any rewaz). */
function userPlay(n: number): void {
  if (playing()) stop(true);
  rewaz.cancel();
  clearOverride();
  play(n);
}

function showTempo(t: number): void {
  input('#tempoNum').value = String(t);
  input('#tempoRange').value = String(t);
}
function clearOverride(): void {
  if (!itemOverride) return;
  itemOverride = null;
  if (current) showTempo(current.tempo);
}

/** Play a rewaz item: its song, its lines for its rounds, at its tempo, with its guide. */
function playItem(it: RoutineItem): boolean {
  const s = songs.get(it.song) || EXERCISES.find((x) => x.id === it.song);
  if (!s) return false;
  runnerLoading = true;
  try {
    if (s.id !== current.id) loadSong(s);
  } finally {
    runnerLoading = false;
  }
  switchTab('practice');
  if (!parsed.noteLines.length) return false;
  const [a, b] = itemLines(it, parsed.noteLines.length);
  select('#fromLine').value = String(a);
  select('#toLine').value = String(b);
  input('#loopChk').checked = true;
  const g = it.guide;
  itemOverride = { tempo: it.tempo, guide: g === 'off' ? 'off' : g && prefs.guide === 'off' ? 'full' : undefined, guideLoop: g && g !== 'off' ? g : undefined };
  showTempo(itemOverride.tempo ?? current.tempo);
  play(a, it.rounds);
  return playing();
}

/** Each notes line's number and first beats, as the line pickers show them. */
function lineLabels(P: ParsedSong): string[] {
  return P.noteLines.map((l) => l.n + 1 + ' · ' + l.beats.slice(0, 6).map((b) => V.plainBeat(b, prefs.script)).join(' ') + (l.beats.length > 6 ? ' …' : ''));
}
/** A rewaz item's song: its lines, tempo, cycle and title, worked out once per version. */
const itemSongs = new Map<string, { key: string; song: ItemSong }>();
function itemSong(id: string): ItemSong | null {
  const s = songs.get(id) || EXERCISES.find((x) => x.id === id);
  if (!s) return null;
  const key = [s.title, s.taal, s.tempo, prefs.script, s.text].join('\u0000');
  const had = itemSongs.get(id);
  if (had && had.key === key) return had.song;
  const P = parseSong(s.text);
  const song: ItemSong = { tempo: s.tempo, lineBeats: P.noteLines.map((l) => l.beats.length), cycle: taalInfo(s.taal).cycle, labels: lineLabels(P), title: s.title };
  itemSongs.set(id, { key, song });
  return song;
}

function tick(): void {
  if (!T) return;
  T.tick();
  if (T.endAt && timer) {
    clearInterval(timer);
    timer = 0;
  }
}

/** Each frame: show the latest beat whose time has come, allowing for output latency (Bluetooth). */
function frame(): void {
  if (!T || !T.playing) return;
  const ctx = T.E.ctx as AudioContext;
  const now = ctx.currentTime - ((ctx.outputLatency || 0) + (ctx.baseLatency || 0));
  const cur = T.takeDue(now);
  if (cur) {
    if ('end' in cur) {
      if (run) run.end = cur.time;
      clearHighlight();
      markTaal(cur.p);
      setNowMessage('Finished', 'Press play to sing it again, or tap a line to start there.');
    } else {
      trackRun(cur, ctx.currentTime);
      showBeat(cur);
    }
  }
  if (T.endAt && ctx.currentTime >= T.endAt) {
    stop(true, true);
    return;
  }
  raf = requestAnimationFrame(frame);
}

async function wake(): Promise<void> {
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}
function unwake(): void {
  try {
    if (wakeLock) void wakeLock.release();
  } catch {
    // already released
  }
  wakeLock = null;
}

// ── Practice log: each play is logged when it stops, if it ran long enough ───

interface Run {
  song: string;
  title: string;
  from: number;
  to: number;
  loop: boolean;
  tempo: number;
  top: number;
  /** AudioContext time of the first beat after the count-in (0 until it sounds), and the
   * wall-clock time it matches. */
  first: number;
  wall: number;
  /** Furthest round and line reached; when the song ended, the time it did. */
  pass: number;
  line: number;
  end: number;
}
let run: Run | null = null;

function startRun(from: number, to: number, loop: boolean): void {
  run = { song: current.id, title: current.title, from, to, loop, tempo: songSource.tempo, top: songSource.tempo, first: 0, wall: 0, pass: 0, line: from, end: 0 };
}

/** A beat is showing: note how far the practice has got. */
function trackRun(q: BeatEntry, ctxNow: number): void {
  if (!run || q.pass < 0) return;
  if (!run.first) {
    run.first = q.time;
    run.wall = Date.now() - (ctxNow - q.time) * 1000;
  }
  run.pass = Math.max(run.pass, q.pass);
  run.top = Math.max(run.top, q.tempo);
  run.line = Math.max(run.line, parsed.lineOfBeat[q.s] ?? 0);
}

/** Playing stopped at AudioContext time `at`: log it, with any pitch scores, unless it was
 * only a quick listen. */
function endRun(at: number, pitch: { score: number; lines: [number, number][] } | null): void {
  const r = run;
  run = null;
  if (!r || !r.first) return;
  const secs = (r.end || at) - r.first;
  if (secs < MIN_LOG_SECS) return;
  const e: LogEntry = {
    at: Math.round(r.wall), secs: Math.round(secs), song: r.song, title: r.title,
    from: r.from, to: r.loop ? r.to : r.line, loop: r.loop, rounds: r.loop ? r.pass + 1 : 1, tempo: r.tempo, top: r.top,
  };
  if (pitch) {
    e.score = pitch.score;
    e.lines = pitch.lines;
  }
  if (rewaz.active) e.routine = rewaz.name;
  if (logStore.add(e) === 'ok') {
    practised.set(e.song, e.at);
    songsView.render();
    progressView.render();
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────

function renderSheets(): void {
  const html = V.sheetHTML(parsed, taal, startOff(), current.example, prefs.script);
  $('#sheetP').innerHTML = html;
  $('#sheetE').innerHTML = html;
  beatEls.clear();
  for (const el of $$('.beat[data-b]')) {
    const g = +el.dataset.b!;
    if (!beatEls.has(g)) beatEls.set(g, []);
    beatEls.get(g)!.push(el);
  }
  curEls = [];
}

function renderTaal(): void {
  $('#taalName').textContent = V.taalName(taal);
  $('#taalSub').textContent = V.taalSub(taal);
  $('#taalStrip').innerHTML = V.taalStripHTML(taal, (p) => beatLabel(prefs.beat, taal.id, SPEEDS[prefs.speed] || 1, p));
}

function markTaal(p: number): void {
  for (const el of $$('.tb')) el.classList.toggle('on', +el.dataset.p! === p);
}
function clearHighlight(): void {
  for (const el of curEls) el.classList.remove('now');
  curEls = [];
}
function highlight(g: number): void {
  clearHighlight();
  curEls = beatEls.get(g) || [];
  for (const el of curEls) el.classList.add('now');
  const ln = parsed.lineOfBeat[g];
  if (ln !== lastLine) {
    lastLine = ln ?? -1;
    for (const sheet of [$('#sheetP'), $('#sheetE')]) {
      if (!sheet.offsetParent) continue;
      const row = sheet.querySelector<HTMLElement>('.line[data-n="' + ln + '"]');
      if (!row) continue;
      const top = row.offsetTop;
      const bot = top + row.offsetHeight;
      if (top < sheet.scrollTop || bot > sheet.scrollTop + sheet.clientHeight) {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        sheet.scrollTo({ top: Math.max(0, top - 24), behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }
}

function setNow(v: V.NowView): void {
  $('#nowLab').textContent = v.label;
  $('#bigNote').innerHTML = v.big;
  $('#bigLy').innerHTML = v.ly;
  if (v.next != null) $('#nextStrip').innerHTML = v.next;
}
function setNowMessage(label: string, sub: string, big = ''): void {
  setNow(V.nowMessage(label, sub, big));
}
function showBeat(q: BeatEntry): void {
  markTaal(q.p);
  if (q.pass < 0) clearHighlight();
  else highlight(q.s);
  const v = V.nowBeat(parsed, q, T!, prefs.ramp, soundSource.guide, prefs.script);
  if (v) setNow(v);
  rewaz.beat(q.pass);
}
function showIdle(): void {
  markTaal(-1);
  setNow(V.nowIdle(parsed, taal, +select('#fromLine').value || 0, current.example, prefs.countIn, prefs.script));
}

function renderLineSelects(keep: boolean): void {
  const L = parsed.noteLines;
  const prevFrom = keep ? +select('#fromLine').value || 0 : 0;
  const prevTo = keep ? +select('#toLine').value : L.length - 1;
  const opts = V.lineOptionsHTML(parsed, prefs.script);
  select('#fromLine').innerHTML = opts;
  select('#toLine').innerHTML = opts;
  select('#fromLine').value = String(clamp(prevFrom, 0, Math.max(0, L.length - 1)));
  select('#toLine').value = String(clamp(isNaN(prevTo) ? L.length - 1 : prevTo, 0, Math.max(0, L.length - 1)));
}

let issueList: V.IssueTarget[] = [];
function renderIssues(): void {
  const r = V.issuesHTML(parsed, taal, startOff(), prefs.script);
  issueList = r.list;
  $('#issues').innerHTML = r.html;
}
function issueRange(it: V.IssueTarget): [number, number] | null {
  if (it.kind === 'octave') return [it.notes[0]!.cs, it.notes[it.notes.length - 1]!.ce];
  const a = parsed.beatList[it.g];
  const b = parsed.beatList[it.g2];
  return a && b ? [a.a, b.b] : null;
}

function renderNoteButtons(): void {
  $('#noteBtns').innerHTML = V.noteButtonsHTML(insOct, prefs.script);
}
function renderStartOn(): void {
  $('#startOn').innerHTML = V.startOnOptionsHTML(taal);
  current.startOn = clamp(current.startOn, 1, taal.cycle);
  select('#startOn').value = String(current.startOn);
}
const ownSongs = () => Array.from(songs.values()).sort((a, b) => a.title.localeCompare(b.title));
/** The song picker, and the Songs view when it is showing. */
function renderLibrary(): void {
  select('#songSel').innerHTML = V.libraryHTML(ownSongs(), EXERCISES);
  if (current) select('#songSel').value = current.id;
  songsView.render();
}
function setPlayUI(on: boolean): void {
  const b = $('#playBtn');
  b.classList.toggle('on', on);
  b.setAttribute('aria-label', on ? 'Stop' : 'Play');
}
function renderLayerChips(): void {
  const r = V.layerChipsHTML(prefs.beat, layersOf(prefs.beat) || []);
  $('#layerRow').hidden = r.hidden;
  $('#layerChips').innerHTML = r.html;
}
function setSeg(id: string, v: string | number): void {
  for (const b of $$('#' + id + ' button')) b.setAttribute('aria-pressed', String(b.dataset.v === String(v)));
}

/** The Sound bar: what the folded settings are set to, and whether they are showing. */
function renderSoundSummary(): void {
  $('#soundSum').textContent = V.soundSummary(prefs);
}
function setSoundOpen(open: boolean): void {
  $('#soundBtn').setAttribute('aria-expanded', String(open));
  $('#mixer').hidden = !open;
  $('#soundAct').textContent = open ? 'Done' : 'Change';
}

// ── Song loading and editing ─────────────────────────────────────────────────

function reparse(keepLines: boolean): void {
  parsed = parseSong(current.text);
  taal = taalInfo(current.taal);
  renderSheets();
  renderLineSelects(keepLines);
  renderIssues();
  renderTaal();
  refreshSelection();
  if (!playing()) showIdle();
}

function loadSong(song: Song | Exercise): void {
  flushNow();
  stop(true);
  if (!runnerLoading) {
    rewaz.cancel();
    clearOverride();
  }
  current = normalize(song);
  if (song.example) current.example = true;
  prefs.lastSong = current.id;
  savePrefs();
  $('#songTitle').innerHTML = V.esc(current.title) + (current.example ? '<span class="tag">Exercise</span>' : '');
  input('#titleIn').value = current.title;
  input('#tagsIn').value = (current.tags || []).join(', ');
  $('#tagsF').hidden = current.example;
  notationBox().value = current.text;
  input('#tempoNum').value = String(current.tempo);
  input('#tempoRange').value = String(current.tempo);
  select('#saKey').value = String(current.saKey);
  select('#saOct').value = String(current.saOct);
  select('#taalSel').value = current.taal;
  taal = taalInfo(current.taal);
  renderStartOn();
  $('#exNote').hidden = !current.example;
  $('#delBtn').hidden = current.example;
  $('#delConfirm').hidden = true;
  select('#songSel').value = current.id;
  selTouched = false;
  reparse(false);
  songsView.render();
}

function changed<K extends keyof Song>(field: K, value: Song[K]): void {
  current[field] = value;
  if (current.example) return;
  current.updatedAt = Date.now();
  songs.set(current.id, { ...current });
  queueSave();
}

// ── Saving ───────────────────────────────────────────────────────────────────

let saveTimer = 0;
let dirty = false;
function setStatus(t: string): void {
  $('#saveStatus').textContent = t;
}
const saveError = (r: WriteResult) =>
  r === 'full' ? 'Not saved: song storage is full. Delete a song you no longer need.' : 'Not saved. This browser blocks storage.';

function queueSave(): void {
  dirty = true;
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 900);
}
function flushNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    flush();
  }
}
function flush(): void {
  saveTimer = 0;
  if (!current || current.example) return;
  const s = { ...current };
  dirty = false;
  writeSongs([s]);
}
function writeSongs(list: Song[]): void {
  if (store.mode === 'memory') {
    setStatus('Not saved. Storage is unavailable in this view.');
    return;
  }
  const r = store.save(list);
  setStatus(r === 'ok' ? 'Saved in this browser' : saveError(r));
}
function removeSong(id: string): void {
  songs.delete(id);
  if (store.mode === 'local') {
    const r = store.remove(id);
    setStatus(r === 'ok' ? 'Deleted' : saveError(r));
  }
}
function createSong(base: Partial<Song>): Song {
  const s = normalize({ ...base, id: newId(), updatedAt: Date.now() });
  s.example = false;
  songs.set(s.id, s);
  writeSongs([s]);
  userPicked = true;
  renderLibrary();
  loadSong(s);
  return s;
}

/** Star or unstar one of the user's songs (the open one through its usual save). */
function setFav(id: string, fav: boolean): void {
  if (current.id === id && !current.example) {
    changed('fav', fav || undefined);
    flushNow();
  } else {
    const s = songs.get(id);
    if (!s) return;
    const n: Song = { ...s, updatedAt: Date.now() };
    if (fav) n.fav = true;
    else delete n.fav;
    songs.set(id, n);
    writeSongs([n]);
  }
  renderLibrary();
}

function newSong(): void {
  createSong({ title: 'Untitled song', taal: 'dadra', tempo: 100, saKey: current.saKey, saOct: current.saOct, startOn: 1, text: '# স্থায়ী\n' });
  switchTab('edit');
  const t = input('#titleIn');
  t.focus();
  t.select();
}

function initStore(): void {
  songs = store.load();
  if (!userPicked && songs.has(wanted)) loadSong(songs.get(wanted)!);
  renderLibrary();
  if (store.mode === 'memory') setStatus('Songs you add will last until you close this page.');
  window.addEventListener('storage', (e) => {
    if (SongStore.isSongKey(e.key)) syncFromStorage();
    if (LogStore.isLogKey(e.key)) {
      practised = lastPractised(logStore.load());
      songsView.render();
      progressView.render();
    }
    if (RoutineStore.isRoutineKey(e.key)) rewaz.render();
  });
}

/** Songs saved in another tab: take them in, keeping unsaved edits here, and reload the
 * open song if it changed there while untouched here. */
function syncFromStorage(): void {
  const m = store.load();
  if (current && !current.example && !m.has(current.id) && (dirty || saveTimer)) m.set(current.id, { ...current });
  songs = m;
  if (current && !current.example && m.has(current.id) && !dirty && !saveTimer) {
    const r = m.get(current.id)!;
    if (r.updatedAt > (current.updatedAt || 0) && document.activeElement !== notationBox() && document.activeElement !== input('#titleIn')) loadSong(r);
  }
  renderLibrary();
}

// ── Octave fixing in the editor ──────────────────────────────────────────────

let selTouched = false;
let selEls: HTMLElement[] = [];
const finePointer = () => matchMedia('(pointer:fine)').matches;

function refreshSelection(): void {
  for (const el of selEls) el.classList.remove('sel');
  selEls = [];
  const info = $('#selInfo');
  if (!info) return;
  if (!selTouched) {
    info.textContent = 'Tap a beat in the preview, or select notes in the box';
    return;
  }
  const ta = notationBox();
  const r = notesInRange(parsed, ta.selectionStart, ta.selectionEnd);
  const ns = new Set<Unit>(r.notes);
  const beats: Beat[] = [];
  for (const b of parsed.beatList) if (b && b.units.some((u) => ns.has(u))) beats.push(b);
  for (const b of beats) {
    for (const el of beatEls.get(b.g) || []) {
      if (el.closest('#sheetE')) {
        el.classList.add('sel');
        selEls.push(el);
      }
    }
  }
  if (!r.notes.length) {
    info.textContent = 'No notes selected. Tap a beat in the preview.';
    return;
  }
  const lines = Array.from(new Set(beats.map((b) => parsed.lineOfBeat[b.g]! + 1)));
  const where = lines.length === 1 ? 'line ' + lines[0] : 'lines ' + lines[0] + '–' + lines[lines.length - 1];
  if (r.notes.length === 1) info.innerHTML = '<b>' + V.beatNoteHTML({ units: [r.notes[0]!] }, prefs.script) + '</b> · ' + where;
  else info.textContent = r.notes.length + ' notes · ' + where;
}

function scrollTextareaTo(ta: HTMLTextAreaElement, pos: number): void {
  const cs = getComputedStyle(ta);
  const lh = parseFloat(cs.lineHeight) || 30;
  const line = ta.value.slice(0, pos).split('\n').length - 1;
  const y = line * lh;
  if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - lh * 2) ta.scrollTop = Math.max(0, y - ta.clientHeight / 3);
}

function applyOctave(delta: number): void {
  const ta = notationBox();
  if (!selTouched) {
    $('#selInfo').textContent = 'Tap a beat in the preview first, then press ' + (delta > 0 ? '↑' : '↓') + '.';
    return;
  }
  const r = shiftOctaves(ta.value, ta.selectionStart, ta.selectionEnd, delta);
  if (!r.count) {
    $('#selInfo').textContent = r.capped
      ? delta > 0
        ? 'Already two octaves up, the highest the player goes.'
        : 'Already two octaves down, the lowest the player goes.'
      : 'No notes selected. Tap a beat in the preview.';
    return;
  }
  applyTextEdit(r);
}

/** Write an edit into the notation box. With a mouse it goes through the browser's own
 * typing, so Ctrl+Z undoes it. */
function applyTextEdit(r: TextEdit): void {
  const ta = notationBox();
  let done = false;
  if (finePointer()) {
    try {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(r.lo, r.hi);
      done = document.execCommand('insertText', false, r.rep);
    } catch {
      done = false;
    }
    if (done && ta.value !== r.text) {
      ta.value = r.text;
      done = false;
    }
  }
  if (!done) ta.value = r.text;
  ta.setSelectionRange(r.s, r.e);
  if (!done) ta.dispatchEvent(new Event('input', { bubbles: true }));
  reparse(true);
}

function applyBeatEdit(kind: 'join' | 'split'): void {
  const ta = notationBox();
  if (!selTouched) {
    $('#selInfo').textContent = 'Tap a beat in the preview first, then press ' + (kind === 'join' ? 'Join' : 'Split') + '.';
    return;
  }
  const r = (kind === 'join' ? joinBeats : splitBeats)(ta.value, ta.selectionStart, ta.selectionEnd);
  if (!r.ok) {
    $('#selInfo').textContent = r.msg;
    return;
  }
  applyTextEdit(r);
}

// ── Song files: export, back up, import ──────────────────────────────────────

function setFileStatus(t: string, where = '#fileStatus'): void {
  $(where).textContent = t;
}
const setLibStatus = (t: string) => setFileStatus(t, '#libStatus');
const today = () => new Date().toISOString().slice(0, 10);

/** Save a file the ordinary way; inside a frame that may block downloads, copy it instead. */
async function offerFile(name: string, text: string, say: (t: string) => void = setFileStatus): Promise<void> {
  let framed = true;
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true;
  }
  if (!framed) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say('Saved ' + name);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    say('Copied the song file to the clipboard. Paste it into a text file to keep it.');
  } catch {
    say('Export is not available in this view.');
  }
}

async function importFiles(files: File[]): Promise<void> {
  const found: ImportedSong[] = [];
  const problems: string[] = [];
  for (const f of files) {
    if (f.size > IMPORT_LIMITS.fileBytes) {
      problems.push(f.name + ' is too large');
      continue;
    }
    let txt: string;
    try {
      txt = await f.text();
    } catch {
      problems.push(f.name + ' could not be read');
      continue;
    }
    const got = songsFromFile(txt, f.name);
    if (got.length) found.push(...got);
    else problems.push(f.name + ' has no songs the player can read');
  }
  if (!found.length) {
    setLibStatus(problems.join('. ') || 'Nothing to import.');
    return;
  }
  const list = found.slice(0, IMPORT_LIMITS.songs);
  const made = list.map((s) => {
    const n = normalize({ ...s, id: newId(), updatedAt: Date.now() });
    n.example = false;
    return n;
  });
  for (const n of made) songs.set(n.id, n);
  writeSongs(made);
  userPicked = true;
  renderLibrary();
  loadSong(made[0]!);
  setLibStatus('Imported ' + list.length + ' song' + (list.length === 1 ? '' : 's') + (found.length > list.length ? ' (the first 200)' : '') + (problems.length ? '. ' + problems.join('. ') : '.'));
}

// ── Wiring ───────────────────────────────────────────────────────────────────

function insertText(txt: string): void {
  const ta = notationBox();
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const v = ta.value;
  let pre = '';
  if (txt !== '\n' && !txt.startsWith('\n') && s > 0 && !/\s/.test(v[s - 1]!)) pre = ' ';
  const ins = pre + txt;
  ta.value = v.slice(0, s) + ins + v.slice(e);
  const p = s + ins.length;
  ta.setSelectionRange(p, p);
  if (matchMedia('(pointer:fine)').matches) ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function tokenFor(semi: number): string {
  if (prefs.script === 'bn') return (insOct < 0 ? '.' : '') + (insOct > 0 ? 'র্' : '') + V.BN_NAMES[semi] + AKAR + ' ';
  return (insOct < 0 ? '.' : '') + V.LAT_CODE[semi] + (insOct > 0 ? "'" : '') + ' ';
}
const TAB_BUTTONS: Record<Tab, string> = { practice: '#tabPractice', edit: '#tabEdit', songs: '#tabSongs', rewaz: '#tabRewaz', progress: '#tabProgress' };
function switchTab(t: Tab): void {
  prefs.tab = t;
  savePrefs();
  for (const v of TABS) {
    $('#' + v).hidden = v !== t;
    $(TAB_BUTTONS[v]).setAttribute('aria-selected', String(v === t));
  }
  lastLine = -1;
  songsView.render();
  rewaz.render();
  progressView.render();
}
/** The tempo shown on the deck: a rewaz item's while one plays, else the song's. */
const shownTempo = () => itemOverride?.tempo ?? current.tempo;
function setTempo(v: number | string): void {
  const t = clamp(Math.round(+v || 100), 30, 240);
  showTempo(t);
  if (itemOverride && rewaz.active) {
    itemOverride.tempo = t;
    return;
  }
  if (t !== current.tempo) changed('tempo', t);
}
/** The clicked button inside a segmented control. */
const segButton = (e: Event) => (e.target as Element).closest<HTMLElement>('button');

export function init(): void {
  select('#saKey').innerHTML = V.keyOptionsHTML();
  select('#saOct').innerHTML = V.octOptionsHTML();
  select('#taalSel').innerHTML = V.taalOptionsHTML();
  setSeg('guideSeg', prefs.guide);
  setSeg('beatSeg', prefs.beat);
  setSeg('scriptSeg', prefs.script);
  setSeg('octSeg', insOct);
  setSeg('reedSeg', prefs.reeds);
  setSeg('speedSeg', prefs.speed);
  input('#fillsChk').checked = !!prefs.fills;
  input('#tablaVol').value = String(prefs.tablaVol);
  input('#droneVol').value = String(prefs.droneVol);
  input('#countIn').checked = !!prefs.countIn;
  setSeg('droneSeg', prefs.droneType);
  select('#tanTune').value = prefs.tanTune;
  select('#tanTune').hidden = prefs.droneType !== 'tanpura';
  setSeg('guideLoopSeg', prefs.guideLoop);
  input('#rampChk').checked = !!prefs.ramp;
  select('#rampStep').value = String(prefs.rampStep);
  input('#rampMax').value = String(prefs.rampMax);
  renderLayerChips();
  renderNoteButtons();
  renderSoundSummary();
  setSoundOpen(prefs.soundOpen ?? matchMedia('(min-width: 861px)').matches);
  songsView = initSongs({
    ownSongs,
    exercises: EXERCISES,
    currentId: () => current.id,
    practisedAt: (id) => practised.get(id) ?? 0,
    sort: () => prefs.libSort,
    setSort: (s) => {
      prefs.libSort = s;
      savePrefs();
    },
    open: (id, tab) => {
      const s = songs.get(id) || EXERCISES.find((x) => x.id === id);
      if (!s) return;
      userPicked = true;
      if (s.id !== current.id) loadSong(s);
      switchTab(tab);
    },
    setFav,
  });
  pitchUI = initPitch({
    audio: () => {
      try {
        const ctx = ensureAudio().E.ctx as AudioContext;
        if (ctx.state !== 'running') void ctx.resume();
        return ctx;
      } catch {
        return null;
      }
    },
    saHz: () => saFreq(current),
    script: () => prefs.script,
    parsed: () => parsed,
    beatEls: (g) => beatEls.get(g) || [],
    section: () => (T && T.playing ? { secStart: T.secStart, secEnd: T.secEnd, loop: T.loop, listen: T.loop && soundSource.guideLoop === 'alt' && soundSource.guide !== 'off' } : null),
    octave: {
      get: () => !!prefs.pitchOctave,
      set: (v) => {
        if (v) prefs.pitchOctave = true;
        else delete prefs.pitchOctave;
        savePrefs();
      },
    },
    lag: {
      get: () => prefs.pitchLag,
      set: (v) => {
        prefs.pitchLag = v;
        savePrefs();
      },
    },
  });
  rewaz = initRewaz({
    choices: () => ({ own: ownSongs(), exercises: EXERCISES }),
    song: itemSong,
    countIn: () => !!prefs.countIn,
    currentSongId: () => current.id,
    routines: () => routineStore.load(),
    save: (r) => routineStore.save(r),
    remove: (id) => routineStore.remove(id),
    selected: {
      get: () => prefs.rewazId,
      set: (id) => {
        prefs.rewazId = id;
        savePrefs();
      },
    },
    play: playItem,
    stop: () => stop(),
    playing,
    showPractice: () => switchTab('practice'),
  });
  progressView = initProgress({
    log: () => logStore.load(),
    title: (id) => (songs.get(id) || EXERCISES.find((x) => x.id === id))?.title ?? null,
    exportLog: () => {
      const d = today();
      void offerFile('gaaner-sathi-practice-log-' + d + '.json', logFileText(logStore.load(), d), (t) => setFileStatus(t, '#pgStatus'));
    },
  });
  const startSong = EXERCISES.find((e) => e.id === wanted) || EXERCISES[0]!;
  loadSong(startSong);
  renderLibrary();
  switchTab(prefs.tab);

  $('#playBtn').addEventListener('click', userToggle);
  $('#tDown').addEventListener('click', () => setTempo(shownTempo() - 4));
  $('#tUp').addEventListener('click', () => setTempo(shownTempo() + 4));
  input('#tempoRange').addEventListener('input', (e) => setTempo((e.target as HTMLInputElement).value));
  input('#tempoNum').addEventListener('change', (e) => setTempo((e.target as HTMLInputElement).value));
  select('#saKey').addEventListener('change', (e) => {
    changed('saKey', +(e.target as HTMLSelectElement).value);
    T?.retune();
  });
  select('#saOct').addEventListener('change', (e) => {
    const v = +(e.target as HTMLSelectElement).value;
    changed('saOct', v === 3 || v === 5 ? v : 4);
    T?.retune();
  });
  select('#fromLine').addEventListener('change', () => {
    if (+select('#toLine').value < +select('#fromLine').value) select('#toLine').value = select('#fromLine').value;
    if (playing()) play();
    else showIdle();
  });
  select('#toLine').addEventListener('change', () => {
    if (+select('#toLine').value < +select('#fromLine').value) select('#fromLine').value = select('#toLine').value;
    input('#loopChk').checked = true;
    if (playing()) play();
    else showIdle();
  });
  input('#loopChk').addEventListener('change', () => {
    if (playing()) play();
  });

  $('#soundBtn').addEventListener('click', () => {
    const open = !!$('#mixer').hidden;
    prefs.soundOpen = open;
    savePrefs();
    setSoundOpen(open);
  });
  $('#guideSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.guide = b.dataset.v as typeof prefs.guide;
    savePrefs();
    setSeg('guideSeg', prefs.guide);
    T?.applyGuide();
  });
  $('#beatSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.beat = b.dataset.v as typeof prefs.beat;
    savePrefs();
    setSeg('beatSeg', prefs.beat);
    renderTaal();
    renderLayerChips();
    T?.applyBeatLevel();
  });
  $('#reedSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.reeds = +b.dataset.v! as typeof prefs.reeds;
    savePrefs();
    setSeg('reedSeg', prefs.reeds);
    T?.applyReeds();
  });
  $('#speedSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.speed = b.dataset.v as typeof prefs.speed;
    savePrefs();
    setSeg('speedSeg', prefs.speed);
    renderTaal();
  });
  input('#fillsChk').addEventListener('change', (e) => {
    prefs.fills = (e.target as HTMLInputElement).checked;
    savePrefs();
  });
  $('#layerChips').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-layer]');
    if (!b) return;
    const id = b.dataset.layer!;
    const st = prefs.beat;
    if (st !== 'tabla' && st !== 'dholak' && st !== 'kit') return;
    const list = new Set(prefs.layers[st] || []);
    if (list.has(id)) list.delete(id);
    else list.add(id);
    prefs.layers[st] = Array.from(list);
    savePrefs();
    renderLayerChips();
  });
  $('#droneSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.droneType = b.dataset.v as typeof prefs.droneType;
    savePrefs();
    setSeg('droneSeg', prefs.droneType);
    select('#tanTune').hidden = prefs.droneType !== 'tanpura';
    if (prefs.droneVol <= 0) {
      prefs.droneVol = 0.5;
      input('#droneVol').value = '0.5';
      savePrefs();
    }
    T?.applyDrone();
  });
  select('#tanTune').addEventListener('change', (e) => {
    prefs.tanTune = (e.target as HTMLSelectElement).value as typeof prefs.tanTune;
    savePrefs();
    T?.resetTanpura();
  });
  $('#guideLoopSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.guideLoop = b.dataset.v as typeof prefs.guideLoop;
    savePrefs();
    setSeg('guideLoopSeg', prefs.guideLoop);
  });
  input('#rampChk').addEventListener('change', (e) => {
    prefs.ramp = (e.target as HTMLInputElement).checked;
    savePrefs();
    if (prefs.ramp && !input('#loopChk').checked) input('#loopChk').checked = true;
  });
  select('#rampStep').addEventListener('change', (e) => {
    prefs.rampStep = +(e.target as HTMLSelectElement).value || 4;
    savePrefs();
  });
  input('#rampMax').addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    prefs.rampMax = clamp(Math.round(+el.value || 160), 30, 240);
    el.value = String(prefs.rampMax);
    savePrefs();
  });
  input('#tablaVol').addEventListener('input', (e) => {
    prefs.tablaVol = +(e.target as HTMLInputElement).value;
    savePrefs();
    T?.applyBeatLevel();
  });
  input('#droneVol').addEventListener('input', (e) => {
    prefs.droneVol = +(e.target as HTMLInputElement).value;
    savePrefs();
    T?.applyDrone();
  });
  input('#countIn').addEventListener('change', (e) => {
    prefs.countIn = (e.target as HTMLInputElement).checked;
    savePrefs();
    if (!playing()) showIdle();
  });

  $('#tabPractice').addEventListener('click', () => switchTab('practice'));
  $('#tabEdit').addEventListener('click', () => switchTab('edit'));
  $('#tabSongs').addEventListener('click', () => switchTab('songs'));
  $('#tabRewaz').addEventListener('click', () => switchTab('rewaz'));
  $('#tabProgress').addEventListener('click', () => switchTab('progress'));
  $('#scriptSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.script = b.dataset.v === 'lat' ? 'lat' : 'bn';
    savePrefs();
    setSeg('scriptSeg', prefs.script);
    renderSheets();
    renderLineSelects(true);
    renderNoteButtons();
    if (!playing()) showIdle();
  });

  select('#songSel').addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    const s = songs.get(id) || EXERCISES.find((x) => x.id === id);
    if (s) {
      userPicked = true;
      loadSong(s);
    }
  });
  $('#newBtn').addEventListener('click', newSong);
  $('#libNew').addEventListener('click', newSong);
  $('#copyBtn').addEventListener('click', () => {
    const title = current.example ? stripExamplePrefix(current.title) : current.title + ' (copy)';
    createSong({ ...current, title });
    switchTab('edit');
  });
  $('#delBtn').addEventListener('click', () => {
    $('#delConfirm').hidden = false;
    $('#delBtn').hidden = true;
    $('#delNo').focus();
  });
  $('#delNo').addEventListener('click', () => {
    $('#delConfirm').hidden = true;
    $('#delBtn').hidden = false;
  });
  $('#delYes').addEventListener('click', () => {
    if (current.example) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
    dirty = false;
    const id = current.id;
    removeSong(id);
    const next = Array.from(songs.values())[0] || EXERCISES[0]!;
    renderLibrary();
    loadSong(next);
  });

  input('#titleIn').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    changed('title', v.trim() ? v : 'Untitled song');
    $('#songTitle').innerHTML = V.esc(current.title) + (current.example ? '<span class="tag">Exercise</span>' : '');
    if (!current.example) renderLibrary();
  });
  input('#tagsIn').addEventListener('input', (e) => {
    const t = parseTags((e.target as HTMLInputElement).value);
    changed('tags', t.length ? t : undefined);
    if (!current.example) renderLibrary();
  });
  select('#taalSel').addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value;
    changed('taal', isTaalId(v) ? v : 'dadra');
    taal = taalInfo(current.taal);
    renderStartOn();
    reparse(true);
  });
  select('#startOn').addEventListener('change', (e) => {
    changed('startOn', +(e.target as HTMLSelectElement).value);
    reparse(true);
  });

  let parseTimer = 0;
  notationBox().addEventListener('input', (e) => {
    if (playing()) stop(true);
    rewaz.cancel();
    clearOverride();
    changed('text', (e.target as HTMLTextAreaElement).value);
    clearTimeout(parseTimer);
    parseTimer = window.setTimeout(() => reparse(true), 140);
  });
  $('#octSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    insOct = +b.dataset.v!;
    setSeg('octSeg', insOct);
    renderNoteButtons();
  });
  $('#noteBtns').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-semi]');
    if (b) insertText(tokenFor(+b.dataset.semi!));
  });
  $('#pal').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-ins]');
    if (!b) return;
    const k = b.dataset.ins;
    insertText(k === 'hold' ? '- ' : k === 'rest' ? 'x ' : k === 'bar' ? '| ' : k === 'nl' ? '\n' : '\n> ');
  });

  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.ln[data-n]');
    if (b) {
      const n = +b.dataset.n!;
      select('#fromLine').value = String(n);
      if (+select('#toLine').value < n) select('#toLine').value = String(n);
      userPlay(n);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    const t = e.target as Element | null;
    if (t && t.closest && t.closest('input,textarea,select,button,[contenteditable="true"]')) return;
    e.preventDefault();
    userToggle();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
    else if (playing() && !wakeLock) void wake();
  });
  // Leaving the page stops playing, so the practice so far is logged.
  window.addEventListener('pagehide', () => stop(true));

  // octave fixing
  const ta = notationBox();
  const touch = () => {
    selTouched = true;
    refreshSelection();
  };
  for (const ev of ['select', 'keyup', 'mouseup', 'touchend']) ta.addEventListener(ev, touch);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === ta) touch();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      applyOctave(e.key === 'ArrowUp' ? 1 : -1);
    }
  });
  $('#octUp').addEventListener('click', () => applyOctave(1));
  $('#octDown').addEventListener('click', () => applyOctave(-1));
  $('#joinBtn').addEventListener('click', () => applyBeatEdit('join'));
  $('#splitBtn').addEventListener('click', () => applyBeatEdit('split'));
  const selectRange = (s: number, en: number) => {
    selTouched = true;
    if (finePointer()) ta.focus({ preventScroll: true });
    ta.setSelectionRange(s, en);
    scrollTextareaTo(ta, s);
    refreshSelection();
  };
  $('#sheetE').addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('.beat[data-b]');
    if (!el) return;
    const b = parsed.beatList[+el.dataset.b!];
    if (!b) return;
    let s = b.a;
    let en = b.b;
    if (e.shiftKey && selTouched) {
      s = Math.min(s, ta.selectionStart);
      en = Math.max(en, ta.selectionEnd);
    }
    selectRange(s, en);
  });
  $('#issues').addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('button[data-act]');
    if (!btn) return;
    const it = issueList[+btn.dataset.i!];
    const r = it && issueRange(it);
    if (!it || !r) return;
    selectRange(r[0], r[1]);
    if (btn.dataset.act === 'show') {
      const row = $('#sheetE .beat[data-b="' + it.g + '"]');
      if (row) {
        const sh = $('#sheetE');
        sh.scrollTop = Math.max(0, row.offsetTop - 40);
      }
    } else if (btn.dataset.act === 'fix' && it.kind === 'octave') applyOctave(it.delta);
  });

  // song files
  $('#expBtn').addEventListener('click', () => {
    flushNow();
    void offerFile(fileName(stripExamplePrefix(current.title)), songFileText([current], today()));
  });
  $('#expAllBtn').addEventListener('click', () => {
    flushNow();
    const own = ownSongs();
    if (!own.length) {
      setLibStatus('You have no saved songs yet. Backups leave out the examples.');
      return;
    }
    const d = today();
    void offerFile('gaaner-sathi-songs-' + d + '.json', songFileText(own, d), setLibStatus);
  });
  $('#impBtn').addEventListener('click', () => input('#impFile').click());
  input('#impFile').addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    const files = Array.from(el.files || []);
    el.value = '';
    if (files.length) void importFiles(files);
  });

  initStore();
}

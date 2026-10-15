/**
 * The app's screen: everything on the page apart from the HTML builders in view.ts,
 * ported from the prototype's page script (reference/gaaner-sathi.html, from "State" to
 * the end). Names follow the prototype's, so the two read side by side.
 *
 * Changes from the prototype:
 * - The settings fold away behind bars that say what is on (Rinat kept this layout change,
 *   2026-10-10): the practice settings at the top of the Practice view, folded until the
 *   user unfolds them, then as they leave them; each song's sound in Edit notation (Rinat,
 *   2026-10-13).
 * - Songs and settings stay in this browser, with no claude.ai storage or downloads;
 *   store.ts explains how the prototype's saved songs are read. Changes saved in another
 *   tab show up here, as the claude.ai version's live sync did.
 * - Batch imports are saved in one write.
 *
 * Added since (docs/ROADMAP.md → Phase 1): the Music library (songs.ts), tags and favourites,
 * the practice log, written each time a song has been practised for a while, pitch
 * feedback from the microphone (pitch.ts), whose scores go into the log, rewaz routines
 * that play items one after another (rewaz.ts), the Progress view (progress.ts), and each
 * song's own sound: its harmonium, drone and rhythm, over the device's usual ones; day and
 * night colours; notes about each song; sections to jump between, each with its own tempo
 * if its heading gives one; and printing (print.ts).
 */
import { saFreq, saMidi } from '../audio/dsp/pitch';
import { wavFile } from '../audio/dsp/pcm';
import { createEngine, createLiveContext } from '../audio/engine';
import { MicError, micProblemText } from '../audio/mic';
import { Recorder } from '../audio/recorder';
import type { DroneType, GuideLevel, GuideLoop, SoundSettings } from '../audio/sound';
import { Transport, type BeatEntry, type PlaySource } from '../audio/transport';
import { EXERCISES } from '../core/exercises';
import type { Exercise } from '../core/exercises/types';
import { joinBeats, notesInRange, shiftOctaves, splitBeats, type TextEdit } from '../core/notation/edit';
import { parseSong } from '../core/notation/parse';
import { sectionOfLine, setHeadingTempo, songSections, type SongSection } from '../core/notation/sections';
import { AKAR } from '../core/notation/symbols';
import { oneTaal, taalMap, type Taals } from '../core/notation/taalmap';
import type { Beat, ParsedSong, Unit } from '../core/notation/types';
import { lastPractised, logFileText, MIN_LOG_SECS, type LogEntry } from '../core/practice/log';
import { songSpan } from '../core/pitch/voice';
import { itemLines, type RoutineItem } from '../core/practice/routine';
import { clockText, MIN_TAKE_SECS, newTakeId, textSig, type Take } from '../core/practice/take';
import { fileName, IMPORT_LIMITS, songFileText, songsFromFile, stripExamplePrefix, type ImportedSong } from '../core/song/file';
import { cleanDismissed, cleanNotes, newId, normalize, parseTags, type Song } from '../core/song/model';
import { SONG_SOUND_KEYS, soundOf, type SongSound } from '../core/song/sound';
import { isTaalId, taalInfo, TAALS, type TaalInfo } from '../core/taal/taals';
import { initPitch, type PitchUI } from './pitch';
import { initBoxes, withNewHeading, type Boxes } from './boxes';
import { initKeyboard, keyboardHTML, keyName, keyRange, type KeyboardUI } from './keyboard';
import { initLines, type LinesUI } from './lines';
import { initPrint } from './print';
import { initProgress } from './progress';
import { initRewaz, type ItemSong, type Rewaz } from './rewaz';
import { takeBuffer, takeFileName, takesHTML, TakeStore } from './takes';
import { initVoice, type SaChoice, type VoiceUI } from './voice';
import { initSongs, LIB_ORDER } from './songs';
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

// ── State ────────────────────────────────────────────────────────────────────

let songs = new Map<string, Song>(); // the user's own songs
let current!: Song; // the song being shown (set by init)
let parsed: ParsedSong = parseSong('');
/** The song's sections (its headings), worked out with each parse. */
let sections: SongSection[] = [];
let taal: TaalInfo = taalInfo('dadra');
/** Each beat's taal: the song's, or a section's own (taal pherta); worked out with each parse. */
let taals: Taals = oneTaal(taal, 0);
/** The taal the deck's strip shows. */
let stripTaal: TaalInfo | null = null;
let insOct = 0;
let userPicked = false;
const beatEls = new Map<number, HTMLElement[]>();
const store = new SongStore(storage);
const logStore = new LogStore(storage);
/** When each song was last practised, from the log. */
let practised = lastPractised(logStore.load());
/** The Songs view and pitch feedback, wired up by init. */
let songsView: { render(): void } = { render() {} };
let pitchUI: PitchUI = { on: false, startRun() {}, pause() {}, resume() {}, beat() {}, endRun: () => null };
/** Rewaz routines and the Progress view, wired up by init. */
let rewaz: Rewaz = { render() {}, active: false, name: '', finished() {}, cancel() {}, beat() {} };
let progressView: { render(): void } = { render() {} };
/** The Practice view's lines, wired up first by init (every parse draws them). */
let lines!: LinesUI;
/** A MIDI keyboard, wired up by init. */
let keyboard: KeyboardUI = { playStarting() {}, playStopped() {} };
/** The Voice view, wired up by init. */
let voiceUI: VoiceUI = { render() {}, stop() {} };
/** The editor's beat boxes, wired up by init. */
let boxes: Boxes = { refresh() {}, render() {}, beat: () => -1, type() {}, newLine() {}, showBeat() {}, undo: () => false, linePlaying() {}, markBeat() {} };
/** The notation box's pause before parsing while typing. */
let parseTimer = 0;
/** The editor shows beat boxes (unless the user chose free text) on the Edit view. */
const boxesMode = () => prefs.editMode !== 'text';
const boxesShown = () => boxesMode() && !$('#edit').hidden;
const routineStore = new RoutineStore(storage);
/** While a rewaz item plays: its own tempo and guide, over the song's and the settings'. */
let itemOverride: {
  tempo?: number;
  guide?: GuideLevel;
  guideLoop?: GuideLoop;
  /** A take playing back: the song's tempo then, and its count-in and tempo trainer. */
  baseTempo?: number;
  countIn?: boolean;
  ramp?: boolean;
  rampStep?: number;
  rampMax?: number;
} | null = null;
/** Set while the rewaz itself opens a song, which must not stop the rewaz. */
let runnerLoading = false;

// ── Transport: one clock drives the rhythm, the melody and the highlight ─────

let T: Transport | null = null; // made on the first Play: browsers start audio only after a tap
let timer = 0;
let raf = 0;
let curEls: HTMLElement[] = [];
let lastLine = -1;
/** The song beat showing while playing (−1 before the first), for the deck's tempo. */
let deckBeat = -1;
let wakeLock: WakeLockSentinel | null = null;
const playing = () => !!T && T.playing;

/** What to play: lines `from` to `to`, looped (for `rounds` rounds, if given) or on to the
 * end of the song; `check`: the editor's quick listen to one line. Nothing that plays changes
 * the Lines to practise pickers; only the deck's Play plays them (Rinat, 2026-10-12). */
interface PlayAsk {
  from: number;
  to: number;
  loop: boolean;
  rounds?: number;
  check?: boolean;
}
/** What is playing, as asked (for Pause). */
let asked: PlayAsk | null = null;
/** Paused: what was playing, and the beat and round to go on from (null: from its start). */
let paused: { ask: PlayAsk; at: { s: number; pass: number } | null } | null = null;
/** Playing, or paused. */
const active = () => playing() || !!paused;
/** The beat showing, for Pause. */
let shownQ: BeatEntry | null = null;

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
/** The sound settings for the open song: its own harmonium, drone and rhythm, else the
 * device's usual ones; the practice settings (the guide's level among them) are always the
 * device's. */
const sound = new Proxy<SoundSettings>(prefs, {
  get(t, k) {
    const own = current?.sound;
    return own && SONG_SOUND_KEYS.includes(k as keyof SongSound) && Object.hasOwn(own, k) ? own[k as keyof SongSound] : Reflect.get(t, k);
  },
});
/** The sound settings as played: a rewaz item's guide over the open song's. */
const soundSource = new Proxy<SoundSettings>(prefs, {
  get(_t, k) {
    if (k === 'guide' && itemOverride?.guide) return itemOverride.guide;
    if (k === 'guideLoop' && itemOverride?.guideLoop) return itemOverride.guideLoop;
    if ((k === 'countIn' || k === 'ramp' || k === 'rampStep' || k === 'rampMax') && itemOverride && itemOverride[k] != null) return itemOverride[k];
    return Reflect.get(sound, k);
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
  tempoAt: (s) => baseTempoAt(s),
  taalAt: (s) => taals.beat(s),
};

/** The tempo a song beat plays at before the tempo trainer: a rewaz item's, else its
 * section's own, else the song's. */
function baseTempoAt(s: number): number {
  if (itemOverride?.tempo) return itemOverride.tempo;
  return sections[sectionOfLine(sections, parsed.lineOfBeat[s] ?? -1)]?.tempo ?? itemOverride?.baseTempo ?? current.tempo;
}

function ensureAudio(): Transport {
  if (!T) {
    T = new Transport(createEngine(createLiveContext()));
    T.onBeat = (q, spb) => {
      if (runFirst < 0) runFirst = q.time;
      pitchUI.beat(q, spb);
    };
  }
  return T;
}

/** The Lines to practise, as the deck's pickers show them. */
function pickedLines(): PlayAsk {
  const last = Math.max(0, parsed.noteLines.length - 1);
  const from = clamp(+select('#fromLine').value || 0, 0, last);
  return { from, to: Math.max(from, clamp(+select('#toLine').value || 0, 0, last)), loop: input('#loopChk').checked };
}

/** Play what is asked (the Lines to practise unless told otherwise). `at` goes on from a
 * paused beat. A check of one line leaves the log, takes and pitch scores alone. */
function play(ask: PlayAsk = pickedLines(), at: { s: number; pass: number } | null = null): void {
  if (!parsed.noteLines.length) {
    showMessage('No notes to play yet: open Edit notation and type a line from your diary.');
    return;
  }
  let tr: Transport;
  try {
    tr = ensureAudio();
  } catch (e) {
    showMessage('Sound is unavailable: ' + (e instanceof Error ? e.message : String(e)));
    return;
  }
  const ctx = tr.E.ctx as AudioContext;
  if (ctx.state !== 'running') void ctx.resume();
  voiceUI.stop();
  if (takePlay?.how === 'me') stopTakeAlone();
  // Something else playing, or paused, ends first (going on after a pause has cleared it).
  stop(true);
  const L = parsed.noteLines;
  const from = clamp(ask.from, 0, L.length - 1);
  const to = Math.max(from, clamp(ask.to, 0, L.length - 1));
  const loop = !!ask.check || ask.loop;
  lastLine = -1;
  deckBeat = -1;
  shownQ = null;
  // Before start: starting schedules the first beat, and pitch feedback must hear of it.
  if (!ask.check) {
    if (at) pitchUI.resume();
    else pitchUI.startRun();
  }
  keyboard.playStarting(tr);
  runFirst = -1;
  const r = tr.start(source, { from, to, loop, rounds: ask.rounds, at: at ?? undefined });
  if (!r) return;
  asked = { ...ask, from: r.from, to: r.to, loop };
  if (!ask.check && !at) {
    startRun(r.from, r.to, loop);
    startTakeRun(r.from, loop);
  }
  setPlayUI();
  // The figure shows the taal it starts in straightaway, not when the first beat sounds.
  const first = at ? taals.beat(at.s).T : taals.line(r.from).T;
  if (first.id !== stripTaal?.id) renderTaal(first);
  showMessage('');
  lines.current(at ? (parsed.lineOfBeat[at.s] ?? r.from) : r.from, r.pre > 0 ? 'In ' + r.pre : 'Now', true);
  timer = window.setInterval(tick, 25);
  raf = requestAnimationFrame(frame);
  void wake();
}

/** Stop playing, or end a pause. `ended`: the song or its rounds came to their end by
 * themselves. */
function stop(silent?: boolean, ended = false): void {
  if (!T || !active()) return;
  const wasPlaying = T.playing;
  paused = null;
  asked = null;
  shownQ = null;
  if (wasPlaying) endTakeRun(run?.end || T.E.ctx.currentTime, run);
  endRun(T.E.ctx.currentTime, pitchUI.endRun());
  if (wasPlaying) {
    T.stop();
    keyboard.playStopped();
  }
  clearInterval(timer);
  timer = 0;
  cancelAnimationFrame(raf);
  clearHighlight();
  lines.playhead(-1, 0);
  boxes.markBeat(-1);
  if (lineCheck >= 0 || fromHere >= 0) {
    lineCheck = -1;
    fromHere = -1;
    boxes.linePlaying(-1);
  }
  markTaal(-1);
  setPlayUI();
  unwake();
  deckBeat = -1;
  if (takePlay?.how === 'guide') {
    const src = takePlay.src;
    takePlay = null;
    takeBuf = null;
    try {
      src?.stop();
    } catch {
      // already stopped
    }
    void renderTakes();
  }
  if (!silent) showIdle();
  // A rewaz goes on to its next item when this one ended by itself; any other stop ends it.
  if (ended) rewaz.finished();
  else rewaz.cancel();
  if (!rewaz.active) clearOverride();
}

/** Pause: the sound stops where it is and the beat stays marked; Play goes on from that beat
 * (in the same round), Stop ends it. A take ends at the pause; the practice log counts the
 * time played, without the pause. Paused in the count-in, Play starts again. */
function pause(): void {
  if (!T || !T.playing || !asked) return;
  // In the moment after the song's end, there is nothing left to pause.
  if (T.endAt) {
    stop();
    return;
  }
  const now = T.E.ctx.currentTime;
  const q = shownQ;
  paused = { ask: asked, at: q && q.pass >= 0 ? { s: q.s, pass: q.pass } : null };
  asked = null;
  endTakeRun(now, run);
  if (run && run.seg) {
    run.done += now - run.seg;
    run.seg = 0;
  }
  pitchUI.pause(now);
  T.stop();
  keyboard.playStopped();
  clearInterval(timer);
  timer = 0;
  cancelAnimationFrame(raf);
  unwake();
  setPlayUI();
  if (lastLine >= 0) lines.current(lastLine, 'Paused', true);
}

/** Go on after a pause. */
function resume(): void {
  const p = paused;
  if (!p) return;
  paused = null;
  const keep = { line: lineCheck, from: fromHere };
  play(p.ask, p.at);
  if (!playing()) return;
  lineCheck = keep.line;
  fromHere = keep.from;
  if (keep.line >= 0) boxes.linePlaying(keep.line);
  else if (keep.from >= 0) boxes.linePlaying(keep.from, true);
}

/** The deck's play button and the space bar: play, pause, go on. Between the items of a
 * rewaz (nothing playing), it ends the rewaz. */
function userToggle(): void {
  if (playing()) pause();
  else if (paused) resume();
  else if (rewaz.active) {
    rewaz.cancel();
    clearOverride();
  } else play();
}
/** The deck's Stop button: stops playing, a pause, or a rewaz. */
function userStop(): void {
  stop();
  rewaz.cancel();
  clearOverride();
}
/** The line the editor's Play is playing on its own, and the line a "play from here" started
 * at, or −1. */
let lineCheck = -1;
let fromHere = -1;
/** The editor's Play on a line: that line once, at its tempo, with no count-in (or Stop). */
function playLine(n: number): void {
  const again = lineCheck === n && active();
  stop(true);
  rewaz.cancel();
  clearOverride();
  if (again) {
    showIdle();
    return;
  }
  // The text may have changed a moment ago (it is parsed after a pause while typing).
  clearTimeout(parseTimer);
  reparse(true);
  itemOverride = { countIn: false };
  play({ from: n, to: n, loop: true, rounds: 1, check: true });
  if (!playing()) {
    clearOverride();
    return;
  }
  lineCheck = n;
  boxes.linePlaying(n);
}

/** Play from line n to the end of the song, once (a line number on the sheet, or the
 * editor's "play from here"), ending any rewaz; the Lines to practise stay as they are. The
 * editor's button stops it again. */
function userPlay(n: number): void {
  const again = fromHere === n && active();
  stop(true);
  rewaz.cancel();
  clearOverride();
  if (again) {
    showIdle();
    return;
  }
  // From the editor, the text may have changed a moment ago.
  if (!$('#edit').hidden) {
    clearTimeout(parseTimer);
    reparse(true);
  }
  play({ from: n, to: parsed.noteLines.length - 1, loop: false });
  if (!playing()) return;
  fromHere = n;
  boxes.linePlaying(n, true);
}

function showTempo(t: number): void {
  input('#tempoNum').value = String(t);
  input('#tempoRange').value = String(t);
}
function clearOverride(): void {
  if (!itemOverride) return;
  itemOverride = null;
  if (current) showTempo(shownTempo());
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
  const g = it.guide;
  itemOverride = { tempo: it.tempo, guide: g === 'off' ? 'off' : g && sound.guide === 'off' ? 'full' : undefined, guideLoop: g && g !== 'off' ? g : undefined };
  showTempo(shownTempo());
  play({ from: a, to: b, loop: true, rounds: it.rounds });
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
      shownQ = null;
      lines.playhead(-1, 0);
      if (lastLine >= 0) lines.current(lastLine, 'Done', false);
      markTaal(cur.p);
    } else {
      trackRun(cur, ctx.currentTime);
      showBeat(cur);
    }
  }
  // The playhead moves through the beat sounding, and the taal figure's edges draw on.
  const q = shownQ;
  if (q) {
    const f = (now - q.time) / (60 / q.tempo);
    if (q.pass >= 0) lines.playhead(q.s, f);
    lines.taalFrac(f);
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
  /** When the stretch playing now began (0 until its first beat sounds, and while paused),
   * and the seconds played in stretches before a pause. */
  seg: number;
  done: number;
  /** Furthest round and line reached; when the song ended, the time it did. */
  pass: number;
  line: number;
  end: number;
}
let run: Run | null = null;

function startRun(from: number, to: number, loop: boolean): void {
  const t = baseTempoAt(parsed.noteLines[from]?.start ?? 0);
  run = { song: current.id, title: current.title, from, to, loop, tempo: t, top: t, first: 0, wall: 0, seg: 0, done: 0, pass: 0, line: from, end: 0 };
}

/** A beat is showing: note how far the practice has got. */
function trackRun(q: BeatEntry, ctxNow: number): void {
  if (!run || q.pass < 0) return;
  if (!run.first) {
    run.first = q.time;
    run.wall = Date.now() - (ctxNow - q.time) * 1000;
  }
  if (!run.seg) run.seg = q.time;
  run.pass = Math.max(run.pass, q.pass);
  run.top = Math.max(run.top, q.tempo);
  run.line = Math.max(run.line, parsed.lineOfBeat[q.s] ?? 0);
}

/** Playing stopped at AudioContext time `at`: log it, with any pitch scores, unless it was
 * only a quick listen. */
function endRun(at: number, pitch: { score: number; lines: [number, number][] } | null): void {
  const r = run;
  run = null;
  if (!r || !r.first || takePlay) return;
  const secs = r.done + (r.seg ? (r.end || at) - r.seg : 0);
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

/** The editor's preview sheet (Free text), and the Practice view's lines. */
function renderSheets(): void {
  $('#sheetE').innerHTML = V.sheetHTML(parsed, taals, 0, current.example, prefs.script);
  beatEls.clear();
  for (const el of $$('#sheetE .beat[data-b]')) {
    const g = +el.dataset.b!;
    if (!beatEls.has(g)) beatEls.set(g, []);
    beatEls.get(g)!.push(el);
  }
  curEls = [];
  lines.render();
}

/** The taal playing would start in: the from-line's. */
const idleTaal = (): TaalInfo => taals.line(+select('#fromLine').value || 0).T;
/** The taal figure beside the line playing: the taal playing, or the one playing would start in. */
function renderTaal(T: TaalInfo = playing() && stripTaal ? stripTaal : idleTaal()): void {
  stripTaal = T;
  lines.taal(T);
}

function markTaal(p: number): void {
  lines.taalBeat(p);
}
function clearHighlight(): void {
  for (const el of curEls) el.classList.remove('now');
  curEls = [];
  lines.beat(-1);
}
function highlight(g: number): void {
  clearHighlight();
  curEls = beatEls.get(g) || [];
  for (const el of curEls) el.classList.add('now');
  const ln = parsed.lineOfBeat[g];
  if (ln !== lastLine) {
    lastLine = ln ?? -1;
    markSection();
    for (const sheet of [$('#sheetE')]) {
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
  lines.beat(g);
}

/** A message over the lines, only when there is something wrong (nothing to play, no sound):
 * what is playing shows on the lines themselves. */
function showMessage(text: string): void {
  const el = $('#plMsg');
  el.hidden = !text;
  if (el.textContent !== text) el.textContent = text;
}
/** What the number box of the line playing says: the round when looping, "Your turn" when the
 * guide leaves the line to the singer (every other round), else Now. */
function lineState(q: BeatEntry): string {
  if (T?.loop && !q.guide && soundSource.guide !== 'off') return 'Your turn';
  return T?.loop && q.pass > 0 ? 'Round ' + (q.pass + 1) : 'Now';
}
function showBeat(q: BeatEntry): void {
  shownQ = q;
  // Where the taal changes, the strip changes with it (the count-in is in the first beat's).
  const tq = taals.beat(q.pass < 0 ? (T?.secStart ?? 0) : q.s).T;
  if (tq.id !== stripTaal?.id) renderTaal(tq);
  markTaal(q.p);
  if (prefs.showKeys) markKeys(q.pass < 0 ? -1 : q.s, q.pass < 0 ? (T?.secStart ?? 0) : nextBeat(q.s));
  if (q.pass < 0) {
    // The count-in: the first line to sing waits, counting down.
    clearHighlight();
    lines.current(parsed.lineOfBeat[T?.secStart ?? 0] ?? 0, 'In ' + ((T?.secStart ?? 0) - q.raw), true);
  } else {
    lines.current(parsed.lineOfBeat[q.s] ?? 0, lineState(q), true);
    highlight(q.s);
    deckBeat = q.s;
  }
  boxes.markBeat(q.pass < 0 ? -1 : q.s);
  // The deck follows the tempo of the section playing (not while it is being changed).
  const t = shownTempo();
  const busy = document.activeElement === input('#tempoRange') || document.activeElement === input('#tempoNum');
  if (!busy && input('#tempoNum').value !== String(t)) showTempo(t);
  rewaz.beat(q.pass);
}
function showIdle(): void {
  // Paused, the lines stay where they were.
  if (paused) return;
  if (idleTaal().id !== stripTaal?.id) renderTaal(idleTaal());
  markTaal(-1);
  lines.playhead(-1, 0);
  if (parsed.noteLines.length) lines.current(clamp(+select('#fromLine').value || 0, 0, parsed.noteLines.length - 1), 'Start', false);
  if (prefs.showKeys) {
    const first = parsed.noteLines[+select('#fromLine').value || 0]?.start ?? -1;
    markKeys(-1, first);
  }
  markSection();
  showTempo(shownTempo());
  showMessage('');
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
/** The checker's dismissed warnings listed, to bring one back. */
let showDismissed = false;
/** The checker panel. On one of the user's songs a warning can be dismissed; it stays hidden
 * while its line's notes stay the same (the dismissal is kept with the song). */
function renderIssues(): void {
  const dis = current && !current.example ? { dismissed: new Set(current.dismissed || []), showDismissed } : undefined;
  const r = V.issuesHTML(parsed, taals, 0, prefs.script, dis);
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
/** All the user's songs, their own exercises among them, by title. */
const ownSongs = () => Array.from(songs.values()).sort((a, b) => a.title.localeCompare(b.title));
/** The pickers' two groups: the user's songs, then the exercises (their own first); the
 * exercises listed first when the Music library shows them first. */
function pickerGroups(): { own: Song[]; exercises: readonly (Song | Exercise)[]; exFirst: boolean } {
  const all = ownSongs();
  return { own: all.filter((s) => !s.exercise), exercises: [...all.filter((s) => s.exercise), ...EXERCISES], exFirst: (prefs.libOrder ?? LIB_ORDER)[0] === 'ex' };
}
/** "song" or "exercise", for the open one's buttons and notes. */
const what = () => (current.example || current.exercise ? 'exercise' : 'song');
/** The song picker, and the Music library when it is showing. */
function renderLibrary(): void {
  const g = pickerGroups();
  select('#songSel').innerHTML = V.libraryHTML(g.own, g.exercises, g.exFirst);
  if (current) select('#songSel').value = current.id;
  songsView.render();
}
/** The deck's buttons: Play (Pause while playing; Play again goes on after a pause) and Stop. */
function setPlayUI(): void {
  const b = $('#playBtn');
  const on = playing();
  b.classList.toggle('on', on);
  b.classList.toggle('paused', !!paused);
  b.setAttribute('aria-label', on ? 'Pause' : paused ? 'Go on' : 'Play');
  b.title = on ? 'Pause' : paused ? 'Go on from here' : 'Play';
  $<HTMLButtonElement>('#stopBtn').disabled = !active();
}
function renderLayerChips(): void {
  const r = V.layerChipsHTML(sound.beat, (sound.layers as Record<string, string[] | undefined>)[sound.beat] || []);
  $('#layerRow').hidden = r.hidden;
  $('#layerChips').innerHTML = r.html;
}
function setSeg(id: string, v: string | number): void {
  for (const b of $$('#' + id + ' button')) b.setAttribute('aria-pressed', String(b.dataset.v === String(v)));
}

/** The settings bars: what the folded settings are set to (the practice settings under the
 * deck, the open song's sound in Edit notation). */
function renderSoundSummary(): void {
  $('#soundSum').textContent = V.practiceSummary(sound, prefs);

  if (current) $('#songSoundSum').textContent = V.songSoundSummary(sound);
}

// ── Each song's own sound ────────────────────────────────────────────────────

/** The song's sound controls (in Edit notation), showing the open song's sound. */
function renderSoundControls(): void {
  setSeg('reedSeg', sound.reeds);
  setSeg('droneSeg', sound.droneType);
  input('#droneVol').value = String(sound.droneVol);
  select('#tanTune').value = sound.tanTune;
  select('#tanTune').hidden = sound.droneType !== 'tanpura';
  setSeg('beatSeg', sound.beat);
  input('#tablaVol').value = String(sound.tablaVol);
  setSeg('speedSeg', sound.speed);
  input('#fillsChk').checked = !!sound.fills;
  renderLayerChips();
  renderSoundSummary();
  renderSoundNote();
}

/** Whose sound the controls change: this song's, or the usual one. */
function renderSoundNote(): void {
  if (!current) return;
  const own = !current.example && !!current.sound;
  $('#songSoundHead').textContent = current.example ? 'Your usual sound' : 'Sound of this ' + what();
  $('#toSongSound').textContent = current.example ? 'Change your usual sound' : 'Change this ' + what() + '’s sound';
  $('#soundNoteText').textContent = current.example
    ? "Built-in exercises play with your usual sound, and so does every song you haven't given a sound of its own. Changes here change your usual sound."
    : own
      ? 'Saved with this ' + what() + ': it keeps this sound whatever your usual sound is.'
      : 'This ' + what() + ' plays with your usual sound until you change something here.';
  $('#soundForget').hidden = !own;
}

/**
 * Change the song's harmonium, drone or rhythm. One of the user's songs keeps them: the
 * first change saves its whole sound with it, so it sounds the same however the usual sound
 * changes later. On an exercise they change the usual sound, which every song without its
 * own uses.
 */
function setSound(patch: Partial<SongSound>): void {
  if (current.example) {
    Object.assign(prefs, patch);
    savePrefs();
  } else {
    changed('sound', { ...soundOf(sound), ...patch });
    renderSoundSummary();
  }
  renderSoundNote();
}

/** "Use my usual sound": the song forgets its own, and plays with the usual one from now. */
function forgetSound(): void {
  if (current.example || !current.sound) return;
  changed('sound', undefined);
  renderSoundControls();
  renderTaal();
  T?.applyReeds();
  T?.applyBeatLevel();
  T?.applyDrone();
  T?.resetTanpura();
}
/** Set the open song's Sa (the deck's pickers too); on an exercise it becomes your Sa. */
function setSa(s: SaChoice): void {
  const oct = s.saOct === 3 || s.saOct === 5 ? s.saOct : 4;
  select('#saKey').value = String(s.saKey);
  select('#saOct').value = String(oct);
  changed('saKey', s.saKey);
  changed('saOct', oct);
  rememberExerciseSa();
  T?.retune();
  renderKeys();
  if (!playing()) showIdle();
}
/** A Sa changed on an exercise is kept as your Sa, for every exercise and new song. */
function rememberExerciseSa(): void {
  if (!current.example) return;
  prefs.mySa = { saKey: current.saKey, saOct: current.saOct };
  savePrefs();
}

// ── Takes: record while playing, play back against the guide ──────────────────

let takeStore: TakeStore | null = null;
let takeStoreTried = false;
let recorder: Recorder | null = null;
/** "Record me" is on: each play is a take. */
let recArmed = false;
/** AudioContext time of the run's first scheduled beat (count-in included), −1 before it. */
let runFirst = -1;
/** What a take being recorded needs from its run. */
let takeRun: Omit<Take, 'id' | 'at' | 'secs' | 'rate' | 'rounds' | 'to'> & { at: number } | null = null;
/** The take playing back: with the guide (through the transport) or alone. */
let takePlay: { take: Take; how: 'guide' | 'me'; src: AudioBufferSourceNode | null } | null = null;
let takesShown: Take[] = [];
let takeConfirm = '';

async function takes(): Promise<TakeStore | null> {
  if (!takeStoreTried) {
    takeStoreTried = true;
    takeStore = typeof indexedDB === 'undefined' ? null : await TakeStore.open();
  }
  return takeStore;
}
const setTakeStatus = (t: string) => {
  $('#takesStatus').textContent = t;
};

function setRecUI(): void {
  const b = $('#recBtn');
  const live = recArmed && !!recorder?.recording;
  b.setAttribute('aria-pressed', String(recArmed));
  b.classList.toggle('live', live);
  $('#recLab').textContent = !recArmed ? 'Record me' : live ? 'Recording' : 'Recording on';
}

/** "Record me": open the microphone (and keep it open) or close it. */
async function toggleRecord(): Promise<void> {
  if (recArmed) {
    recArmed = false;
    if (recorder?.recording && T) await saveTake(recorder, T.E.ctx.currentTime, run);
    recorder?.close();
    recorder = null;
    setRecUI();
    void renderTakes();
    return;
  }
  const store = await takes();
  if (!store) {
    $('#takesBox').hidden = false;
    setTakeStatus('This browser cannot keep recordings (private browsing, or site data switched off).');
    return;
  }
  let ctx: AudioContext;
  try {
    ctx = ensureAudio().E.ctx as AudioContext;
    if (ctx.state !== 'running') void ctx.resume();
  } catch {
    setTakeStatus('Sound is unavailable in this browser.');
    return;
  }
  $('#recLab').textContent = 'Starting…';
  try {
    recorder = await Recorder.open(ctx);
  } catch (e) {
    recorder = null;
    setRecUI();
    $('#takesBox').hidden = false;
    setTakeStatus(micProblemText(e instanceof MicError ? e.problem : 'other'));
    return;
  }
  recArmed = true;
  setRecUI();
  void renderTakes();
  setTakeStatus('Recording is on: press Play, and each play becomes a take.');
  // Already playing: record from the next play.
}

/** A play has started: record it, if recording is on (not while a take plays back). */
function startTakeRun(from: number, loop: boolean): void {
  if (takePlay?.how === 'guide' && takePlay.src === null) startTakeVoice();
  if (!recArmed || !recorder || takePlay || runFirst < 0) {
    takeRun = null;
    return;
  }
  const s = soundSource;
  takeRun = {
    song: current.id, title: current.title, at: Date.now() + (runFirst - recorder.ctx.currentTime) * 1000, from, loop,
    tempo: current.tempo, countIn: !!s.countIn, ramp: !!s.ramp, rampStep: s.rampStep, rampMax: s.rampMax,
    lag: prefs.pitchLag ?? recorder.latency(), sig: textSig(current.text),
  };
  if (itemOverride?.tempo) takeRun.flat = itemOverride.tempo;
  recorder.begin(runFirst);
  setRecUI();
}

/** A play has stopped (at AudioContext time `at`): keep its take. */
function endTakeRun(at: number, r: typeof run): void {
  if (!recorder?.recording) return;
  void saveTake(recorder, at, r);
}

async function saveTake(rec: Recorder, at: number, r: typeof run): Promise<void> {
  const tr = takeRun;
  takeRun = null;
  const pcm = await rec.end(at + (tr?.lag ?? 0) + 0.3);
  setRecUI();
  if (!tr) return;
  const secs = pcm.length / rec.rate;
  if (secs < MIN_TAKE_SECS) {
    setTakeStatus('That play was too short to keep as a take.');
    return;
  }
  const { at: when, ...rest } = tr;
  const take: Take = { ...rest, id: newTakeId(), at: Math.round(when), secs: Math.round(secs * 10) / 10, rate: rec.rate, to: r ? (r.loop ? r.to : r.line) : tr.from, rounds: r && r.loop ? r.pass + 1 : 1 };
  try {
    await (await takes())!.add(take, pcm);
    setTakeStatus('Take saved (' + clockText(take.secs) + ').');
  } catch {
    setTakeStatus('The take could not be saved: this browser’s storage may be full. Delete old takes, or download them first.');
  }
  void renderTakes();
}

/** The open song's takes, under the sheet. */
async function renderTakes(): Promise<void> {
  const store = takeStoreTried ? takeStore : await takes();
  const song = current.id;
  const list = store ? await store.list(song) : [];
  if (song !== current.id) return; // another song opened meanwhile
  takesShown = list;
  drawTakes();
}
/** The takes as last read (the notation changing only changes their notes). */
function drawTakes(): void {
  const list = takesShown;
  $('#takesBox').hidden = !list.length && !recArmed && !$('#takesStatus').textContent;
  $('#takesCount').textContent = list.length ? String(list.length) : '';
  $('#takesList').innerHTML = takesHTML(list, Date.now(), textSig(current.text), { confirm: takeConfirm, playing: takePlay ? { id: takePlay.take.id, how: takePlay.how } : undefined });
}

async function takeSamples(t: Take): Promise<AudioBuffer | null> {
  const pcm = await (await takes())?.samples(t.id);
  if (!pcm) {
    setTakeStatus('This take’s recording is missing.');
    return null;
  }
  return takeBuffer(ensureAudio().E.ctx, pcm, t.rate);
}

/** Play a take against the guide: its lines, rounds, tempo, count-in and tempo trainer as
 * they were, with the guide every round, and the voice in step with it. */
async function playTakeWithGuide(t: Take): Promise<void> {
  const buf = await takeSamples(t);
  if (!buf) return;
  if (active()) stop(true);
  if (takePlay?.how === 'me') stopTakeAlone();
  rewaz.cancel();
  clearOverride();
  itemOverride = {
    baseTempo: t.tempo, countIn: t.countIn, ramp: t.ramp, rampStep: t.rampStep, rampMax: t.rampMax,
    guideLoop: 'all', guide: sound.guide === 'off' ? 'full' : undefined,
  };
  if (t.flat) itemOverride.tempo = t.flat;
  takePlay = { take: t, how: 'guide', src: null };
  takeBuf = buf;
  play({ from: t.from, to: t.to, loop: t.loop, rounds: t.loop ? t.rounds : undefined });
  if (!playing()) {
    takePlay = null;
    clearOverride();
  }
  void renderTakes();
}
let takeBuf: AudioBuffer | null = null;

/** The voice of the take playing back, from the run's first beat, skipping its delay. */
function startTakeVoice(): void {
  if (!takePlay || !takeBuf || !T || runFirst < 0) return;
  const src = T.E.ctx.createBufferSource();
  src.buffer = takeBuf;
  src.connect(T.E.master);
  src.start(runFirst, Math.min(takePlay.take.lag, takeBuf.duration));
  takePlay.src = src;
  src.onended = () => {
    if (takePlay?.src === src) stop();
  };
}

async function playTakeAlone(t: Take): Promise<void> {
  const buf = await takeSamples(t);
  if (!buf) return;
  if (active()) stop(true);
  if (takePlay?.how === 'me') stopTakeAlone();
  const E = ensureAudio().E;
  const ctx = E.ctx as AudioContext;
  if (ctx.state !== 'running') void ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(E.master);
  src.start(ctx.currentTime + 0.05, Math.min(t.lag, buf.duration));
  takePlay = { take: t, how: 'me', src };
  src.onended = () => {
    if (takePlay?.src === src) {
      takePlay = null;
      void renderTakes();
    }
  };
  void renderTakes();
}
function stopTakeAlone(): void {
  if (takePlay?.how !== 'me') return;
  const src = takePlay.src;
  takePlay = null;
  try {
    src?.stop();
  } catch {
    // already stopped
  }
  void renderTakes();
}

async function onTakeClick(e: Event): Promise<void> {
  const b = (e.target as Element).closest<HTMLElement>('button[data-act]');
  const t = b && takesShown.find((x) => x.id === b.dataset.id);
  if (!b || !t) return;
  const act = b.dataset.act;
  if (act === 'guide') {
    if (takePlay?.take.id === t.id && takePlay.how === 'guide') stop();
    else await playTakeWithGuide(t);
  } else if (act === 'me') {
    if (takePlay?.take.id === t.id && takePlay.how === 'me') stopTakeAlone();
    else await playTakeAlone(t);
  } else if (act === 'dl') {
    const pcm = await (await takes())?.samples(t.id);
    if (pcm) void offerFile(takeFileName(t), new Blob([wavFile(pcm, t.rate) as BlobPart], { type: 'audio/wav' }), setTakeStatus);
  } else if (act === 'del') {
    takeConfirm = t.id;
    void renderTakes();
  } else if (act === 'no') {
    takeConfirm = '';
    void renderTakes();
  } else if (act === 'yes') {
    takeConfirm = '';
    if (takePlay?.take.id === t.id) {
      if (takePlay.how === 'me') stopTakeAlone();
      else stop();
    }
    await (await takes())?.remove(t.id);
    setTakeStatus('Take deleted.');
    void renderTakes();
  }
}

/** The keyboard on the Practice view: the song's notes' range in whole octaves. */
function renderKeys(): void {
  const row = $('#keysRow');
  row.hidden = !prefs.showKeys;
  input('#keysChk').checked = !!prefs.showKeys;
  if (!prefs.showKeys) return;
  const sa = saMidi(current);
  const span = songSpan(parsed) ?? { lo: 0, hi: 12 };
  const [lo, hi] = keyRange(sa + span.lo, sa + span.hi);
  $('#keysBoard').innerHTML = keyboardHTML(lo, hi, sa);
  $('#keyName').textContent = '';
}
/** The beat after g while playing (inside the loop when looping), or −1. */
function nextBeat(g: number): number {
  if (!T) return -1;
  const n = g + 1;
  if (T.loop && n >= T.secEnd) return T.secStart;
  return n < parsed.total ? n : -1;
}
/** Press the keys of beat `now` and outline the first note of beat `next`. */
function markKeys(now: number, next: number): void {
  const notes = (g: number) => (parsed.beatList[g]?.units ?? []).flatMap((u) => (u.k === 'note' ? [saMidi(current) + u.semi + 12 * u.oct] : []));
  const on = new Set(now >= 0 ? notes(now) : []);
  const soon = next >= 0 ? notes(next).slice(0, 1) : [];
  for (const k of $$('#keysBoard [data-m]')) {
    const m = +k.dataset.m!;
    k.classList.toggle('now', on.has(m));
    k.classList.toggle('next', !on.has(m) && soon.includes(m));
  }
  const shown = on.size ? Array.from(on) : soon;
  $('#keyName').textContent = shown.length ? (on.size ? 'Now: ' : 'First: ') + shown.map(keyName).join(', ') : '';
}

/** Day, night, or (unset) as the device says. */
function applyTheme(): void {
  if (prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme);
  else document.documentElement.removeAttribute('data-theme');
  setSeg('themeSeg', prefs.theme ?? 'auto');
}

/** The song's notes above the sheet, when it has any. */
function renderAbout(): void {
  const notes = current.notes;
  $('#aboutBox').hidden = !notes;
  $('#aboutText').textContent = notes || '';
}

function setSoundOpen(open: boolean): void {
  $('#soundBtn').setAttribute('aria-expanded', String(open));
  $('#mixer').hidden = !open;
  $('#soundAct').textContent = open ? 'Done' : 'Change';
}
/** The song's sound in Edit notation, unfolded or not (remembered on the device). */
function setSongSoundOpen(open: boolean): void {
  $('#songSoundBtn').setAttribute('aria-expanded', String(open));
  $('#songMixer').hidden = !open;
  $('#songSoundAct').textContent = open ? 'Done' : 'Change';
  if (open) prefs.songSoundOpen = true;
  else delete prefs.songSoundOpen;
}
/** "Change this song's sound" in the Practice settings: Edit notation, with the song's sound open. */
function showSongSound(): void {
  switchTab('edit');
  setSongSoundOpen(true);
  savePrefs();
  $('.songsound').scrollIntoView({ block: 'nearest' });
  $('#songSoundBtn').focus({ preventScroll: true });
}

// ── Song loading and editing ─────────────────────────────────────────────────

function reparse(keepLines: boolean): void {
  parsed = parseSong(current.text);
  sections = songSections(current.text, parsed);
  taal = taalInfo(current.taal);
  taals = taalMap(current.text, parsed, current.taal, current.startOn, sections);
  renderSheets();
  renderLineSelects(keepLines);
  renderIssues();
  renderTaal();
  renderSections();
  renderKeys();
  refreshSelection();
  if (boxesShown()) boxes.refresh();
  if (takesShown.length) drawTakes();
  if (!playing()) showIdle();
}

/** The beat boxes changed the text: as typing in the notation box does, it stops playing. */
function setTextFromBoxes(text: string, soon: boolean): void {
  if (text === current.text) return;
  if (active()) stop(true);
  rewaz.cancel();
  clearOverride();
  changed('text', text);
  notationBox().value = text;
  clearTimeout(parseTimer);
  if (soon) parseTimer = window.setTimeout(() => reparse(true), 140);
  else reparse(true);
}

/** Beat boxes or free text. */
function setEditMode(m: 'boxes' | 'text'): void {
  if (m === 'text') prefs.editMode = 'text';
  else delete prefs.editMode;
  savePrefs();
  applyEditMode();
}
function applyEditMode(): void {
  const b = boxesMode();
  setSeg('modeSeg', b ? 'boxes' : 'text');
  $('#boxes').hidden = !b;
  notationBox().hidden = b;
  // The beat boxes show what the preview would, so they take the whole width (Rinat, 2026-10-11).
  $('#prevCol').hidden = b;
  $('#bxKey').hidden = !b;
  $('.edgrid').classList.toggle('solo', b);
  for (const el of $$('#pal .tonly')) el.hidden = b;
  for (const el of $$('#pal .bonly')) el.hidden = !b;
  $('#modeHint').textContent = b
    ? 'A box for each beat: type a note and a space to go on. Notes typed together share a beat (সারা). Paste a line of words under its first note to fill a syllable per note. Tap a line to select it; drag lines by their numbers to move them, or Copy them and Paste after another line.'
    : 'Type as in your diary: a space between beats, a new line for each line.';
  refreshSelection();
  if (boxesShown()) boxes.render();
}

/** Change the song's text from outside the notation box (the deck, the beat boxes), keeping
 * whatever is playing going. */
function setText(text: string): void {
  if (text === current.text) return;
  changed('text', text);
  const ta = notationBox();
  if (ta.value !== text) ta.value = text;
  reparse(true);
}

/** Buttons for the song's sections, when it has more than one: each plays from there; and
 * the section of the line playing over the lines. */
function renderSections(): void {
  const box = $('#secChips');
  box.hidden = sections.length < 2;
  box.innerHTML = sections.length < 2 ? '' : sections.map((sec, i) =>
    '<button type="button" class="chip" data-sec="' + i + '" aria-pressed="false">' +
    V.esc(sec.label || (sec.last > sec.first ? 'Lines ' + (sec.first + 1) + '–' + (sec.last + 1) : 'Line ' + (sec.first + 1))) +
    (sec.taal && sec.taal !== current.taal ? ' <span class="n">' + TAALS[sec.taal].bn + '</span>' : '') +
    (sec.tempo != null ? ' <span class="n">♩' + sec.tempo + '</span>' : '') + '</button>').join('');
  markSection();
}
/** Press the button of the section playing, or the one playing would start in. */
function markSection(): void {
  const line = playing() && lastLine >= 0 ? lastLine : +select('#fromLine').value || 0;
  const k = sectionOfLine(sections, line);
  if (sections.length < 2) return;
  for (const b of $$('#secChips button')) b.setAttribute('aria-pressed', String(+b.dataset.sec! === k));
}

function loadSong(song: Song | Exercise): void {
  flushNow();
  stop(true);
  showDismissed = false;
  if (!runnerLoading) {
    rewaz.cancel();
    clearOverride();
  }
  current = normalize(song);
  // The last run's voice and scores belong to the song that was open.
  lines.clearRun();
  if (song.example) {
    current.example = true;
    // Exercises sing in your Sa, once you have one (the range finder, or a change on one).
    if (prefs.mySa) Object.assign(current, prefs.mySa);
  }
  prefs.lastSong = current.id;
  savePrefs();
  renderSoundControls();
  loadSongLabels();
  input('#titleIn').value = current.title;
  input('#tagsIn').value = (current.tags || []).join(', ');
  $('#tagsF').hidden = current.example;
  $<HTMLTextAreaElement>('#notesIn').value = current.notes || '';
  $('#notesF').hidden = current.example;
  renderAbout();
  notationBox().value = current.text;
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
  if (takePlay?.how === 'me') stopTakeAlone();
  takeConfirm = '';
  setTakeStatus('');
  void renderTakes();
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
  const s = normalize({ ...base, example: false, id: newId(), updatedAt: Date.now() });
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

/** What says whether the open one is a song or an exercise: the sheet's title tag, "List
 * under" (one of the user's songs goes under My songs or Exercises; built-in exercises have
 * no choice), the delete button, the sound section. */
function loadSongLabels(): void {
  $('#songTitle').innerHTML = V.esc(current.title) + (what() === 'exercise' ? '<span class="tag">Exercise</span>' : '');
  $('#listF').hidden = current.example;
  setSeg('listSeg', current.exercise ? 'exercise' : 'song');
  $('#delBtn').textContent = 'Delete ' + what();
  $('#expBtn').textContent = 'Export this ' + what();
  $('#delConfirmText').textContent = 'Delete this ' + what() + '?';
  renderSoundNote();
}

function newSong(kind: 'song' | 'exercise' = 'song'): void {
  const sa = prefs.mySa ?? { saKey: current.saKey, saOct: current.saOct };
  const base: Partial<Song> = { title: kind === 'exercise' ? 'Untitled exercise' : 'Untitled song', taal: 'dadra', tempo: 100, saKey: sa.saKey, saOct: sa.saOct, startOn: 1, text: '# স্থায়ী\n' };
  if (kind === 'exercise') base.exercise = true;
  createSong(base);
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
/** How to choose notes to change: a beat box, or (in Free text) the preview. */
const chooseFirst = () => (boxesMode() ? 'Choose a beat box' : 'Tap a beat in the preview');

function refreshSelection(): void {
  for (const el of selEls) el.classList.remove('sel');
  selEls = [];
  const info = $('#selInfo');
  if (!info) return;
  if (!selTouched) {
    info.textContent = boxesMode() ? 'Choose a beat box' : 'Tap a beat in the preview, or select notes in the box';
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
    info.textContent = 'No notes selected. ' + chooseFirst() + '.';
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
    $('#selInfo').textContent = chooseFirst() + ' first, then press ' + (delta > 0 ? '↑' : '↓') + '.';
    return;
  }
  const r = shiftOctaves(ta.value, ta.selectionStart, ta.selectionEnd, delta);
  if (!r.count) {
    $('#selInfo').textContent = r.capped
      ? delta > 0
        ? 'Already two octaves up, the highest the player goes.'
        : 'Already two octaves down, the lowest the player goes.'
      : 'No notes selected. ' + chooseFirst() + '.';
    return;
  }
  applyTextEdit(r);
}

/** Write an edit into the notation box. With a mouse it goes through the browser's own
 * typing, so Ctrl+Z undoes it. */
function applyTextEdit(r: TextEdit): void {
  const ta = notationBox();
  let done = false;
  if (finePointer() && !boxesMode()) {
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
    $('#selInfo').textContent = chooseFirst() + ' first, then press ' + (kind === 'join' ? 'Join' : 'Split') + '.';
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
async function offerFile(name: string, text: string | Blob, say: (t: string) => void = setFileStatus): Promise<void> {
  let framed = true;
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true;
  }
  if (!framed) {
    const url = URL.createObjectURL(typeof text === 'string' ? new Blob([text], { type: 'application/json' }) : text);
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
    if (typeof text !== 'string') throw new Error('not text');
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
    const n = normalize({ ...s, example: false, id: newId(), updatedAt: Date.now() });
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
const TAB_BUTTONS: Record<Tab, string> = { practice: '#tabPractice', edit: '#tabEdit', songs: '#tabSongs', rewaz: '#tabRewaz', voice: '#tabVoice', progress: '#tabProgress' };
function switchTab(t: Tab): void {
  prefs.tab = t;
  savePrefs();
  for (const v of TABS) {
    $('#' + v).hidden = v !== t;
    $(TAB_BUTTONS[v]).setAttribute('aria-selected', String(v === t));
  }
  lastLine = -1;
  if (t === 'practice') lines.refresh();
  songsView.render();
  rewaz.render();
  progressView.render();

  if (boxesShown()) boxes.render();
  if (t === 'voice') voiceUI.render();
  else voiceUI.stop();
}
/** The tempo shown on the deck: a rewaz item's while one plays, else the song's. */
const shownTempo = () => itemOverride?.tempo ?? deckSection()?.tempo ?? current.tempo;
/** The section the deck's tempo is for: the one playing, or the one playing would start in. */
function deckSection(): SongSection | null {
  const line = playing() && deckBeat >= 0 ? (parsed.lineOfBeat[deckBeat] ?? 0) : +select('#fromLine').value || 0;
  return sections[sectionOfLine(sections, line)] ?? null;
}
/** The deck's tempo changed: a rewaz item's, a section's own (written in its heading), or
 * the song's. */
function setTempo(v: number | string): void {
  const t = clamp(Math.round(+v || 100), 30, 240);
  showTempo(t);
  if (itemOverride && rewaz.active) {
    itemOverride.tempo = t;
    return;
  }
  const sec = deckSection();
  if (sec && sec.tempo != null && sec.tempoLine) {
    if (t !== sec.tempo) setText(setHeadingTempo(current.text, sec.tempoLine, t));
    return;
  }
  if (t !== current.tempo) changed('tempo', t);
}
/** The clicked button inside a segmented control. */
const segButton = (e: Event) => (e.target as Element).closest<HTMLElement>('button');
/** Print or save as PDF: the open song, or another from the Music library. */
let printSong: (song?: Song) => void = () => {};
/** The lines' settings, as chosen: lines shown, which is the one being sung, and the size of
 * the words and notes. */
function applyLinesPrefs(): void {
  setSeg('plRowsSeg', prefs.plRows ?? 7);
  setSeg('plAtSeg', prefs.plAt ?? 3);
  setSeg('plSizeSeg', prefs.plSize ?? 'normal');
  $('#pl').dataset.size = prefs.plSize ?? 'normal';
  lines.refresh();
}


export function init(): void {
  lines = initLines({
    parsed: () => parsed,
    taals: () => taals,
    script: () => prefs.script,
    shown: () => !$('#practice').hidden,
    rows: () => prefs.plRows ?? 7,
    at: () => prefs.plAt ?? 3,
  });
  applyLinesPrefs();
  select('#saKey').innerHTML = V.keyOptionsHTML();
  select('#saOct').innerHTML = V.octOptionsHTML();
  select('#taalSel').innerHTML = V.taalOptionsHTML();
  // The song's sound controls show each song's sound as it opens (loadSong).
  setSeg('scriptSeg', prefs.script);
  applyTheme();
  setSeg('octSeg', insOct);
  setSeg('guideSeg', prefs.guide);
  input('#countIn').checked = !!prefs.countIn;
  setSeg('guideLoopSeg', prefs.guideLoop);
  input('#rampChk').checked = !!prefs.ramp;
  select('#rampStep').value = String(prefs.rampStep);
  input('#rampMax').value = String(prefs.rampMax);
  renderNoteButtons();
  setSoundOpen(prefs.soundOpen ?? false);
  setSongSoundOpen(!!prefs.songSoundOpen);
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
    folded: () => prefs.libFold ?? {},
    setFolded: (id, fold) => {
      const f = { ...prefs.libFold };
      if (fold) f[id] = true;
      else delete f[id];
      if (f.mine || f.ex) prefs.libFold = f;
      else delete prefs.libFold;
      savePrefs();
    },
    create: newSong,
    print: (id) => {
      const s = songs.get(id) || EXERCISES.find((x) => x.id === id);
      if (!s) return;
      if (s.id === current.id) printSong();
      else printSong(s.example ? { ...normalize(s), example: true, ...prefs.mySa } : normalize(s));
    },
    order: () => prefs.libOrder ?? LIB_ORDER,
    setOrder: (o) => {
      if (o.join() === LIB_ORDER.join()) delete prefs.libOrder;
      else prefs.libOrder = o;
      savePrefs();
      renderLibrary();
    },
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
    beatEls: (g) => lines.cells(g),
    lines,
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
    choices: pickerGroups,
    song: itemSong,
    countIn: () => !!prefs.countIn,
    currentSongId: () => current.id,
    routines: () => routineStore.load(),
    save: (r) => routineStore.save(r),
    remove: (id) => routineStore.remove(id),
    unfolded: {
      has: (id) => !!prefs.rewazOpen?.includes(id),
      set: (id, open) => {
        const ids = (prefs.rewazOpen ?? []).filter((x) => x !== id);
        if (open) ids.push(id);
        if (ids.length) prefs.rewazOpen = ids;
        else delete prefs.rewazOpen;
        savePrefs();
      },
    },
    play: playItem,
    stop: () => stop(),
    playing: active,
    showPractice: () => switchTab('practice'),
  });
  keyboard = initKeyboard({
    saMidi: () => saMidi(current),
    editorOpen: () => !$('#edit').hidden,
    type: (token) => {
      if (boxesMode()) boxes.type(token);
      else insertText(token + ' ');
    },
    script: () => prefs.script,
    guide: () => soundSource.guide,
    audio: () => (T ? (T.E.ctx as AudioContext) : null),
    prefs: {
      get: () => prefs.midi ?? { route: 'app', sound: 'keep' },
      set: (m) => {
        prefs.midi = m;
        savePrefs();
      },
    },
  });
  voiceUI = initVoice({
    audio: () => {
      try {
        const tr = ensureAudio();
        const ctx = tr.E.ctx as AudioContext;
        if (ctx.state !== 'running') void ctx.resume();
        return { ctx, E: tr.E };
      } catch {
        return null;
      }
    },
    stopMain: () => {
      if (active()) stop();
      rewaz.cancel();
      clearOverride();
    },
    song: () => ({ title: current.title, own: !current.example, parsed, sa: { saKey: current.saKey, saOct: current.saOct } }),
    setSongSa: setSa,
    mySa: {
      get: () => prefs.mySa,
      set: (s) => {
        prefs.mySa = { saKey: s.saKey, saOct: s.saOct === 3 || s.saOct === 5 ? s.saOct : 4 };
        savePrefs();
        if (current.example) setSa(s);
      },
    },
    range: {
      get: () => prefs.voiceRange,
      set: (r) => {
        prefs.voiceRange = r;
        savePrefs();
      },
    },
    best: {
      get: (note) => prefs.holdBest?.[String(note)],
      set: (note, secs) => {
        prefs.holdBest = { ...prefs.holdBest, [String(note)]: secs };
        savePrefs();
      },
    },
    holdNote: {
      get: () => prefs.holdNote ?? 0,
      set: (c) => {
        prefs.holdNote = c;
        savePrefs();
      },
    },
    sound: () => sound,
    script: () => prefs.script,
  });
  progressView = initProgress({
    log: () => logStore.load(),
    title: (id) => (songs.get(id) || EXERCISES.find((x) => x.id === id))?.title ?? null,
    exportLog: () => {
      const d = today();
      void offerFile('gaaner-sathi-practice-log-' + d + '.json', logFileText(logStore.load(), d), (t) => setFileStatus(t, '#pgStatus'));
    },
  });
  boxes = initBoxes({
    text: () => current.text,
    setText: setTextFromBoxes,
    songTaal: () => ({ taal: current.taal, startOn: current.startOn }),
    focusBeat: (g) => {
      const b = parsed.beatList[g];
      if (!b) return;
      selTouched = true;
      notationBox().setSelectionRange(b.a, b.b);
      refreshSelection();
    },
    playLine,
    playFrom: userPlay,
  });
  applyEditMode();
  printSong = initPrint({ song: () => current, parsed: () => parsed, taals: () => taals, script: () => prefs.script });
  $('#printBtn2').addEventListener('click', () => printSong());
  const startSong = EXERCISES.find((e) => e.id === wanted) || EXERCISES[0]!;
  loadSong(startSong);
  renderLibrary();
  switchTab(prefs.tab);

  $('#playBtn').addEventListener('click', userToggle);
  $('#stopBtn').addEventListener('click', userStop);
  $('#tDown').addEventListener('click', () => setTempo(shownTempo() - 4));
  $('#tUp').addEventListener('click', () => setTempo(shownTempo() + 4));
  input('#tempoRange').addEventListener('input', (e) => setTempo((e.target as HTMLInputElement).value));
  input('#tempoNum').addEventListener('change', (e) => setTempo((e.target as HTMLInputElement).value));
  select('#saKey').addEventListener('change', (e) => {
    changed('saKey', +(e.target as HTMLSelectElement).value);
    rememberExerciseSa();
    renderKeys();
    if (!playing()) showIdle();
    T?.retune();
  });
  select('#saOct').addEventListener('change', (e) => {
    const v = +(e.target as HTMLSelectElement).value;
    changed('saOct', v === 3 || v === 5 ? v : 4);
    rememberExerciseSa();
    renderKeys();
    if (!playing()) showIdle();
    T?.retune();
  });
  // Changing the Lines to practise while they play plays the new ones; a pause ends.
  const linesChanged = () => {
    if (playing() && lineCheck < 0 && fromHere < 0 && !rewaz.active) play();
    else if (paused) stop();
    else if (!playing()) showIdle();
  };
  select('#fromLine').addEventListener('change', () => {
    if (+select('#toLine').value < +select('#fromLine').value) select('#toLine').value = select('#fromLine').value;
    linesChanged();
  });
  select('#toLine').addEventListener('change', () => {
    if (+select('#toLine').value < +select('#fromLine').value) select('#fromLine').value = select('#toLine').value;
    input('#loopChk').checked = true;
    linesChanged();
  });
  input('#loopChk').addEventListener('change', linesChanged);

  $('#soundBtn').addEventListener('click', () => {
    const open = !!$('#mixer').hidden;
    prefs.soundOpen = open;
    savePrefs();
    setSoundOpen(open);
  });
  $('#songSoundBtn').addEventListener('click', () => {
    setSongSoundOpen(!!$('#songMixer').hidden);
    savePrefs();
  });
  $('#toSongSound').addEventListener('click', showSongSound);
  $('#soundForget').addEventListener('click', forgetSound);
  $('#guideSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    prefs.guide = b.dataset.v as GuideLevel;
    savePrefs();
    setSeg('guideSeg', prefs.guide);
    T?.applyGuide();
  });
  $('#beatSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    setSound({ beat: b.dataset.v as SongSound['beat'] });
    setSeg('beatSeg', sound.beat);
    renderTaal();
    renderLayerChips();
    T?.applyBeatLevel();
  });
  $('#reedSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    setSound({ reeds: +b.dataset.v! as SongSound['reeds'] });
    setSeg('reedSeg', sound.reeds);
    T?.applyReeds();
  });
  $('#speedSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    setSound({ speed: b.dataset.v as SongSound['speed'] });
    setSeg('speedSeg', sound.speed);
    renderTaal();
  });
  input('#fillsChk').addEventListener('change', (e) => {
    setSound({ fills: (e.target as HTMLInputElement).checked });
  });
  $('#layerChips').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-layer]');
    if (!b) return;
    const id = b.dataset.layer!;
    const st = sound.beat;
    if (st !== 'tabla' && st !== 'dholak' && st !== 'kit') return;
    const layers = soundOf(sound).layers;
    const list = new Set(layers[st]);
    if (list.has(id)) list.delete(id);
    else list.add(id);
    layers[st] = Array.from(list);
    setSound({ layers });
    renderLayerChips();
  });
  $('#droneSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    const droneType = b.dataset.v as DroneType;
    // Choosing a drone while none plays turns it on, at half volume.
    setSound(sound.droneVol <= 0 ? { droneType, droneVol: 0.5 } : { droneType });
    setSeg('droneSeg', sound.droneType);
    select('#tanTune').hidden = sound.droneType !== 'tanpura';
    input('#droneVol').value = String(sound.droneVol);
    T?.applyDrone();
  });
  select('#tanTune').addEventListener('change', (e) => {
    setSound({ tanTune: (e.target as HTMLSelectElement).value as SongSound['tanTune'] });
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
    setSound({ tablaVol: +(e.target as HTMLInputElement).value });
    T?.applyBeatLevel();
  });
  input('#droneVol').addEventListener('input', (e) => {
    setSound({ droneVol: +(e.target as HTMLInputElement).value });
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
  $('#tabVoice').addEventListener('click', () => switchTab('voice'));
  $('#recBtn').addEventListener('click', () => void toggleRecord());
  input('#keysChk').addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) prefs.showKeys = true;
    else delete prefs.showKeys;
    savePrefs();
    renderKeys();
    if (!playing()) showIdle();
  });
  // The lines' settings: how many lines show, which is the one being sung, and how big the
  // words and notes are.
  $('#plRowsSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    const v = +b.dataset.v!;
    if (v === 5 || v === 9 || v === 12) prefs.plRows = v;
    else delete prefs.plRows;
    savePrefs();
    applyLinesPrefs();
  });
  $('#plAtSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    const v = +b.dataset.v!;
    if (v === 1 || v === 2 || v === 4 || v === 5) prefs.plAt = v;
    else delete prefs.plAt;
    savePrefs();
    applyLinesPrefs();
  });
  $('#plSizeSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    const v = b.dataset.v;
    if (v === 'small' || v === 'big') prefs.plSize = v;
    else delete prefs.plSize;
    savePrefs();
    applyLinesPrefs();
  });
  $('#takesList').addEventListener('click', (e) => void onTakeClick(e));
  $('#themeSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b) return;
    const v = b.dataset.v;
    if (v === 'light' || v === 'dark') prefs.theme = v;
    else delete prefs.theme;
    savePrefs();
    applyTheme();
  });
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
  $('#newBtn').addEventListener('click', () => newSong());
  $('#copyBtn').addEventListener('click', () => {
    const title = current.example ? stripExamplePrefix(current.title) : current.title + ' (copy)';
    // A copy of a built-in exercise stays among the exercises, as the user's own.
    createSong(current.example ? { ...current, title, exercise: true } : { ...current, title });
    switchTab('edit');
  });
  $('#listSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (!b || current.example) return;
    changed('exercise', b.dataset.v === 'exercise' ? true : undefined);
    loadSongLabels();
    renderLibrary();
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
    changed('title', v.trim() ? v : 'Untitled ' + what());
    $('#songTitle').innerHTML = V.esc(current.title) + (what() === 'exercise' ? '<span class="tag">Exercise</span>' : '');
    if (!current.example) renderLibrary();
  });
  $('#notesIn').addEventListener('input', (e) => {
    changed('notes', cleanNotes((e.target as HTMLTextAreaElement).value));
    renderAbout();
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

  notationBox().addEventListener('input', (e) => {
    if (active()) stop(true);
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
    if (!b) return;
    if (boxesMode()) boxes.type(tokenFor(+b.dataset.semi!).trim());
    else insertText(tokenFor(+b.dataset.semi!));
  });
  $('#pal').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-ins]');
    if (!b) return;
    const k = b.dataset.ins;
    if (boxesMode()) {
      if (k === 'nl') boxes.newLine();
      else if (k === 'hold' || k === 'rest') boxes.type(k === 'hold' ? '-' : 'x');
      return;
    }
    insertText(k === 'hold' ? '- ' : k === 'rest' ? 'x ' : k === 'bar' ? '| ' : k === 'nl' ? '\n' : '\n> ');
  });
  $('#modeSeg').addEventListener('click', (e) => {
    const b = segButton(e);
    if (b) setEditMode(b.dataset.v === 'text' ? 'text' : 'boxes');
  });
  $('#bxHead').addEventListener('click', () => {
    setTextFromBoxes(withNewHeading(current.text), false);
    boxes.render();
    const heads = $$<HTMLInputElement>('#boxes .bxh');
    heads[heads.length - 1]?.focus();
  });
  $('#bxUndo').addEventListener('click', () => {
    if (!boxes.undo()) $('#selInfo').textContent = 'Nothing to undo in the beat boxes.';
  });

  $('#secChips').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-sec]');
    const sec = b && sections[+b.dataset.sec!];
    if (!sec) return;
    stop(true);
    rewaz.cancel();
    clearOverride();
    play({ from: sec.first, to: sec.last, loop: input('#loopChk').checked });
  });
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.ln[data-n],.pln[data-n]');
    if (b) {
      userPlay(+b.dataset.n!);
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
    if (finePointer() && !boxesMode()) ta.focus({ preventScroll: true });
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
    } else if (boxesMode()) {
      boxes.showBeat(b.g);
      return;
    }
    selectRange(s, en);
  });
  $('#issues').addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'dismiss' || act === 'undismiss' || act === 'showdis') {
      if (act === 'showdis') showDismissed = !showDismissed;
      else if (!current.example && btn.dataset.k) {
        const k = btn.dataset.k;
        const rest = (current.dismissed || []).filter((x) => x !== k);
        const next = act === 'dismiss' ? cleanDismissed([...rest, k]) : rest;
        changed('dismissed', next.length ? next : undefined);
      }
      renderIssues();
      // Keep the keyboard where it was: the next warning's Dismiss, or the list's toggle.
      const again = $<HTMLElement>('#issues button[data-act="' + (act === 'showdis' ? 'showdis' : 'dismiss') + '"]') || $<HTMLElement>('#issues button[data-act="showdis"]');
      again?.focus();
      return;
    }
    const it = issueList[+btn.dataset.i!];
    const r = it && issueRange(it);
    if (!it || !r) return;
    selectRange(r[0], r[1]);
    if (btn.dataset.act === 'show' && boxesMode()) {
      boxes.showBeat(it.g);
      selectRange(r[0], r[1]);
    } else if (btn.dataset.act === 'show') {
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

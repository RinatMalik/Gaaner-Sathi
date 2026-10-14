/**
 * What this browser keeps (docs/DATA.md → Storage): device preferences and the user's
 * songs, in localStorage.
 *
 * The prototype's keys (`swaralipi.*`) are read but never written. Its songs show up here,
 * and this app keeps its own changes under its own keys, newest edit winning. A prototype
 * page left open in another tab rewrites its whole song list from memory on every save,
 * so writing to its key could lose songs; this way neither page can overwrite the
 * other's work. A song of the prototype's deleted here is hidden, not destroyed.
 */
import { DEFAULT_SOUND, type SoundSettings } from '../audio/sound';
import { cleanLog, type LogEntry } from '../core/practice/log';
import { cleanRoutine, type Routine } from '../core/practice/routine';
import type { LibrarySort } from '../core/song/library';
import { normalize, type Song } from '../core/song/model';
import type { Script } from './view';

/** The part of `Storage` used here, so tests can pass a stand-in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORE_KEYS = {
  /** The prototype's songs and settings: read only. */
  legacySongs: 'swaralipi.songs.v1',
  legacyPrefs: 'swaralipi.prefs.v1',
  /** This app's songs: { [id]: song without its id }, the prototype's shape. */
  songs: 'gaanersathi.songs.v1',
  /** Ids of the prototype's songs deleted in this app. */
  hidden: 'gaanersathi.hidden.v1',
  prefs: 'gaanersathi.prefs.v1',
  /** The practice log: [entry, …], oldest first. */
  log: 'gaanersathi.log.v1',
  /** Rewaz routines: { [id]: routine without its id }. */
  routines: 'gaanersathi.routines.v1',
} as const;

/** Why a write failed: storage full, or blocked (private mode, site data off). */
export type WriteResult = 'ok' | 'full' | 'blocked';

export function readJSON(S: KeyValueStore | null, key: string): unknown {
  try {
    const v = S?.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function writeJSON(S: KeyValueStore | null, key: string, value: unknown): WriteResult {
  if (!S) return 'blocked';
  try {
    S.setItem(key, JSON.stringify(value));
    return 'ok';
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'full' : 'blocked';
  }
}

// ── Preferences ──────────────────────────────────────────────────────────────

export interface Prefs extends SoundSettings {
  script: Script;
  /** The song open last time. */
  lastSong: string;
  tab: Tab;
  /** Whether the Practice settings are unfolded; unset until the user folds or unfolds them. */
  soundOpen?: boolean;
  /** Whether a song's sound is unfolded in Edit notation; unset: folded. */
  songSoundOpen?: true;
  /** How the Music library sorts. */
  libSort: LibrarySort;
  /** The Music library's sections the user has folded away. */
  libFold?: { mine?: true; ex?: true };
  /** The Music library's sections in the order the user dragged them; absent: the exercises
   * first. */
  libOrder?: ('mine' | 'ex')[];
  /** Pitch feedback: the octave must match too (unset: any octave counts). */
  pitchOctave?: boolean;
  /** Pitch feedback: the delay from the beat to the voice found last time, seconds. */
  pitchLag?: number;
  /** The rewaz routines unfolded, by id; absent: all folded. */
  rewazOpen?: string[];
  /** Day or night colours; unset follows the device. */
  theme?: 'light' | 'dark';
  /** The editor shows the notation as free text; unset: beat boxes. */
  editMode?: 'text';
  /** Your Sa, from the range finder or set on an exercise: exercises and new songs use it. */
  mySa?: { saKey: number; saOct: 3 | 4 | 5 };
  /** The lowest and highest notes the range finder heard, MIDI numbers. */
  voiceRange?: { lo?: number; hi?: number };
  /** The hold trainer's note (cents from Sa), and the longest hold on each note, seconds. */
  holdNote?: number;
  holdBest?: Record<string, number>;
  /** Show the keys to press on the Practice view. */
  showKeys?: boolean;
  /** A MIDI keyboard: where the guide plays, in what sound, and on which keyboard. */
  midi?: { route: 'app' | 'kb' | 'both'; sound: 'keep' | 'organ' | 'accordion'; out?: string };
}

/** The notes the hold trainer offers, in cents from Sa (src/app/voice.ts names them). */
export const HOLD_CENTS: readonly number[] = [-500, -300, -100, 0, 200, 400, 500, 700, 900, 1100, 1200];

/** The views under the deck, in their order (`songs` is the Music library). */
export type Tab = 'practice' | 'edit' | 'songs' | 'rewaz' | 'voice' | 'progress';
export const TABS: readonly Tab[] = ['practice', 'songs', 'edit', 'rewaz', 'voice', 'progress'];

/** The prototype's defaults; it opened on exercise 3 the first time. */
export const DEFAULT_PREFS: Prefs = { ...structuredClone(DEFAULT_SOUND), script: 'bn', lastSong: 'ex-alankar-bn', tab: 'practice', libSort: 'practised' };

const oneOf = <T>(v: unknown, allowed: readonly T[], dflt: T): T => (allowed.includes(v as T) ? (v as T) : dflt);
const num = (v: unknown, lo: number, hi: number, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * This app's preferences, or the prototype's the first time, with its migrations: `extra`
 * becomes layers, `dropGuide` becomes "guide on the first round only". Unknown or
 * out-of-range values fall back to the defaults (the prototype took them as they were).
 */
export function loadPrefs(S: KeyValueStore | null): Prefs {
  const own = readJSON(S, STORE_KEYS.prefs);
  const raw = (own && typeof own === 'object' ? own : readJSON(S, STORE_KEYS.legacyPrefs)) as Record<string, unknown> | null;
  const r: Record<string, unknown> = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_PREFS;
  const lay = r.layers && typeof r.layers === 'object' ? (r.layers as Record<string, unknown>) : null;
  const layers = lay
    ? { tabla: strings(lay.tabla), dholak: strings(lay.dholak), kit: strings(lay.kit) }
    : r.extra
      ? { tabla: ['manjira'], dholak: ['manjira'], kit: ['shaker'] }
      : { tabla: [], dholak: [], kit: [] };
  let guideLoop = oneOf(r.guideLoop, ['all', 'first', 'alt'] as const, d.guideLoop);
  if (r.dropGuide && guideLoop === 'all') guideLoop = 'first';
  const p: Prefs = {
    script: oneOf(r.script, ['bn', 'lat'] as const, d.script),
    guide: oneOf(r.guide, ['full', 'soft', 'off'] as const, d.guide),
    beat: oneOf(r.beat, ['tabla', 'dholak', 'kit', 'click', 'off'] as const, d.beat),
    tablaVol: num(r.tablaVol, 0, 1, d.tablaVol),
    speed: oneOf(r.speed, ['half', 'normal', 'double'] as const, d.speed),
    fills: typeof r.fills === 'boolean' ? r.fills : d.fills,
    layers,
    reeds: oneOf(r.reeds, [1, 2, 3] as const, d.reeds),
    droneType: oneOf(r.droneType, ['tanpura', 'harmonium'] as const, d.droneType),
    droneVol: num(r.droneVol, 0, 1, d.droneVol),
    tanTune: oneOf(r.tanTune, ['P', 'M', 'N'] as const, d.tanTune),
    countIn: typeof r.countIn === 'boolean' ? r.countIn : d.countIn,
    guideLoop,
    ramp: typeof r.ramp === 'boolean' ? r.ramp : d.ramp,
    rampStep: num(r.rampStep, 1, 240, d.rampStep),
    rampMax: num(r.rampMax, 30, 240, d.rampMax),
    lastSong: typeof r.lastSong === 'string' ? r.lastSong : d.lastSong,
    tab: oneOf(r.tab, TABS, d.tab),
    libSort: oneOf(r.libSort, ['practised', 'changed', 'title'] as const, d.libSort),
  };
  if (typeof r.soundOpen === 'boolean') p.soundOpen = r.soundOpen;
  if (r.songSoundOpen === true) p.songSoundOpen = true;
  const lo = r.libOrder;
  if (Array.isArray(lo) && lo.length === 2 && lo.includes('mine') && lo.includes('ex')) p.libOrder = lo as ('mine' | 'ex')[];
  const lf = r.libFold as Record<string, unknown> | undefined;
  if (lf && typeof lf === 'object' && (lf.mine === true || lf.ex === true)) {
    p.libFold = {};
    if (lf.mine === true) p.libFold.mine = true;
    if (lf.ex === true) p.libFold.ex = true;
  }
  if (r.pitchOctave === true) p.pitchOctave = true;
  if (typeof r.pitchLag === 'number' && r.pitchLag >= 0 && r.pitchLag <= 0.6) p.pitchLag = r.pitchLag;
  const ro = Array.isArray(r.rewazOpen) ? r.rewazOpen.filter((x): x is string => typeof x === 'string' && !!x).slice(0, 100) : [];
  if (ro.length) p.rewazOpen = ro;
  if (r.theme === 'light' || r.theme === 'dark') p.theme = r.theme;
  if (r.editMode === 'text') p.editMode = 'text';
  const my = r.mySa as Record<string, unknown> | undefined;
  if (my && typeof my === 'object' && Number.isInteger(my.saKey) && (my.saKey as number) >= 0 && (my.saKey as number) <= 11 && (my.saOct === 3 || my.saOct === 4 || my.saOct === 5)) p.mySa = { saKey: my.saKey as number, saOct: my.saOct };
  const vr = r.voiceRange as Record<string, unknown> | undefined;
  if (vr && typeof vr === 'object') {
    const range: { lo?: number; hi?: number } = {};
    for (const k of ['lo', 'hi'] as const) if (typeof vr[k] === 'number' && (vr[k] as number) >= 20 && (vr[k] as number) <= 110) range[k] = vr[k] as number;
    if (range.lo != null || range.hi != null) p.voiceRange = range;
  }
  if (typeof r.holdNote === 'number' && HOLD_CENTS.includes(r.holdNote)) p.holdNote = r.holdNote;
  if (r.showKeys === true) p.showKeys = true;
  const mi = r.midi as Record<string, unknown> | undefined;
  if (mi && typeof mi === 'object') {
    p.midi = { route: oneOf(mi.route, ['app', 'kb', 'both'] as const, 'app'), sound: oneOf(mi.sound, ['keep', 'organ', 'accordion'] as const, 'keep') };
    if (typeof mi.out === 'string' && mi.out) p.midi.out = mi.out;
  }
  const hb = r.holdBest as Record<string, unknown> | undefined;
  if (hb && typeof hb === 'object' && !Array.isArray(hb)) {
    const best: Record<string, number> = {};
    for (const [k, v] of Object.entries(hb)) if (HOLD_CENTS.includes(Number(k)) && typeof v === 'number' && v > 0 && v < 3600) best[k] = v;
    if (Object.keys(best).length) p.holdBest = best;
  }
  return p;
}

export const savePrefs = (S: KeyValueStore | null, p: Prefs): WriteResult => writeJSON(S, STORE_KEYS.prefs, p);

// ── Songs ────────────────────────────────────────────────────────────────────

/** A song as stored: everything but its id (the key) and the exercise flag; tags, the
 * favourite mark, the song's own sound and its notes only when set. */
export function bodyOf(s: Song) {
  const body: Omit<Song, 'id' | 'example'> = { title: s.title, taal: s.taal, tempo: s.tempo, saKey: s.saKey, saOct: s.saOct, startOn: s.startOn, text: s.text, updatedAt: s.updatedAt };
  if (s.tags && s.tags.length) body.tags = s.tags;
  if (s.fav) body.fav = true;
  if (s.exercise) body.exercise = true;
  if (s.sound) body.sound = s.sound;
  if (s.notes) body.notes = s.notes;
  if (s.dismissed && s.dismissed.length) body.dismissed = s.dismissed;
  return body;
}

/** A stored { [id]: body } object, with no prototype so any id is a plain key. */
function songTable(v: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = Object.create(null);
  if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) out[k] = x;
  return out;
}

export class SongStore {
  /** 'memory' when this browser blocks storage: songs last until the page closes. */
  readonly mode: 'local' | 'memory';

  constructor(private readonly S: KeyValueStore | null) {
    let ok = !!S;
    try {
      S?.setItem('swaralipi.probe', '1');
      S?.removeItem('swaralipi.probe');
    } catch {
      ok = false;
    }
    this.mode = ok ? 'local' : 'memory';
  }

  /** Every saved song: the prototype's, then this app's on top (the newer edit wins),
   * less the prototype's songs deleted here. */
  load(): Map<string, Song> {
    const legacy = songTable(readJSON(this.S, STORE_KEYS.legacySongs));
    const own = songTable(readJSON(this.S, STORE_KEYS.songs));
    const hidden = new Set(strings(readJSON(this.S, STORE_KEYS.hidden)));
    const m = new Map<string, Song>();
    for (const id of Object.keys(legacy)) if (!hidden.has(id)) m.set(id, normalize(Object.assign({}, legacy[id], { id })));
    for (const id of Object.keys(own)) {
      const s = normalize(Object.assign({}, own[id], { id }));
      const old = m.get(id);
      if (!old || s.updatedAt >= old.updatedAt) m.set(id, s);
    }
    return m;
  }

  /** Save songs: re-read the stored list and change only these, so another tab's saves survive. */
  save(list: readonly Song[]): WriteResult {
    if (this.mode === 'memory') return 'blocked';
    const own = songTable(readJSON(this.S, STORE_KEYS.songs));
    for (const s of list) own[s.id] = bodyOf(s);
    return writeJSON(this.S, STORE_KEYS.songs, own);
  }

  remove(id: string): WriteResult {
    if (this.mode === 'memory') return 'blocked';
    const own = songTable(readJSON(this.S, STORE_KEYS.songs));
    delete own[id];
    const r = writeJSON(this.S, STORE_KEYS.songs, own);
    if (r !== 'ok') return r;
    if (id in songTable(readJSON(this.S, STORE_KEYS.legacySongs))) {
      const hidden = strings(readJSON(this.S, STORE_KEYS.hidden));
      if (!hidden.includes(id)) hidden.push(id);
      return writeJSON(this.S, STORE_KEYS.hidden, hidden);
    }
    return 'ok';
  }

  /** Whether a storage change made in another tab concerns the songs. */
  static isSongKey(key: string | null): boolean {
    return key === null || key === STORE_KEYS.songs || key === STORE_KEYS.legacySongs || key === STORE_KEYS.hidden;
  }
}

// ── Practice log ─────────────────────────────────────────────────────────────

export class LogStore {
  constructor(private readonly S: KeyValueStore | null) {}

  /** Every entry that can still be read, oldest first. */
  load(): LogEntry[] {
    return cleanLog(readJSON(this.S, STORE_KEYS.log));
  }

  /** Add an entry: re-read the stored log and append, so another tab's entries survive. */
  add(e: LogEntry): WriteResult {
    const raw = readJSON(this.S, STORE_KEYS.log);
    const list: unknown[] = Array.isArray(raw) ? raw : [];
    list.push(e);
    return writeJSON(this.S, STORE_KEYS.log, list);
  }

  /** Whether a storage change made in another tab concerns the log. */
  static isLogKey(key: string | null): boolean {
    return key === null || key === STORE_KEYS.log;
  }
}

// ── Rewaz routines ───────────────────────────────────────────────────────────

export class RoutineStore {
  constructor(private readonly S: KeyValueStore | null) {}

  /** Every routine that can still be read. */
  load(): Map<string, Routine> {
    const t = songTable(readJSON(this.S, STORE_KEYS.routines));
    const m = new Map<string, Routine>();
    for (const id of Object.keys(t)) {
      const r = cleanRoutine(id, t[id]);
      if (r) m.set(id, r);
    }
    return m;
  }

  /** Save one routine: re-read the stored ones and change only this, so another tab's survive. */
  save(r: Routine): WriteResult {
    const t = songTable(readJSON(this.S, STORE_KEYS.routines));
    t[r.id] = { name: r.name, items: r.items, updatedAt: r.updatedAt };
    return writeJSON(this.S, STORE_KEYS.routines, t);
  }

  remove(id: string): WriteResult {
    const t = songTable(readJSON(this.S, STORE_KEYS.routines));
    delete t[id];
    return writeJSON(this.S, STORE_KEYS.routines, t);
  }

  static isRoutineKey(key: string | null): boolean {
    return key === null || key === STORE_KEYS.routines;
  }
}

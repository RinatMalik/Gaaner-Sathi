/**
 * Rewaz routines (docs/ROADMAP.md → Rewaz routine): a list of exercises and songs, each
 * with its own lines, rounds, tempo and guide, run one after another without touching the
 * screen. Pure, so it is tested in Node.
 */

/** How the guide plays in an item: as the Sound settings say, or one of these. */
export type ItemGuide = 'all' | 'first' | 'alt' | 'off';

export interface RoutineItem {
  /** A song or exercise id. */
  song: string;
  /** Lines to practise, 0-based and inclusive; absent: the whole song. */
  from?: number;
  to?: number;
  /** Times through, 1–20. */
  rounds: number;
  /** Matras per minute; absent: the song's own tempo. */
  tempo?: number;
  /** Absent: as the Sound settings say. */
  guide?: ItemGuide;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  /** ms since epoch. */
  updatedAt: number;
}

export const ROUTINE_LIMITS = { items: 40, rounds: 20, name: 80 } as const;

/** Ready the first time: a warm-up of four exercises, from long notes to akar. */
export const STARTER: Routine = {
  id: 'routine-starter',
  name: 'Daily warm-up',
  updatedAt: 0,
  items: [
    { song: 'ex-long-notes', rounds: 1 },
    { song: 'ex-scale', rounds: 2 },
    { song: 'ex-alankar-bn', rounds: 2 },
    { song: 'ex-akar', rounds: 1 },
  ],
};

const int = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined;

export function cleanItem(v: unknown): RoutineItem | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.song !== 'string' || !o.song) return null;
  const it: RoutineItem = { song: o.song, rounds: int(o.rounds, 1, ROUTINE_LIMITS.rounds) ?? 1 };
  const from = int(o.from, 0, 10_000);
  const to = int(o.to, 0, 10_000);
  if (from != null) {
    it.from = from;
    it.to = Math.max(from, to ?? from);
  }
  const tempo = int(o.tempo, 30, 240);
  if (tempo != null) it.tempo = tempo;
  if (o.guide === 'all' || o.guide === 'first' || o.guide === 'alt' || o.guide === 'off') it.guide = o.guide;
  return it;
}

/** A stored routine, checked: every field clamped, damaged items dropped. */
export function cleanRoutine(id: string, v: unknown): Routine | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const items = (Array.isArray(o.items) ? o.items : []).map(cleanItem).filter((x): x is RoutineItem => !!x).slice(0, ROUTINE_LIMITS.items);
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, ROUTINE_LIMITS.name) : 'My rewaz';
  return { id, name, items, updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : 0 };
}

/** A new routine id, like song ids. */
export function newRoutineId(now: number = Date.now(), rand: () => number = Math.random): string {
  return 'routine-' + now.toString(36) + '-' + rand().toString(36).slice(2, 7);
}

/** What the runner needs to know about a song. */
export interface SongShape {
  tempo: number;
  /** Beats in each notes line. */
  lineBeats: readonly number[];
  /** The taal cycle, for the count-in. */
  cycle: number;
}

/** Seconds between items, to breathe and see what is next. */
export const ITEM_GAP = 4;

/** The lines an item plays, clamped to the song: [from, to]. */
export function itemLines(it: RoutineItem, lines: number): [number, number] {
  const last = Math.max(0, lines - 1);
  const from = Math.min(it.from ?? 0, last);
  return [from, it.from == null ? last : Math.max(from, Math.min(it.to ?? from, last))];
}

/**
 * Roughly how long a routine takes, seconds: each item's beats × rounds at its tempo, a
 * count-in cycle, and the gap after it. Items whose song is gone count nothing.
 */
export function routineSeconds(r: Routine, shapeOf: (id: string) => SongShape | null, countIn: boolean): number {
  let t = 0;
  r.items.forEach((it, i) => {
    const s = shapeOf(it.song);
    if (!s || !s.lineBeats.length) return;
    const [a, b] = itemLines(it, s.lineBeats.length);
    let beats = 0;
    for (let k = a; k <= b; k++) beats += s.lineBeats[k]!;
    const spb = 60 / (it.tempo ?? s.tempo);
    t += (beats * it.rounds + (countIn ? s.cycle : 0)) * spb + (i < r.items.length - 1 ? ITEM_GAP : 0);
  });
  return t;
}

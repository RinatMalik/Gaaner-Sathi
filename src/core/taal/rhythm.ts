/**
 * Rhythm engine (docs/ENGINE.md → Rhythm engine). Every style becomes one cycle of hits
 * {pos, lane, vel}, pos in matras from sam (0). Speed maps that cycle onto the song: Double
 * plays it twice per taal cycle, Half spreads it over two. Fills replace the last vibhag of
 * every 4th cycle (and of the count-in) and are never speed-mapped. Arithmetic is kept in
 * the prototype's exact order, so tables match it to the last bit.
 */
import { taalInfo, type TaalId, type TaalInfo } from './taals';

export type Style = 'tabla' | 'dholak' | 'kit' | 'click';
/** What plays a hit. bol: a tabla stroke; k s h o: kick, snare, hat, open hat; tH tM tL:
 * toms; b c t: dholak bass, closed, treble; the rest are the layers' voices. */
export type Lane =
  | 'bol' | 'click' | 'k' | 's' | 'h' | 'o' | 'tH' | 'tM' | 'tL' | 'b' | 'c' | 't'
  | 'mo' | 'mc' | 'sh' | 'ka' | 'gh' | 'ghS' | 'tb' | 'tbS' | 'cl' | 'cb' | 'cgM' | 'cgS' | 'cgO' | 'cgL' | 'rd' | 'rdB';
export interface Hit {
  pos: number;
  lane: Lane;
  vel: number;
  bol?: string;
  lvl?: number;
}
/** A hit placed in its matra slot; frac is how far into the matra it falls (0 ≤ frac < 1). */
export interface SlotHit extends Hit {
  frac: number;
}
export interface RhythmTable {
  /** Slot window: one cycle, or two at Half speed (picked by cycle parity). */
  W: number;
  cyc: number;
  slots: SlotHit[][];
  fillFrom: number;
  fill: SlotHit[][] | null;
}

/** [matra, velocity] hits for one cycle; 1 is sam, 4.5 is halfway through matra 4. 'all'
 * means one hit on every matra, accented on each vibhag. */
type GrooveLane = readonly (readonly [number, number])[] | 'all';
type Groove = Partial<Record<Lane, GrooveLane>>;

export const GROOVES: Record<'kit' | 'dholak', Record<TaalId, Groove>> = {
  kit: {
    dadra: { k: [[1, 1], [6, 0.55]], s: [[4, 0.9]], h: 'all', o: [[6.5, 0.45]] },
    keherwa: { k: [[1, 1], [5, 0.8], [6, 0.55]], s: [[3, 0.9], [7, 0.9]], h: 'all', o: [[8.5, 0.45]] },
    rupak: { k: [[1, 1], [6, 0.7]], s: [[4, 0.85], [7, 0.8]], h: 'all' },
    jhaptal: { k: [[1, 1], [6, 0.8]], s: [[3, 0.8], [8, 0.85]], h: 'all' },
    ektal: { k: [[1, 1], [7, 0.85]], s: [[4, 0.85], [10, 0.85]], h: 'all', o: [[12.5, 0.4]] },
    teentaal: { k: [[1, 1], [5, 0.8], [6, 0.5], [9, 0.9], [13, 0.8], [14, 0.5]], s: [[3, 0.85], [7, 0.85], [11, 0.85], [15, 0.85]], h: 'all', o: [[16.5, 0.4]] },
  },
  dholak: {
    dadra: { b: [[1, 1], [3.5, 0.55], [5, 0.8]], c: [[4, 0.75]], t: [[1, 0.7], [2, 0.75], [3, 0.6], [4, 0.5], [5, 0.55], [6, 0.75], [6.5, 0.4]] },
    keherwa: { b: [[1, 1], [2.5, 0.5], [4, 0.7], [5.5, 0.55], [7, 0.85]], c: [[5, 0.75]], t: [[1, 0.7], [2, 0.7], [3, 0.65], [4, 0.5], [5, 0.5], [6, 0.7], [7, 0.6], [8, 0.75], [8.5, 0.4]] },
    rupak: { b: [[4, 0.9], [6, 0.9], [7.5, 0.45]], c: [[1, 0.7]], t: [[1, 0.7], [2, 0.7], [3, 0.65], [4, 0.5], [5, 0.7], [6, 0.5], [7, 0.7]] },
    jhaptal: { b: [[1, 1], [3, 0.85], [8, 0.85], [9.5, 0.5]], c: [[6, 0.8]], t: 'all' },
    ektal: { b: [[1, 1], [5, 0.8], [9, 0.8], [11, 0.8]], c: [[3, 0.7], [7, 0.7]], t: 'all' },
    teentaal: { b: [[1, 1], [2.5, 0.5], [5, 0.85], [6.5, 0.5], [13, 0.85], [14.5, 0.5]], c: [[9, 0.8]], t: 'all' },
  },
};

export const SPEEDS = { half: 0.5, normal: 1, double: 2 } as const;
export type SpeedName = keyof typeof SPEEDS;

/** One cycle of the style's own hits. */
export function baseHits(style: string, T: TaalInfo): Hit[] {
  const out: Hit[] = [];
  if (style === 'tabla') {
    T.bols.forEach((b, p) => {
      const vel = p === 0 ? 1 : T.markAt.has(p) ? 0.86 : 0.72;
      if (typeof b !== 'string') b.forEach((x, i) => out.push({ pos: p + i / b.length, lane: 'bol', bol: x, vel: vel * (i ? 0.78 : 1) }));
      else out.push({ pos: p, lane: 'bol', bol: b, vel });
    });
  } else if (style === 'click') {
    for (let p = 0; p < T.cycle; p++) out.push({ pos: p, lane: 'click', lvl: p === 0 ? 2 : T.markAt.has(p) ? 1 : 0, vel: 1 });
  } else {
    const byTaal = style === 'kit' || style === 'dholak' ? GROOVES[style] : undefined;
    const g: Groove = (byTaal && byTaal[T.id]) || {};
    for (const lane of Object.keys(g) as Lane[]) {
      let list = g[lane]!;
      if (list === 'all') list = Array.from({ length: T.cycle }, (_, i) => [i + 1, i === 0 ? 0.75 : T.markAt.has(i) ? 0.62 : 0.45] as const);
      for (const [x, vel] of list) out.push({ pos: x - 1, lane, vel });
    }
  }
  return out;
}

/** Extra percussion layers. Each is built from the taal's own vibhag structure, so it fits
 * every taal. */
export const LAYERS = {
  manjira: { name: 'Manjira', styles: ['tabla', 'dholak'] },
  kartal: { name: 'Kartal', styles: ['tabla', 'dholak'] },
  ghungroo: { name: 'Ghungroo', styles: ['tabla', 'dholak'] },
  shaker: { name: 'Shaker', styles: ['tabla', 'dholak', 'kit'] },
  tambourine: { name: 'Tambourine', styles: ['dholak', 'kit'] },
  claps: { name: 'Claps', styles: ['kit'] },
  cowbell: { name: 'Cowbell', styles: ['kit'] },
  congas: { name: 'Congas', styles: ['kit'] },
  ride: { name: 'Ride', styles: ['kit'] },
} as const satisfies Record<string, { name: string; styles: readonly Style[] }>;
export type LayerId = keyof typeof LAYERS;

const isLayerId = (id: string): id is LayerId => Object.hasOwn(LAYERS, id);
const layerFits = (id: LayerId, style: string) => (LAYERS[id].styles as readonly string[]).includes(style);

/** The kit's backbeats (matra indices), which tambourine and claps follow. */
export function backbeats(T: TaalInfo): number[] {
  const g = GROOVES.kit[T.id];
  const s = g && g.s;
  return s && s !== 'all' ? s.map(([x]) => x - 1) : T.starts.slice(1);
}

export function layerHits(id: string, T: TaalInfo): Hit[] {
  const out: Hit[] = [];
  const cyc = T.cycle;
  const push = (pos: number, lane: Lane, vel: number) => out.push({ pos, lane, vel });
  const vibs = T.starts.map((v, i) => [v, (i + 1 < T.starts.length ? T.starts[i + 1]! : cyc) - v] as const);
  switch (id) {
    case 'manjira':
      for (let p = 0; p < cyc; p++) {
        if (T.markAt.has(p)) push(p, 'mo', p === 0 ? 0.9 : 0.7);
        push(p + 0.5, 'mc', 0.55);
      }
      break;
    case 'kartal':
      for (const [v, L] of vibs) {
        for (let k = 0; k < L; k++) {
          const p = v + k;
          push(p, 'ka', k === 0 ? 0.8 : 0.45);
          push(p + 0.5, 'ka', 0.6);
          if (k === L - 1) push(p + 0.75, 'ka', 0.5);
        }
      }
      break;
    case 'ghungroo':
      for (let p = 0; p < cyc; p++) {
        if (T.markAt.has(p)) push(p, 'ghS', p === 0 ? 0.8 : 0.6);
        else push(p, 'gh', 0.4);
        push(p + 0.5, 'gh', 0.3);
      }
      break;
    case 'shaker':
      for (let p = 0; p < cyc; p++) {
        push(p, 'sh', 0.35);
        push(p + 0.5, 'sh', 0.6);
      }
      break;
    case 'tambourine': {
      const bb = new Set(backbeats(T));
      for (let p = 0; p < cyc; p++) {
        if (bb.has(p)) push(p, 'tbS', 0.85);
        push(p + 0.5, 'tb', 0.45);
      }
      break;
    }
    case 'claps':
      for (const x of backbeats(T)) push(x, 'cl', 0.8);
      break;
    case 'cowbell':
      for (const [v, L] of vibs) {
        push(v, 'cb', 0.8);
        if (L >= 3) push(v + 1.5, 'cb', 0.5);
      }
      break;
    case 'congas':
      for (const [v, L] of vibs) {
        push(v + 0.5, 'cgM', 0.45);
        if (L >= 3) push(v + 1, 'cgS', 0.55);
        push(v + L - 1, 'cgO', 0.7);
        push(v + L - 0.5, 'cgL', 0.7);
      }
      break;
    case 'ride':
      for (let p = 0; p < cyc; p++) push(p, p === 0 ? 'rdB' : 'rd', T.markAt.has(p) ? 0.65 : 0.45);
      break;
  }
  return out;
}

/** The layers switched on for a style, keeping only ones that fit it, in a stable order. */
export function activeLayers(layers: Partial<Record<string, readonly string[]>>, style: string): LayerId[] {
  const list = layers[style] || [];
  return list.filter((id): id is LayerId => isLayerId(id) && layerFits(id, style)).sort();
}

/** The fill that replaces the last vibhag. */
export function fillHits(style: string, T: TaalInfo): { from: number; hits: Hit[] } {
  const from = T.starts[T.starts.length - 1]!;
  const L = T.cycle - from;
  const out: Hit[] = [];
  if (style === 'tabla') {
    for (let j = 0; j < L; j++) {
      const p = from + j;
      if (j < L - 1) {
        ['Ti', 'Ra', 'Ki', 'Ta'].forEach((b, i) => out.push({ pos: p + i / 4, lane: 'bol', bol: b, vel: 0.6 + (0.3 * (j * 4 + i)) / (L * 4) }));
      } else {
        out.push({ pos: p, lane: 'bol', bol: 'Dha', vel: 1 });
        out.push({ pos: p + 0.5, lane: 'bol', bol: 'Ge', vel: 0.7 });
      }
    }
  } else if (style === 'kit') {
    const n = L * 2;
    for (let i = 0; i < n; i++) out.push({ pos: from + i / 2, lane: i < n / 3 ? 'tH' : i < (2 * n) / 3 ? 'tM' : 'tL', vel: 0.6 + (0.4 * i) / n });
    out.push({ pos: from, lane: 'k', vel: 0.7 });
  } else if (style === 'dholak') {
    const n = L * 2;
    for (let i = 0; i < n; i++) out.push({ pos: from + i / 2, lane: i % 2 ? 't' : 'b', vel: 0.55 + (0.45 * i) / n });
  }
  return { from, hits: out };
}

export function slotsOf(list: Hit[], W: number): SlotHit[][] {
  const slots: SlotHit[][] = Array.from({ length: W }, () => []);
  for (const h of list) {
    const m = Math.floor(h.pos + 1e-9);
    if (m >= 0 && m < W) slots[m]!.push(Object.assign({}, h, { frac: Math.max(0, h.pos - m) }));
  }
  return slots;
}

const rhythmCache = new Map<string, RhythmTable>();

/** The per-matra hit table for a style, taal, speed (0.5, 1, 2) and set of layers. Cached:
 * callers must not modify it. */
export function rhythmTable(style: string, tid: string, speed: number, layers: readonly string[] = []): RhythmTable {
  const key = [style, tid, speed, layers.join(',')].join(':');
  const hit = rhythmCache.get(key);
  if (hit) return hit;
  const T = taalInfo(tid);
  const cyc = T.cycle;
  const base = baseHits(style, T).concat(...layers.map((id) => layerHits(id, T)));
  const W = speed < 1 ? cyc * 2 : cyc;
  const reps = speed > 1 ? speed : 1;
  const mapped: Hit[] = [];
  for (const h of base) for (let r = 0; r < reps; r++) mapped.push(Object.assign({}, h, { pos: h.pos / speed + (r * cyc) / speed }));
  const f = fillHits(style, T);
  const R: RhythmTable = { W, cyc, slots: slotsOf(mapped, W), fillFrom: f.from, fill: f.hits.length ? slotsOf(f.hits, cyc) : null };
  rhythmCache.set(key, R);
  return R;
}

/** The label under each beat of the taal strip: its bol for tabla, the main stroke otherwise. */
export function beatLabel(style: string, tid: string, speed: number, p: number): string {
  if (style === 'off') return '';
  const R = rhythmTable(style, tid, speed, []);
  const all = R.slots[p] || [];
  if (style === 'tabla') return all.filter((h) => h.lane === 'bol').map((h) => h.bol).join('') || '·';
  if (style === 'click') return all.length ? '•' : '';
  const hits = all.filter((h) => h.frac < 1e-6);
  const has = (l: Lane) => hits.some((h) => h.lane === l);
  if (style === 'kit') return has('k') ? 'Kick' : has('s') ? 'Snare' : '·';
  if (has('b') && has('t')) return 'Dha';
  if (has('b')) return 'Ge';
  if (has('c')) return 'Ka';
  return has('t') ? 'Na' : '·';
}

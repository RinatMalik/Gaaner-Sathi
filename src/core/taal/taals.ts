/** The six taals (docs/ENGINE.md → Taals): vibhags, marks and theka bols. */

/** A bol, or several bols sharing one matra (Ektal's DhaGe, TiRaKiTa). */
export type Bol = string | readonly string[];

export interface TaalDef {
  name: string;
  bn: string;
  /** Vibhag lengths in matras. */
  vib: readonly number[];
  /** The mark on each vibhag: X sam, 0 khali, or a tali number. */
  marks: readonly string[];
  bols: readonly Bol[];
}

export const TAALS = {
  dadra: { name: 'Dadra', bn: 'দাদরা', vib: [3, 3], marks: ['X', '0'], bols: ['Dha', 'Dhin', 'Na', 'Dha', 'Tin', 'Na'] },
  keherwa: { name: 'Keherwa', bn: 'কাহারবা', vib: [4, 4], marks: ['X', '0'], bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ke', 'Dhin', 'Na'] },
  rupak: { name: 'Rupak', bn: 'রূপক', vib: [3, 2, 2], marks: ['0', '1', '2'], bols: ['Tin', 'Tin', 'Na', 'Dhi', 'Na', 'Dhi', 'Na'] },
  jhaptal: { name: 'Jhaptal', bn: 'ঝাঁপতাল', vib: [2, 3, 2, 3], marks: ['X', '2', '0', '3'], bols: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Tin', 'Na', 'Dhi', 'Dhi', 'Na'] },
  ektal: {
    name: 'Ektal', bn: 'একতাল', vib: [2, 2, 2, 2, 2, 2], marks: ['X', '0', '2', '0', '3', '4'],
    bols: ['Dhin', 'Dhin', ['Dha', 'Ge'], ['Ti', 'Ra', 'Ki', 'Ta'], 'Tu', 'Na', 'Kat', 'Ta', ['Dha', 'Ge'], ['Ti', 'Ra', 'Ki', 'Ta'], 'Dhi', 'Na'],
  },
  teentaal: {
    name: 'Teentaal', bn: 'ত্রিতাল', vib: [4, 4, 4, 4], marks: ['X', '2', '0', '3'],
    bols: ['Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin', 'Dhin', 'Dha'],
  },
} as const satisfies Record<string, TaalDef>;

export type TaalId = keyof typeof TAALS;
export const TAAL_IDS = Object.keys(TAALS) as TaalId[];

/**
 * Own keys only. (The prototype's `TAALS[id]` also accepted names such as "constructor"
 * from an imported file, which then crashed playback.)
 */
export const isTaalId = (id: unknown): id is TaalId => typeof id === 'string' && Object.hasOwn(TAALS, id);

export interface TaalInfo extends TaalDef {
  id: TaalId;
  cycle: number;
  /** Matra index (0-based) where each vibhag starts. */
  starts: number[];
  markAt: Map<number, string>;
}

/** A taal with its derived positions; unknown ids fall back to Dadra. */
export function taalInfo(id: string): TaalInfo {
  const key: TaalId = isTaalId(id) ? id : 'dadra';
  const t: TaalDef = TAALS[key];
  const starts: number[] = [];
  let a = 0;
  t.vib.forEach((v) => {
    starts.push(a);
    a += v;
  });
  const markAt = new Map(starts.map((s, i) => [s, t.marks[i]!] as const));
  return Object.assign({ id: key, cycle: t.bols.length, starts, markAt }, t);
}

export const bolText = (b: Bol): string => (typeof b === 'string' ? b : b.join(''));

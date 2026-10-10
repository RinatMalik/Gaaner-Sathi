/**
 * The taals (docs/ENGINE.md → Taals): vibhags, marks and theka bols. The first six are the
 * prototype's. The rest were added on 2026-10-10:
 * - Tagore's own six. None has a khali, only talis. Thekas are Subinay Roy's (tabla:
 *   Jhampak, Shashthi, Rupakra; mridanga: Nabapanchatal) and Kangalicharan Sen's (mridanga:
 *   Nabatal, Ekadashi), as gitabitan.net gives them.
 * - Khemta (12 matras, as in Bengali tabla books), Deepchandi, Dhamar (divided as in
 *   Rabindrasangeet, 3|2|2|3|4 with khali on 4 and 8) and Jhumra.
 */

/** A bol, or several bols sharing one matra (Ektal's DhaGe, TiRaKiTa). REST is a matra, or
 * part of one, with no stroke: Deepchandi's silent beats, Jhumra's –Dha. */
export type Bol = string | readonly string[];
export const REST = '-';

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
  jhampak: { name: 'Jhampak', bn: 'ঝম্পক', vib: [3, 2], marks: ['X', '2'], bols: ['Dhin', 'Dhin', 'Na', 'Dhin', 'Na'] },
  shashthi: { name: 'Shashthi', bn: 'ষষ্ঠী', vib: [2, 4], marks: ['X', '2'], bols: ['Dha', 'Tet', ['Dha', 'Ge'], ['Te', 'Te'], 'Dhin', 'Na'] },
  rupakra: {
    name: 'Rupakra', bn: 'রূপকড়া', vib: [3, 2, 3], marks: ['X', '2', '3'],
    bols: ['Dhin', 'Dhin', ['Dha', 'Ge'], 'Tin', ['Ta', 'Ge'], 'Dhin', 'Dhin', ['Te', 'Te']],
  },
  nabatal: {
    name: 'Nabatal', bn: 'নবতাল', vib: [3, 2, 2, 2], marks: ['X', '2', '3', '4'],
    bols: ['Dha', 'Den', 'Ta', ['Te', 'Te'], ['Ka', 'Ta'], ['Ga', 'Di'], ['Ghe', 'Ne'], ['Dha', 'Ge'], ['Te', 'Te']],
  },
  ekadashi: {
    name: 'Ekadashi', bn: 'একাদশী', vib: [3, 2, 2, 4], marks: ['X', '2', '3', '4'],
    bols: ['Dha', 'Den', 'Ta', ['Te', 'Te'], ['Ka', 'Ta'], ['Ga', 'Di'], ['Ghe', 'Ne'], ['Dha', 'Ge'], ['Te', 'Te'], ['Ta', 'Ge'], ['Te', 'Te']],
  },
  nabapanchatal: {
    name: 'Nabapanchatal', bn: 'নবপঞ্চতাল', vib: [2, 4, 4, 4, 4], marks: ['X', '2', '3', '4', '5'],
    bols: [
      'Dha', 'Ge', 'Dha', 'Ge', 'Den', 'Ta', 'Kat', ['Ta', 'Ge'], 'Den', 'Ta',
      ['Te', 'Te'], 'Dha', 'Den', 'Ta', ['Te', 'Te'], ['Ka', 'Ta'], ['Ga', 'Di'], ['Ghe', 'Ne'],
    ],
  },
  khemta: { name: 'Khemta', bn: 'খেমটা', vib: [3, 3, 3, 3], marks: ['X', '2', '0', '3'], bols: ['Dha', 'Ti', 'Te', 'Na', 'Dhi', 'Na', 'Ta', 'Ti', 'Te', 'Dha', 'Dhi', 'Na'] },
  deepchandi: {
    name: 'Deepchandi', bn: 'দীপচন্দী', vib: [3, 4, 3, 4], marks: ['X', '2', '0', '3'],
    bols: ['Dha', 'Dhin', REST, 'Dha', 'Dha', 'Tin', REST, 'Ta', 'Tin', REST, 'Dha', 'Dha', 'Dhin', REST],
  },
  dhamar: {
    name: 'Dhamar', bn: 'ধামার', vib: [3, 2, 2, 3, 4], marks: ['X', '0', '2', '0', '3'],
    bols: ['Ka', 'Dhi', 'Ta', 'Dhi', 'Ta', 'Dha', REST, 'Ga', 'Di', 'Na', 'Di', 'Na', 'Ta', REST],
  },
  jhumra: {
    name: 'Jhumra', bn: 'ঝুমরা', vib: [3, 4, 3, 4], marks: ['X', '2', '0', '3'],
    bols: [
      'Dhin', [REST, 'Dha'], ['Ti', 'Ra', 'Ki', 'Ta'], 'Dhin', 'Dhin', ['Dha', 'Ge'], ['Ti', 'Ra', 'Ki', 'Ta'],
      'Tin', [REST, 'Ta'], ['Ti', 'Ra', 'Ki', 'Ta'], 'Dhin', 'Dhin', ['Dha', 'Ge'], ['Ti', 'Ra', 'Ki', 'Ta'],
    ],
  },
} as const satisfies Record<string, TaalDef>;

export type TaalId = keyof typeof TAALS;
export const TAAL_IDS = Object.keys(TAALS) as TaalId[];

/** The taal picker's groups, in order. */
export const TAAL_GROUPS: readonly { label: string; ids: readonly TaalId[] }[] = [
  { label: 'Common taals', ids: ['dadra', 'keherwa', 'rupak', 'jhaptal', 'ektal', 'teentaal'] },
  { label: "Tagore's own taals", ids: ['jhampak', 'shashthi', 'rupakra', 'nabatal', 'ekadashi', 'nabapanchatal'] },
  { label: 'More taals', ids: ['khemta', 'deepchandi', 'dhamar', 'jhumra'] },
];

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

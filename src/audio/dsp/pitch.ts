/** Pitch arithmetic (docs/DATA.md → saKey, saOct). Pure, so it is tested in Node. */

/** The song fields that set the pitch. */
export interface SaKey {
  /** Semitones above C, 0–11. */
  saKey: number;
  /** 3, 4 or 5 (Low, Middle, High). */
  saOct: number;
}

export function midiFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Sa as a MIDI note: 12 × (saOct + 1) + saKey (middle C is 60). */
export function saMidi(k: SaKey): number {
  return 12 * (k.saOct + 1) + k.saKey;
}

export function saFreq(k: SaKey): number {
  return midiFreq(saMidi(k));
}

/** A note's frequency: semitones and octaves above the song's Sa. */
export function noteFreq(k: SaKey, e: { semi: number; oct: number }): number {
  return midiFreq(saMidi(k) + e.semi + 12 * e.oct);
}

/** The dayan (tabla treble drum) is tuned to Sa, folded into 250–500 Hz. */
export function tablaPitch(saHz: number): number {
  let f = saHz;
  while (f < 250) f *= 2;
  while (f >= 500) f /= 2;
  return f;
}

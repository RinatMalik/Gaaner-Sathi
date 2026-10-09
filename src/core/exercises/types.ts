import type { TaalId } from '../taal/taals';

/** An exercise as compact Sa Re Ga lines; headings (`#`) are kept as written. */
export interface ExerciseSpec {
  id: string;
  title: string;
  taal: TaalId;
  tempo: number;
  /** Lyrics to generate: sargam syllables, or one "আ" held across the line. */
  lyr: 'sargam' | 'aa';
  lines: string[];
}

/** A built-in exercise, in the same shape as a song (read-only in the app). */
export interface Exercise {
  id: string;
  example: true;
  title: string;
  taal: TaalId;
  tempo: number;
  saKey: number;
  saOct: number;
  startOn: number;
  text: string;
}

import { buildExercise } from './generate';
import { EXERCISE_SPECS } from './specs';
import type { Exercise } from './types';

/** The Sa Re Ga typing example: shows that Latin letters work too (written by hand). */
const TYPING_EXAMPLE: Exercise = {
  id: 'ex-alankar-lat', example: true, title: 'Typing example · Sa Re Ga letters', taal: 'dadra', tempo: 120,
  saKey: 0, saOct: 4, startOn: 1,
  text:
    '# Aroha (going up)\n' +
    'S R G | R G M | G M P | M P D\n' +
    '> sa re ga | re ga ma | ga ma pa | ma pa dha\n' +
    "P D N | D N S' | S' - - | - - -\n" +
    '> pa dha ni | dha ni sa | sa – – | – – –\n' +
    '# Avaroha (coming down)\n' +
    "S' N D | N D P | D P M | P M G\n" +
    '> sa ni dha | ni dha pa | dha pa ma | pa ma ga\n' +
    'M G R | G R S | S - - | - - -\n' +
    '> ma ga re | ga re sa | sa – – | – – –\n',
};

/** The built-in exercises, in the order the app lists them. */
export const EXERCISES: readonly Exercise[] = [...EXERCISE_SPECS.map(buildExercise), TYPING_EXAMPLE];

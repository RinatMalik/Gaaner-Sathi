import { buildExercise } from './generate';
import { EXERCISE_SPECS } from './specs';
import type { Exercise } from './types';

/** The built-in exercises, in the order the app lists them (Rinat, 2026-10-14). */
export const EXERCISES: readonly Exercise[] = EXERCISE_SPECS.map(buildExercise);

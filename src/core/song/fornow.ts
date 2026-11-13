/**
 * What the top panel sets over every song's own (Rinat, 2026-11-13: "the four settings - your key,
 * tempo, taal, rhythm speed. In the top panel make them 'Until Refresh'"): the Sa, tempo, taal and
 * rhythm speed, the same for every song and every rewaz item opened, until the page is refreshed or
 * closed. Each goes back to the song's own by its own choice: "Song's own" in the Sa, taal and
 * rhythm speed lists, Default under the tempo. Never saved; a song's own settings are changed in
 * Edit notation. Pure, so it is tested in Node.
 */
import type { SpeedName } from '../taal/rhythm';
import type { TaalId } from '../taal/taals';
import type { SaOct } from './model';

export interface ForNow {
  sa?: { saKey: number; saOct: SaOct };
  tempo?: number;
  /** Another taal to play every song in, sections and all. */
  taal?: TaalId;
  speed?: SpeedName;
}

/**
 * The top panel's settings with `patch` laid over them: a field given `undefined` goes back to
 * each song's own. A key, taal or speed picked is kept even when it is the open song's own, as the
 * next song opened plays in it too (Rinat, 2026-11-13: "if i have a specific key chosen in the top
 * panel - it remains that key until i refreshed or changed back to songs own").
 */
export function withNow(now: ForNow, patch: ForNow): ForNow {
  const out: Record<string, unknown> = { ...now };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out as ForNow;
}

/**
 * What the top panel changes over a song's own settings (Rinat, 2026-11-10: "whatever i change in
 * here doesn't effect any song specific settings"): its Sa, tempo, taal and rhythm speed. Never saved:
 * each song keeps its own changes until the page is refreshed, and its own settings are changed in
 * Edit notation. Pure, so it is tested in Node.
 */
import type { TaalId } from '../taal/taals';
import type { SaOct } from './model';
import { SONG_SOUND_KEYS, type SongSound } from './sound';

export interface ForNow {
  sa?: { saKey: number; saOct: SaOct };
  tempo?: number;
  /** Another taal to play the whole song in. */
  taal?: TaalId;
  sound?: Partial<SongSound>;
}

/** What a song plays with when nothing is changed. */
export interface OwnSettings {
  sa: { saKey: number; saOct: number };
  tempo: number;
  sound: SongSound;
}

/**
 * Only what differs from the song's own: a control moved back to where the song has it is no
 * longer a change, so there is nothing to revert. A taal picked is kept even when it is the song's
 * own, as that still plays a song whose sections have taals of their own in that one taal.
 */
export function trimForNow(now: ForNow, own: OwnSettings): ForNow {
  const out: ForNow = {};
  if (now.sa && (now.sa.saKey !== own.sa.saKey || now.sa.saOct !== own.sa.saOct)) out.sa = now.sa;
  if (now.tempo != null && now.tempo !== own.tempo) out.tempo = now.tempo;
  if (now.taal) out.taal = now.taal;
  const sound: Record<string, unknown> = {};
  for (const k of SONG_SOUND_KEYS) {
    const v = now.sound?.[k];
    if (v !== undefined && JSON.stringify(v) !== JSON.stringify(own.sound[k])) sound[k] = v;
  }
  if (Object.keys(sound).length) out.sound = sound as Partial<SongSound>;
  return out;
}

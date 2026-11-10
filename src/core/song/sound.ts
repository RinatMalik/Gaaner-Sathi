/**
 * A song's own sound (docs/DATA.md → Song → sound): how fast its rhythm goes, which varies from
 * song to song (Rinat, 2026-11-10: "Leave the rythm speed as song specific though as I found it
 * varies between songs"). Everything else about the sound is the device's, the same for every
 * song: the reeds, the drone, the instrument, its side instruments and the fills since 2026-11-10
 * ("the day i want tabla, i would probably want tabla for all"); how loud the rhythm and the drone
 * are since 2026-11-09; the guide since 2026-10-13. Whatever older songs saved of those is ignored.
 * The field name matches the device setting, so a song's speed lies over it.
 */
import type { SpeedName } from '../taal/rhythm';

export type GuideLevel = 'full' | 'soft' | 'off';
export type BeatStyle = 'tabla' | 'dholak' | 'kit' | 'click' | 'off';
export type DroneType = 'tanpura' | 'harmonium';
/** The tanpura's first string: lower Pa, Ma or Ni. */
export type TanTune = 'P' | 'M' | 'N';
/** The rhythm styles that can have extra layers. */
export type LayerStyle = 'tabla' | 'dholak' | 'kit';

export interface SongSound {
  speed: SpeedName;
}

export const SONG_SOUND_KEYS = ['speed'] as const satisfies readonly (keyof SongSound)[];

/** What a song's rhythm speed can be. */
export const SPEED_CHOICES: readonly SpeedName[] = ['half', 'normal', 'double'];

/**
 * A stored or imported song's sound, checked: undefined when there is no speed that can be read,
 * so the device's setting shows through.
 */
export function cleanSound(v: unknown): Partial<SongSound> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const speed = (v as Record<string, unknown>).speed as SpeedName;
  return SPEED_CHOICES.includes(speed) ? { speed } : undefined;
}

/** A song's own settings out of a full set, to keep with it. */
export const soundOf = (s: SongSound): SongSound => ({ speed: s.speed });

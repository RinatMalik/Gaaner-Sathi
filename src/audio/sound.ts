/**
 * Sound settings (docs/DATA.md → Settings): the device's settings, which a song's own sound
 * (its harmonium, drone and rhythm, src/core/song/sound.ts) lies over. Field names match the
 * prototype's `swaralipi.prefs.v1`.
 */
import type { GuideLevel, SongSound } from '../core/song/sound';

export type { BeatStyle, DroneType, GuideLevel, TanTune } from '../core/song/sound';
/** When looping: guide every round, the first round only, or every other round. */
export type GuideLoop = 'all' | 'first' | 'alt';

/** A song's own sound (SongSound), then the practice settings, which every song shares. */
export interface SoundSettings extends SongSound {
  /** How loud the rhythm is, 0–1 (the prototype's name): the same for every song (2026-11-09). */
  tablaVol: number;
  /** On ('full'; 'soft' from before 2026-10-22) or muted ('off'). */
  guide: GuideLevel;
  /** How loud the guide is, 0–1, set by the top section's slider (Rinat, 2026-10-22); unset:
   * as 'full' or 'soft' said. */
  guideVol?: number;
  countIn: boolean;
  guideLoop: GuideLoop;
}

/** The prototype's defaults. */
export const DEFAULT_SOUND: SoundSettings = {
  guide: 'full', beat: 'tabla', tablaVol: 0.7, speed: 'normal', fills: true,
  layers: { tabla: [], dholak: [], kit: [] }, reeds: 3, droneType: 'tanpura', droneVol: 0, tanTune: 'P',
  countIn: true, guideLoop: 'all',
};

const GUIDE_LEVELS: Record<GuideLevel, number> = { full: 0.9, soft: 0.3, off: 0 };
/** The guide's gain: muted, or the slider's level of the prototype's Full (0.9). */
export const guideLevel = (s: SoundSettings): number =>
  s.guide === 'off' ? 0 : s.guideVol != null ? 0.9 * s.guideVol : (GUIDE_LEVELS[s.guide] ?? 0.9);
/** Where the guide's slider stands: its own level, or Full's or Soft's. */
export const guideSlider = (s: SoundSettings): number => s.guideVol ?? (s.guide === 'soft' ? 1 / 3 : 1);
/** Where the drone's slider stands, the same for every song (Rinat, 2026-11-09): as last set;
 * until then the usual sound's volume, or a half where that has no drone. */
export const droneLevelOf = (s: { droneLevel?: number; droneVol: number }): number => s.droneLevel ?? (s.droneVol > 0 ? s.droneVol : 0.5);
export const beatLevel = (s: SoundSettings): number => (s.beat === 'off' ? 0 : s.tablaVol);
export function droneLevels(s: SoundSettings): { harm: number; tan: number } {
  const v = s.droneVol || 0;
  return { harm: s.droneType === 'harmonium' ? v * 0.55 : 0, tan: s.droneType === 'tanpura' ? v * 0.9 : 0 };
}

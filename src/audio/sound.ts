/**
 * Sound settings (docs/DATA.md → Settings): device preferences today; in Phase 1 they can
 * also be saved with each song. Field names match the prototype's `swaralipi.prefs.v1`.
 */
import type { SpeedName } from '../core/taal/rhythm';

export type GuideLevel = 'full' | 'soft' | 'off';
export type BeatStyle = 'tabla' | 'dholak' | 'kit' | 'click' | 'off';
export type DroneType = 'tanpura' | 'harmonium';
/** The tanpura's first string: lower Pa, Ma or Ni. */
export type TanTune = 'P' | 'M' | 'N';
/** When looping: guide every round, the first round only, or every other round. */
export type GuideLoop = 'all' | 'first' | 'alt';

export interface SoundSettings {
  guide: GuideLevel;
  beat: BeatStyle;
  /** Rhythm volume, 0–1 (the prototype's name). */
  tablaVol: number;
  speed: SpeedName;
  fills: boolean;
  /** Extra percussion layers chosen for each rhythm style. */
  layers: Record<'tabla' | 'dholak' | 'kit', string[]>;
  reeds: 1 | 2 | 3;
  droneType: DroneType;
  /** 0 means no drone. */
  droneVol: number;
  tanTune: TanTune;
  countIn: boolean;
  guideLoop: GuideLoop;
  /** Tempo trainer: faster each round of a loop, up to rampMax. */
  ramp: boolean;
  rampStep: number;
  rampMax: number;
}

/** The prototype's defaults. */
export const DEFAULT_SOUND: SoundSettings = {
  guide: 'full', beat: 'tabla', tablaVol: 0.7, speed: 'normal', fills: true,
  layers: { tabla: [], dholak: [], kit: [] }, reeds: 3, droneType: 'tanpura', droneVol: 0, tanTune: 'P',
  countIn: true, guideLoop: 'all', ramp: false, rampStep: 4, rampMax: 160,
};

const GUIDE_LEVELS: Record<GuideLevel, number> = { full: 0.9, soft: 0.3, off: 0 };
export const guideLevel = (s: SoundSettings): number => GUIDE_LEVELS[s.guide] ?? 0.9;
export const beatLevel = (s: SoundSettings): number => (s.beat === 'off' ? 0 : s.tablaVol);
export function droneLevels(s: SoundSettings): { harm: number; tan: number } {
  const v = s.droneVol || 0;
  return { harm: s.droneType === 'harmonium' ? v * 0.55 : 0, tan: s.droneType === 'tanpura' ? v * 0.9 : 0 };
}

/**
 * A song's own sound (docs/DATA.md → Song → sound): its harmonium, drone and rhythm, saved
 * with the song since 2026-10-10 and set in Edit notation since 2026-10-13. How loud the
 * guide is, the count-in, the guide on repeats and the tempo trainer are practice settings,
 * the same for every song (a guide level saved with a song before 2026-10-13 is ignored).
 * Field names match the device settings, the prototype's `swaralipi.prefs.v1`, so a song's
 * sound lies over them.
 */
import { LAYERS, type LayerId, type SpeedName } from '../taal/rhythm';

export type GuideLevel = 'full' | 'soft' | 'off';
export type BeatStyle = 'tabla' | 'dholak' | 'kit' | 'click' | 'off';
export type DroneType = 'tanpura' | 'harmonium';
/** The tanpura's first string: lower Pa, Ma or Ni. */
export type TanTune = 'P' | 'M' | 'N';
/** The rhythm styles that can have extra layers. */
export type LayerStyle = 'tabla' | 'dholak' | 'kit';

export interface SongSound {
  reeds: 1 | 2 | 3;
  droneType: DroneType;
  /** 0 means no drone. */
  droneVol: number;
  tanTune: TanTune;
  beat: BeatStyle;
  /** Rhythm volume, 0–1 (the prototype's name). */
  tablaVol: number;
  speed: SpeedName;
  fills: boolean;
  /** Extra percussion layers chosen for each rhythm style. */
  layers: Record<LayerStyle, string[]>;
}

export const SONG_SOUND_KEYS = ['reeds', 'droneType', 'droneVol', 'tanTune', 'beat', 'tablaVol', 'speed', 'fills', 'layers'] as const satisfies readonly (keyof SongSound)[];

/** What each control can be set to. */
export const SOUND_CHOICES = {
  reeds: [1, 2, 3],
  droneType: ['tanpura', 'harmonium'],
  tanTune: ['P', 'M', 'N'],
  beat: ['tabla', 'dholak', 'kit', 'click', 'off'],
  speed: ['half', 'normal', 'double'],
} as const;
const LAYER_STYLES: readonly LayerStyle[] = ['tabla', 'dholak', 'kit'];

const oneOf = <T>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined);
const level = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined);

/** Each style's layers: known ones that fit the style, each once. */
function cleanLayers(v: unknown): Record<LayerStyle, string[]> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  const out = { tabla: [], dholak: [], kit: [] } as Record<LayerStyle, string[]>;
  for (const st of LAYER_STYLES) {
    const list = Array.isArray(r[st]) ? (r[st] as unknown[]) : [];
    for (const id of list) {
      if (typeof id !== 'string' || !Object.hasOwn(LAYERS, id) || out[st].includes(id)) continue;
      if ((LAYERS[id as LayerId].styles as readonly string[]).includes(st)) out[st].push(id);
    }
  }
  return out;
}

/**
 * A stored or imported song's sound, each field checked: a field that cannot be read is
 * left out, so the device's setting shows through. Undefined when nothing can be read.
 */
export function cleanSound(v: unknown): Partial<SongSound> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  const s: Partial<SongSound> = {
    reeds: oneOf(r.reeds, SOUND_CHOICES.reeds),
    droneType: oneOf(r.droneType, SOUND_CHOICES.droneType),
    droneVol: level(r.droneVol),
    tanTune: oneOf(r.tanTune, SOUND_CHOICES.tanTune),
    beat: oneOf(r.beat, SOUND_CHOICES.beat),
    tablaVol: level(r.tablaVol),
    speed: oneOf(r.speed, SOUND_CHOICES.speed),
    fills: typeof r.fills === 'boolean' ? r.fills : undefined,
    layers: cleanLayers(r.layers),
  };
  for (const k of SONG_SOUND_KEYS) if (s[k] === undefined) delete s[k];
  return Object.keys(s).length ? s : undefined;
}

/** A song's own settings out of a full set, to keep with it (layers copied). */
export function soundOf(s: SongSound): SongSound {
  return {
    reeds: s.reeds, droneType: s.droneType, droneVol: s.droneVol, tanTune: s.tanTune,
    beat: s.beat, tablaVol: s.tablaVol, speed: s.speed, fills: s.fills,
    layers: { tabla: [...(s.layers.tabla || [])], dholak: [...(s.layers.dholak || [])], kit: [...(s.layers.kit || [])] },
  };
}

/**
 * Full screen's background (Rinat, 2026-11-01: "animated colour intentisty chagne based on the
 * beats and the notes … behind all the panels, so you can only see this effect between the panels
 * int he empty section"): a glow behind the panels that flashes brighter on each beat and fades
 * through it, brightest on sam, then a tali, a khali, and least on the beats between; its colour
 * the note sounding, round the colour wheel from Sa's gold. It rests faint while nothing plays,
 * and does not flash with reduced motion. Its look is in styles.css (`.fullfx`).
 */
import type { ParsedSong } from '../core/notation/types';

export type BeatKind = 'sam' | 'tali' | 'khali' | '';

/** A taal beat's kind from its mark (X sam, 0 khali, a number a tali; none: within a vibhag). */
export function beatKind(mark: string | undefined): BeatKind {
  return mark == null ? '' : mark === 'X' ? 'sam' : mark === '0' ? 'khali' : 'tali';
}

/** How bright the glow flashes on a beat of each kind, of its brightest. */
export function beatGlow(kind: BeatKind): number {
  return kind === 'sam' ? 1 : kind === 'tali' ? 0.78 : kind === 'khali' ? 0.58 : 0.46;
}

/** The glow's hue for a note `semi` semitones above Sa: Sa gold (40°), each semitone 30° on. */
export function noteHue(semi: number): number {
  return (40 + 30 * (((semi % 12) + 12) % 12)) % 360;
}

/** The note starting in song beat g, else the one held through it; null for silence. */
export function noteAt(P: ParsedSong, byBeat: readonly (readonly number[])[], g: number): number | null {
  const ids = byBeat[g];
  if (!ids?.length) return null;
  const i = ids.find((k) => P.events[k]!.start >= g - 1e-9) ?? ids[0]!;
  return P.events[i]!.semi;
}

export interface FullFx {
  /** A beat sounds: its kind, the note in it (null: none, the colour stays), seconds a beat. */
  beat(kind: BeatKind, semi: number | null, spb: number): void;
}

export function initFullFx(el: HTMLElement, on: () => boolean): FullFx {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let anim: Animation | null = null;
  return {
    beat(kind, semi, spb) {
      if (semi != null) el.style.setProperty('--fxh', String(noteHue(semi)));
      if (!on() || still.matches || !el.animate) return;
      // The flash at the start (offset 0), fading back to the faint glow the page gives it (the
      // end left to the page's own opacity) over a little more than the beat (Rinat, 2026-11-01:
      // "increase the fade out time just a tad longer"), lingering bright a little before it
      // fades, the next beat's flash taking over as it all but rests.
      const top = parseFloat(getComputedStyle(el).getPropertyValue('--fxmax')) || 0.8;
      anim?.cancel();
      anim = el.animate([{ opacity: top * beatGlow(kind), offset: 0 }], { duration: Math.max(220, spb * 1250), easing: 'cubic-bezier(.2,.5,.4,1)' });
    },
  };
}

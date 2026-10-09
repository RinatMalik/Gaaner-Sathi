/**
 * Notation checker (docs/NOTATION.md → Checker). Advisory: its false-negative and
 * false-positive trade-offs are deliberate, and the exercise library must stay free of
 * warnings.
 */
import type { NoteUnit, ParsedSong } from './types';

/** The parts of a taal the checker needs. */
export interface TaalShape {
  cycle: number;
  starts: readonly number[];
}
export interface BarIssue {
  kind: 'bar' | 'line';
  line: number;
  bar: number;
  g: number;
  g2: number;
  len: number;
  /** The likely intended length, if one is near. */
  exp: number | null;
}
export interface OctaveIssue {
  kind: 'octave';
  line: number;
  notes: NoteUnit[];
  /** The octave move that would fix it: +1 or −1. */
  delta: number;
  g: number;
  g2: number;
}
export type CheckIssue = BarIssue | OctaveIssue;

/**
 * `off` is where the song starts in the taal (startOn − 1).
 * 1) Every bar, and every line with no bars, should end on a vibhag line. Each bar is
 *    judged on its own, so one extra beat is reported once instead of shifting every bar
 *    after it.
 * 2) A run of 1–3 notes that leaps 8+ semitones away from both neighbours and comes back,
 *    where moving it one octave puts it within 5 semitones of both, is a likely octave slip.
 */
export function checkNotation(P: ParsedSong, T: TaalShape, off: number): CheckIssue[] {
  const out: CheckIssue[] = [];
  const cyc = T.cycle;
  const vib = new Set(T.starts);
  const md = (a: number, n: number) => ((a % n) + n) % n;
  const snap = (x: number) => {
    let best = T.starts[0]!;
    let bd = Infinity;
    for (const v of T.starts) {
      for (const c of [v, v + cyc, v - cyc]) {
        const d = Math.abs(c - x);
        if (d < bd) {
          bd = d;
          best = md(c, cyc);
        }
      }
    }
    return best;
  };
  let vp = md(off, cyc);
  for (const nl of P.noteLines) {
    const n = nl.beats.length;
    const bounds = Array.from(new Set(Array.from(nl.bars).filter((x) => x > 0 && x < n))).sort((a, b) => a - b);
    bounds.push(n);
    let prev = 0;
    bounds.forEach((b, k) => {
      const len = b - prev;
      const end = md(vp + len, cyc);
      if (!vib.has(end)) {
        let exp: number | null = null;
        for (let d = 1; d <= cyc && exp == null; d++) {
          if (len - d > 0 && vib.has(md(vp + len - d, cyc))) exp = len - d;
          else if (vib.has(md(vp + len + d, cyc))) exp = len + d;
        }
        out.push({ kind: nl.bars.size ? 'bar' : 'line', line: nl.n, bar: k + 1, g: nl.start + prev, g2: nl.start + b - 1, len, exp });
        vp = snap(md(vp + len, cyc));
      } else vp = end;
      prev = b;
    });
  }
  for (const nl of P.noteLines) {
    const ns: { u: NoteUnit; g: number }[] = [];
    for (const b of nl.beats) for (const u of b.units) if (u.k === 'note') ns.push({ u, g: b.g });
    const ps = ns.map((x) => x.u.semi + 12 * x.u.oct);
    const far = (a: number, b: number) => Math.abs(ps[a]! - ps[b]!) >= 8;
    for (let i = 0; i < ps.length; i++) {
      let found = null as OctaveIssue | null;
      for (let len = 1; len <= 3 && i + len <= ps.length && !found; len++) {
        const j = i + len - 1;
        const hasL = i > 0;
        const hasR = j + 1 < ps.length;
        if (!hasL && !hasR) continue;
        if ((hasL && !far(i - 1, i)) || (hasR && !far(j, j + 1))) continue;
        let coherent = true;
        for (let k = i; k < j; k++) if (Math.abs(ps[k + 1]! - ps[k]!) > 7) coherent = false;
        if (!coherent) continue;
        let d: number;
        if (hasL && hasR) {
          const dl = Math.sign(ps[i]! - ps[i - 1]!);
          const dr = Math.sign(ps[j]! - ps[j + 1]!);
          if (dl !== dr) continue;
          d = -dl;
        } else if (len > 1) continue;
        else d = hasL ? -Math.sign(ps[i]! - ps[i - 1]!) : -Math.sign(ps[j]! - ps[j + 1]!);
        const sh = (k: number) => ps[k]! + 12 * d;
        // Leaping away and straight back to the same note (সা ধা সা, সা র্সা সা) is a
        // deliberate leap, not a slip.
        if (len === 1 && hasL && hasR && ps[i - 1] === ps[j + 1]) continue;
        // So is an exact octave jump onto its neighbour's note.
        if ((!hasL || sh(i) === ps[i - 1]) && (!hasR || sh(j) === ps[j + 1])) continue;
        if (hasL && Math.abs(sh(i) - ps[i - 1]!) > 5) continue;
        if (hasR && Math.abs(sh(j) - ps[j + 1]!) > 5) continue;
        if (!hasL && (j + 2 >= ps.length || !far(j, j + 2) || Math.abs(sh(j) - ps[j + 2]!) > 5)) continue;
        if (!hasR && (i - 2 < 0 || !far(i, i - 2) || Math.abs(sh(i) - ps[i - 2]!) > 5)) continue;
        const run = ns.slice(i, j + 1);
        if (run.some((x) => Math.abs(x.u.oct + d) > 2)) continue;
        found = { kind: 'octave', line: nl.n, notes: run.map((x) => x.u), delta: d, g: run[0]!.g, g2: run[run.length - 1]!.g };
      }
      if (found) {
        out.push(found);
        i += found.notes.length - 1;
      }
    }
  }
  return out;
}

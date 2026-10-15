/**
 * Undo for a song's notation (Rinat, 2026-10-15): one list for the text, whatever changed it
 * (the beat boxes, the note pad, free text, Join, Split, an octave, a heading, a line moved),
 * since the beat boxes and free text are two views of the same text. Before, the beat boxes
 * kept their own list, which missed changes made outside them (so an undo could take two steps
 * back) and was never emptied when another song opened. Pure, so it is tested in Node.
 */

export interface UndoStep {
  /** The text before the change. */
  text: string;
  /** Where the change was made (a beat box, a line of free text), or '' for a step of its own. */
  key: string;
}

/** Changes made in the same place within this long are one step. */
export const UNDO_JOIN_MS = 4000;
/** The most steps kept. */
export const UNDO_MAX = 200;

export class TextUndo {
  private steps: (UndoStep & { at: number })[] = [];

  /** The text was `old` before a change made at `key`. A change in the same place as the last,
   * within UNDO_JOIN_MS of it, is part of that step (typing on in one box or one line). */
  remember(old: string, key: string, now: number = Date.now()): void {
    const top = this.steps[this.steps.length - 1];
    if (top && key && top.key === key && now - top.at <= UNDO_JOIN_MS) {
      top.at = now;
      return;
    }
    this.steps.push({ text: old, key, at: now });
    if (this.steps.length > UNDO_MAX) this.steps.shift();
  }

  /** The last step taken back: the text to put back, and where its change was made. */
  undo(): UndoStep | null {
    const s = this.steps.pop();
    return s ? { text: s.text, key: s.key } : null;
  }

  get size(): number {
    return this.steps.length;
  }

  /** Another song opened: its text has a history of its own. */
  clear(): void {
    this.steps = [];
  }
}

/** Where two texts first differ, for the caret after an undo in free text. */
export function firstDifference(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

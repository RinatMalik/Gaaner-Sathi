/**
 * Beat boxes in the editor (docs/NOTATION.md → Beat boxes): one box per beat, grouped by the
 * taal's vibhags, a box for the words under each beat, and the headings as their own rows.
 * Typing a space (or a bar) moves to the next box; pasting "সা রা গা মা" fills a box each, and
 * a line of words pasted under the notes is split into syllables, one to each note.
 * A row is dragged by its number (or moved with ↑ ↓ on it); a tap on the number selects it, and
 * Copy puts copies of a line, or of the rows selected, at the end. Play plays one line.
 * Every change goes into the song text (src/core/notation/boxes.ts works it out), which the
 * Free text view shows as it is. The HTML builder is pure and tested in Node.
 */
import { addHeading, appendBeats, beatsTyped, boxRows, copyRowsToEnd, insertLines, insertText, moveRow, newRowShape, nextSpot, placeBeats, readableBeat, removeBeat, removeHeading, removeLine, setBeat, setHeading, setLyrics, type BoxRow, type BoxSpot, type NewAt } from '../core/notation/boxes';
import { fillWords, syllables } from '../core/notation/lyrics';
import { parseSong } from '../core/notation/parse';
import { setHeadingTempo } from '../core/notation/sections';
import type { ParsedSong } from '../core/notation/types';
import type { TaalInfo } from '../core/taal/taals';
import { esc } from './view';

const atKey = (at: NewAt) => ('end' in at ? 'end' : String(at.after));
const input = (key: string, cls: string, value: string, label: string, extra = '') =>
  '<input class="' + cls + '" data-key="' + key + '" value="' + esc(value) + '" aria-label="' + esc(label) + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' + extra + '>';

/** The handle of row r (of rowBlocks): its line number, or # for a heading. A tap selects the
 * row (for copying several); dragging it, or ↑ ↓, moves it. */
const grip = (r: number, num: string, what: string, sel: boolean) =>
  '<button type="button" class="bxln bxgrip" data-r="' + r + '" aria-pressed="' + sel + '" aria-label="' + esc(what) + ': select it, or drag it (or press ↑ ↓) to move it" title="Tap to select · drag to move">' +
  '<span>' + esc(num) + '</span><span class="bxdots" aria-hidden="true">' + (sel ? '✓' : '⠿') + '</span></button>';

/** The rows as HTML. `verses`: how many word rows each notes line shows (at least one);
 * `selected`: the rows selected (rowBlocks indices). */
export function boxesHTML(rows: readonly BoxRow[], T: TaalInfo, verses: (n: number, written: number) => number, selected: ReadonlySet<number> = new Set()): string {
  let html = '';
  let rk = 0;
  const open = (cls: string, extra = '') => '<div class="bxrow ' + cls + (selected.has(rk) ? ' sel' : '') + '"' + extra + '>';
  for (const r of rows) {
    if (r.kind === 'head') {
      html += open('bxhead') + grip(rk, '#', 'Heading', selected.has(rk++)) +
        input('h:' + r.k, 'bxh', r.label, 'Heading', ' placeholder="Heading, such as স্থায়ী or অন্তরা"') +
        '<label class="bxtl">tempo ' + input('t:' + r.k, 'bxt', r.tempo != null ? String(r.tempo) : '', 'Tempo of this section', ' type="number" min="30" max="240" inputmode="numeric" placeholder="song’s"') + '</label>' +
        '<button type="button" class="bxdel" data-act="delhead" data-k="' + r.k + '" aria-label="Remove this heading">×</button></div>';
      continue;
    }
    const nv = r.kind === 'notes' ? verses(r.n, r.verses) : 0;
    const cells: { p: number; html: string }[] = [];
    if (r.kind === 'notes') {
      const where = (j: number) => 'Line ' + (r.n + 1) + ', beat ' + (j + 1);
      for (const b of r.beats) {
        let ly = '';
        for (let v = 0; v < nv; v++) ly += input('l:' + r.n + ':' + v + ':' + b.j, 'lx', b.lyrics[v] ?? '', where(b.j) + ', words' + (nv > 1 ? ' ' + (v + 1) : ''));
        cells.push({ p: b.p, html: '<span class="bxcell' + (b.err ? ' bad' : '') + '"' + (b.err ? ' title="' + esc(b.err) + '"' : '') + '><span class="bxmark">' + (T.markAt.get(b.p) ?? '') + '</span>' + input('b:' + r.n + ':' + b.j, 'bx', b.src, where(b.j)) + ly + '</span>' });
      }
      r.ghosts.forEach((g, i) => cells.push({ p: g.p, html: ghostCell('g:' + r.n + ':' + g.j, T, g.p, i === 0, where(g.j), nv) }));
    } else {
      r.ghosts.forEach((g, i) => cells.push({ p: g.p, html: ghostCell('n:' + atKey(r.at) + ':' + g.j, T, g.p, i === 0, 'New line, beat ' + (g.j + 1), 0) }));
    }
    // Vibhags: a group starts at each vibhag line (and at the start of the row).
    let groups = '';
    cells.forEach((c, i) => {
      if (i === 0 || T.markAt.has(c.p)) groups += (i ? '</span>' : '') + '<span class="bxgrp">';
      groups += c.html;
    });
    if (cells.length) groups += '</span>';
    if (r.kind === 'notes') {
      html += open('bxnotes', ' data-n="' + r.n + '"') + grip(rk, String(r.n + 1), 'Line ' + (r.n + 1), selected.has(rk++)) + '<div class="bxbeats">' + groups + '</div>' +
        '<span class="bxacts"><button type="button" class="bxdel" data-act="delline" data-n="' + r.n + '" aria-label="Remove line ' + (r.n + 1) + '" title="Remove this line">×</button>' +
        '<button type="button" class="bxadd bxplay" data-act="play" data-n="' + r.n + '" aria-label="Play line ' + (r.n + 1) + '" title="Play just this line">▶ Play</button>' +
        '<button type="button" class="bxadd" data-act="copy" data-n="' + r.n + '" aria-label="Copy line ' + (r.n + 1) + ' to the end" title="A copy of this line at the end of the song">Copy</button></span></div>';
    } else {
      html += '<div class="bxrow bxnew" data-at="' + atKey(r.at) + '"><span class="bxln" aria-hidden="true">+</span><div class="bxbeats">' + groups + '</div></div>';
    }
  }
  return html;
}

/** An empty box; only the first of a row takes typing (the others lead there). */
function ghostCell(key: string, T: TaalInfo, p: number, first: boolean, label: string, verses: number): string {
  return '<span class="bxcell ghost"><span class="bxmark">' + (T.markAt.get(p) ?? '') + '</span>' +
    input(key, 'bx', '', label, first ? '' : ' tabindex="-1"') + '<span class="lxgap" style="--v:' + verses + '"></span></span>';
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface BoxesHost {
  text(): string;
  /** Write the song text; `soon`: parse and redraw the sheets after a pause (while typing). */
  setText(text: string, soon: boolean): void;
  taal(): TaalInfo;
  /** startOn − 1. */
  off(): number;
  /** The beat being typed in, for the octave and beat buttons (−1 when none). */
  focusBeat(g: number): void;
  /** Play notes line n once (or stop it, if it is the line playing). */
  playLine(n: number): void;
}

export interface Boxes {
  /** Draw again if the text changed elsewhere. */
  refresh(): void;
  /** Draw now (a song opened, the view shown). */
  render(): void;
  /** The beat last typed in, or −1. */
  beat(): number;
  /** Type a beat into the box last typed in (the note buttons), and move on. */
  type(token: string): void;
  /** A new line after the line last typed in (the New line button, Enter). */
  newLine(): void;
  /** Go to the box of a beat (the preview, the checker). */
  showBeat(g: number): void;
  undo(): boolean;
  /** The line playing on its own (−1: none), for its Play button. */
  linePlaying(n: number): void;
  /** The beat sounding now (−1: none), lit in its box. */
  markBeat(g: number): void;
}

export function initBoxes(host: BoxesHost): Boxes {
  const box = document.querySelector('#boxes') as HTMLElement;
  /** The text as last drawn or written here. */
  let drawn = '';
  /** An empty row asked for after a line; a line being typed from an empty row; extra word rows. */
  let pending: number | null = null;
  let grow: { n: number; to: number } | null = null;
  const extraVerse = new Set<number>();
  /** The beat box last typed in. */
  let lastKey = '';
  /** Undo: the text before each change, and the box it was made in. */
  const undoStack: { text: string; key: string; at: number }[] = [];
  /** The song as last drawn; the rows selected (rowBlocks indices); the line playing on its own
   * and the beat sounding, kept across drawing again. */
  let drawnP: ParsedSong | null = null;
  const sel = new Set<number>();
  let playingLine = -1;
  let beatNow = -1;

  const parsed = (): ParsedSong => parseSong(host.text());
  const el = (key: string) => box.querySelector<HTMLInputElement>('[data-key="' + key + '"]');
  const parts = (key: string) => key.split(':');
  const atOf = (s: string): NewAt => (s === 'end' ? { end: true } : { after: +s });

  /** What the boxes were drawn from: the text, the taal and where the song starts in it. */
  const shapeOf = () => host.text() + '\u0000' + host.taal().id + '\u0000' + host.off();
  let rendering = false;

  function render(focus?: { key: string; select?: boolean; caret?: number }): void {
    const text = host.text();
    const P = parseSong(text);
    drawn = shapeOf();
    if (pending != null && pending > P.noteLines.length - 1) pending = null;
    const rows = boxRows(text, P, host.taal(), host.off(), { pending, grow });
    drawnP = P;
    rendering = true;
    try {
      box.innerHTML = boxesHTML(rows, host.taal(), (n, written) => Math.max(1, written + (extraVerse.has(n) ? 1 : 0)), sel);
    } finally {
      rendering = false;
    }
    drawSelBar();
    showPlaying();
    lightBeat();
    if (focus) focusKey(focus.key, focus.select, focus.caret);
    markCurrent();
  }

  function markCurrent(): void {
    for (const e of box.querySelectorAll('.bx.cur')) e.classList.remove('cur');
    if (lastKey) el(lastKey)?.classList.add('cur');
  }

  function focusKey(key: string, select = true, caret?: number): void {
    const e = el(key);
    if (!e) return;
    e.focus({ preventScroll: false });
    try {
      if (caret != null) e.setSelectionRange(caret, caret);
      else if (select) e.select();
    } catch {
      // number inputs have no selection
    }
  }

  /** The key of a spot after a change. */
  function spotKey(s: BoxSpot): string {
    if ('end' in s) return 'n:end:0';
    const P = parsed();
    const nl = P.noteLines[s.n];
    return nl && s.j < nl.beats.length ? 'b:' + s.n + ':' + s.j : 'g:' + s.n + ':' + s.j;
  }

  /** Write the text, remembering the old one for undo (one step per box typed in). */
  function write(text: string, key: string, soon: boolean): void {
    const old = host.text();
    if (text === old) return;
    clearSel();
    const top = undoStack[undoStack.length - 1];
    if (!top || top.key !== key || Date.now() - top.at > 4000) {
      undoStack.push({ text: old, key, at: Date.now() });
      if (undoStack.length > 200) undoStack.shift();
    } else top.at = Date.now();
    host.setText(text, soon);
    drawn = shapeOf();
  }

  function beatOf(key: string): number {
    const [k, n, j] = parts(key);
    if (k !== 'b') return -1;
    const nl = parsed().noteLines[+n!];
    return nl ? nl.start + +j! : -1;
  }

  // ── Typing ─────────────────────────────────────────────────────────────────

  /** How long line n may grow while it is being typed from an empty row. */
  const target = (n: number) => (grow && grow.n === n ? grow.to : 0);

  /** Go to a box: focus it if it is drawn, else draw again and focus it. */
  function goTo(key: string): void {
    lastKey = key;
    if (el(key)) focusKey(key);
    else render({ key });
    markCurrent();
  }

  /** Several beats into a box: place them, draw again, and go to the box after the last
   * (without focusing it for the note buttons, so a phone's keyboard stays down). */
  function place(key: string, tokens: string[], focus = true): void {
    const [k, a, j] = parts(key);
    const T = host.taal();
    const P = parsed();
    let from: { n: number; j: number } | { at: NewAt };
    let tgt = 0;
    if (k === 'n') {
      const at = atOf(a!);
      from = { at };
      grow = { n: 'end' in at ? P.noteLines.length : at.after + 1, to: newRowShape(P, T, host.off(), at).count };
      pending = null;
    } else {
      from = { n: +a!, j: +j! };
      tgt = target(+a!);
    }
    const r = placeBeats(host.text(), T, host.off(), from, tokens, tgt);
    if ('end' in r.next || (grow && r.next.n !== grow.n)) grow = null;
    write(r.text, key, false);
    lastKey = spotKey(r.next);
    render(focus ? { key: lastKey } : undefined);
  }

  /** An empty box now holds a beat: it becomes that beat's box where it is, so typing goes on
   * in it undisturbed (a phone's keyboard stays up). */
  function becomeBeat(e: HTMLInputElement, n: number, j: number): void {
    const key = 'b:' + n + ':' + j;
    e.dataset.key = key;
    e.removeAttribute('tabindex');
    e.closest('.bxcell')?.classList.remove('ghost');
    el('g:' + n + ':' + (j + 1))?.removeAttribute('tabindex');
    lastKey = key;
    markCurrent();
  }

  /** The first beat typed into the empty row at the end: the row becomes the new line. */
  function becomeLine(e: HTMLInputElement, n: number): void {
    const row = e.closest<HTMLElement>('.bxrow');
    if (!row) return;
    row.classList.replace('bxnew', 'bxnotes');
    row.dataset.n = String(n);
    delete row.dataset.at;
    const ln = row.querySelector('.bxln');
    if (ln) ln.outerHTML = grip(Array.from(box.querySelectorAll('.bxhead, .bxnotes')).indexOf(row), String(n + 1), 'Line ' + (n + 1), false);
    Array.from(row.querySelectorAll<HTMLInputElement>('input.bx')).forEach((x, i) => {
      x.dataset.key = (i === 0 ? 'b:' : 'g:') + n + ':' + i;
      x.setAttribute('aria-label', 'Line ' + (n + 1) + ', beat ' + (i + 1));
      if (i <= 1) x.removeAttribute('tabindex');
    });
    e.closest('.bxcell')?.classList.remove('ghost');
    lastKey = 'b:' + n + ':0';
    markCurrent();
  }

  /** One beat into a box (or an empty box), staying in it. */
  function putBeat(e: HTMLInputElement, key: string, tok: string, soon: boolean): void {
    const [k, a, j] = parts(key);
    const T = host.taal();
    const P = parsed();
    if (k === 'b') {
      const nl = P.noteLines[+a!];
      if (nl && nl.beats[+j!]) write(setBeat(host.text(), P, nl.start + +j!, tok), key, soon);
      return;
    }
    if (k === 'g') {
      write(appendBeats(host.text(), P, T, host.off(), +a!, [tok]), key, soon);
      becomeBeat(e, +a!, +j!);
      return;
    }
    const at = atOf(a!);
    const shape = newRowShape(P, T, host.off(), at);
    const n = 'end' in at ? P.noteLines.length : at.after + 1;
    write(insertLines(host.text(), P, T, host.off(), at, [tok], shape.count).text, key, soon);
    grow = { n, to: shape.count };
    pending = null;
    if ('end' in at) becomeLine(e, n);
    else {
      // A line put in between: the lines below it are numbered anew.
      const typed = e.value;
      lastKey = 'b:' + n + ':0';
      render({ key: lastKey, caret: typed.length });
      const b = el(lastKey);
      if (b) {
        b.value = typed;
        b.setSelectionRange(typed.length, typed.length);
      }
    }
  }

  function onBeatInput(e: HTMLInputElement, key: string): void {
    const v = e.value;
    const [k] = parts(key);
    if (/[\s|।॥‖]/.test(v)) {
      const toks = beatsTyped(v);
      if (toks.length > 1) {
        place(key, toks);
        return;
      }
      // One beat and a space (or only a space): keep the beat and move on to the next box.
      if (toks.length === 1) putBeat(e, key, toks[0]!, false);
      else if (k !== 'b') {
        e.value = '';
        return;
      }
      const now = k === 'b' ? key : lastKey;
      const [, a2, j2] = parts(now);
      const P = parsed();
      const cur = el(now);
      if (cur) cur.value = P.noteLines[+a2!]?.beats[+j2!]?.src ?? '';
      goTo(spotKey(nextSpot(P, host.taal(), host.off(), +a2!, +j2! + 1, target(+a2!))));
      return;
    }
    if (!v) return; // an emptied box is dealt with when it is left, or by Backspace
    putBeat(e, key, readableBeat(v), true);
  }

  function onLyricInput(e: HTMLInputElement, key: string): void {
    const [, n, v, j] = parts(key);
    const P = parsed();
    if (/\s/.test(e.value)) {
      const words = e.value.split(/\s+/);
      const typed = words.filter(Boolean);
      write(setLyrics(host.text(), P, +n!, +v!, +j!, typed.length ? typed : ['']), key, false);
      const nl = parseSong(host.text()).noteLines[+n!]!;
      const nextJ = Math.min(nl.beats.length - 1, +j! + Math.max(1, typed.length));
      render({ key: 'l:' + n + ':' + v + ':' + nextJ });
      return;
    }
    write(setLyrics(host.text(), P, +n!, +v!, +j!, [e.value]), key, true);
  }

  /** Words pasted into a word box: split into sung syllables and laid one to each note, from
   * this box on through the lines after it. */
  function pasteWords(key: string, txt: string): boolean {
    const [, n, v, j] = parts(key);
    const syl = syllables(txt);
    const r = fillWords(host.text(), +n!, +v!, +j!, syl);
    if (!r.placed) return false;
    write(r.text, key, false);
    render({ key: 'l:' + r.next.n + ':' + v + ':' + r.next.j, caret: 0 });
    const rest = syl.slice(r.placed);
    note(
      (r.placed === 1 ? '1 syllable' : r.placed + ' syllables') + ' placed, one to each note. ' +
        (rest.length ? 'No notes left for: ' + rest.join(' ') + '.' : 'Type over any that should go elsewhere.'),
    );
    return true;
  }

  /** A word about the last paste, under the boxes, for a while. */
  let noteTimer = 0;
  function note(text: string): void {
    const p = document.querySelector<HTMLElement>('#bxNote');
    if (!p) return;
    p.textContent = text;
    p.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => (p.hidden = true), 12000);
  }

  function onHeadInput(e: HTMLInputElement, key: string): void {
    const [, k] = parts(key);
    write(setHeading(host.text(), +k!, e.value), key, true);
  }

  function onTempoChange(e: HTMLInputElement, key: string): void {
    const [, k] = parts(key);
    const lines = host.text().split('\n');
    let seen = 0;
    let line = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i]!.trim()[0] === '#' && seen++ === +k!) line = i;
    if (line < 0) return;
    const n = Math.round(+e.value);
    write(setHeadingTempo(host.text(), line + 1, e.value.trim() && n > 0 ? n : null), key, false);
    render();
  }

  /** A box being left: an emptied beat becomes a hold, or goes if it was the last of its line;
   * a heading left empty goes. */
  function leave(e: HTMLInputElement, key: string, to: EventTarget | null): void {
    if (rendering || !e.isConnected) return;
    const [k, a, j] = parts(key);
    if (k === 'h' && !e.value.trim()) {
      if (to instanceof Node && e.closest('.bxrow')?.contains(to)) return;
      const text = host.text();
      const lines = text.split('\n');
      let seen = 0;
      for (const l of lines) if (l.trim()[0] === '#' && seen++ === +a! && !l.trim().replace(/^#+\s*/, '')) {
        write(removeHeading(text, +a!), key, false);
        render();
        return;
      }
      return;
    }
    if (k !== 'b') return;
    const P = parsed();
    const nl = P.noteLines[+a!];
    const b = nl?.beats[+j!];
    if (!nl || !b) return;
    if (!e.value.trim()) {
      const last = +j! === nl.beats.length - 1;
      write(last ? removeBeat(host.text(), P, b.g) : setBeat(host.text(), P, b.g, '-'), key, false);
      requestAnimationFrame(() => render(activeFocus()));
    } else if (e.value !== b.src) e.value = b.src;
  }

  /** Where the focus is now, to put it back after drawing again. */
  function activeFocus(): { key: string; caret?: number } | undefined {
    const a = document.activeElement as HTMLInputElement | null;
    const key = a && box.contains(a) ? a.dataset.key : undefined;
    if (!key) return undefined;
    let caret: number | undefined;
    try {
      caret = a!.selectionStart ?? undefined;
    } catch {
      caret = undefined;
    }
    return { key, caret };
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  function onKey(ev: KeyboardEvent, e: HTMLInputElement, key: string): void {
    const [k, a, j] = parts(key);
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
      ev.preventDefault();
      undo();
      return;
    }
    if (ev.isComposing) return;
    const beatish = k === 'b' || k === 'g' || k === 'n';
    if (beatish && ev.key === 'Enter') {
      ev.preventDefault();
      if (k === 'n') return;
      pending = +a!;
      grow = null;
      render();
      const row = box.querySelector<HTMLElement>('.bxnew[data-at="' + a + '"]') ?? box.querySelector<HTMLElement>('.bxnew[data-at="end"]');
      const first = row?.querySelector<HTMLInputElement>('input');
      if (first) {
        lastKey = first.dataset.key!;
        focusKey(lastKey);
      }
      return;
    }
    if (beatish && ev.key === 'Backspace' && !e.value && e.selectionStart === 0) {
      ev.preventDefault();
      const P = parsed();
      if (k === 'b') {
        const nl = P.noteLines[+a!]!;
        const g = nl.start + +j!;
        write(removeBeat(host.text(), P, g), key, false);
        const Q = parsed();
        const prev = +j! > 0 ? 'b:' + a + ':' + (+j! - 1) : +a! > 0 && Q.noteLines[+a! - 1] ? 'b:' + (+a! - 1) + ':' + (Q.noteLines[+a! - 1]!.beats.length - 1) : '';
        lastKey = prev;
        render(prev ? { key: prev, caret: 9999 } : undefined);
        const p = prev && el(prev);
        if (p) p.setSelectionRange(p.value.length, p.value.length);
        return;
      }
      if (k === 'g' && +j! > 0) {
        const prev = 'b:' + a + ':' + (+j! - 1);
        lastKey = prev;
        focusKey(prev, false, el(prev)?.value.length ?? 0);
      }
      return;
    }
    if (beatish && (ev.key === 'Tab' || ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      const back = ev.key === 'ArrowLeft' || (ev.key === 'Tab' && ev.shiftKey);
      // An arrow first ends a selection (→ then typing adds a note to the beat), and moves to
      // the next box from the edge.
      const caret = e.selectionStart === e.selectionEnd;
      if (ev.key === 'ArrowRight' && (!caret || e.selectionEnd !== e.value.length)) return;
      if (ev.key === 'ArrowLeft' && (!caret || e.selectionStart !== 0)) return;
      const all = Array.from(box.querySelectorAll<HTMLInputElement>('input.bx:not([tabindex="-1"])'));
      const i = all.indexOf(e);
      const to = all[i + (back ? -1 : 1)];
      if (!to) return;
      ev.preventDefault();
      to.focus();
      if (ev.key === 'Tab') to.select();
      else to.setSelectionRange(back ? to.value.length : 0, back ? to.value.length : 0);
      return;
    }
    if (k === 'b' && ev.key === 'ArrowDown') {
      const l = el('l:' + a + ':0:' + j);
      if (l) {
        ev.preventDefault();
        l.focus();
      }
    }
    if (k === 'l' && ev.key === 'Enter' && !ev.isComposing) {
      // The next row of words (a verse), made when this is the last one written.
      ev.preventDefault();
      const [, n, v, j] = parts(key);
      if (!el('l:' + n + ':' + (+v! + 1) + ':' + j) && e.value.trim()) {
        extraVerse.add(+n!);
        render();
      }
      el('l:' + n + ':' + (+v! + 1) + ':' + j)?.focus();
      return;
    }
    if (k === 'l' && ev.key === 'ArrowUp') {
      ev.preventDefault();
      el('b:' + a + ':' + parts(key)[3])?.focus();
    }
  }

  function undo(): boolean {
    const top = undoStack.pop();
    if (!top) return false;
    // Undone from a row's handle (after moving it): the focus stays on a handle there.
    const a = document.activeElement as HTMLElement | null;
    const onGrip = a && box.contains(a) && a.classList.contains('bxgrip') ? +a.dataset.r! : -1;
    host.setText(top.text, false);
    drawn = shapeOf();
    grow = null;
    pending = null;
    render({ key: top.key, select: false });
    if (onGrip >= 0) {
      const gs = grips();
      gs[Math.min(onGrip, gs.length - 1)]?.focus({ preventScroll: true });
    }
    return true;
  }

  // ── Moving and copying lines ───────────────────────────────────────────────

  /** Each move or copy is its own undo step. */
  let moves = 0;
  const grips = () => Array.from(box.querySelectorAll<HTMLElement>('.bxgrip'));

  /** Move row r (rowBlocks order) to before row `to`, and show where it went. */
  function moveTo(r: number, to: number, focus: boolean): void {
    const t = moveRow(host.text(), parsed(), r, to);
    if (t === host.text()) {
      if (focus) grips()[r]?.focus({ preventScroll: true });
      return;
    }
    write(t, 'x:move:' + ++moves, false);
    afterRows(to > r ? to - 1 : to, focus);
  }

  /** After rows moved or were copied: draw again and mark rows r to r + count − 1 (and focus the
   * first one's handle, so the arrow keys move it on). */
  function afterRows(r: number, focus: boolean, count = 1): void {
    grow = null;
    pending = null;
    extraVerse.clear();
    lastKey = '';
    render();
    const gs = grips().slice(r, r + count);
    const rows = gs.map((g) => g.closest<HTMLElement>('.bxrow')!);
    if (!rows.length) return;
    for (const row of rows) row.classList.add('moved');
    window.setTimeout(() => rows.forEach((row) => row.classList.remove('moved')), 1200);
    if (focus) gs[0]!.focus({ preventScroll: true });
    rows[rows.length - 1]!.scrollIntoView({ block: 'nearest' });
    rows[0]!.scrollIntoView({ block: 'nearest' });
  }

  /** Copies of rows at the end of the song. */
  function copyToEnd(rows: Iterable<number>): void {
    const r = copyRowsToEnd(host.text(), parsed(), rows);
    if (!r.count) return;
    // The copies come after every row there is now (writing the text draws the rows again).
    const at = grips().length;
    write(r.text, 'x:copy:' + ++moves, false);
    afterRows(at, false, r.count);
  }

  // ── Selecting rows ─────────────────────────────────────────────────────────

  /** A tap on a handle selects its row, or unselects it. */
  function toggleSel(r: number): void {
    if (sel.has(r)) sel.delete(r);
    else sel.add(r);
    const g = grips()[r];
    if (g) {
      g.setAttribute('aria-pressed', String(sel.has(r)));
      g.querySelector('.bxdots')!.textContent = sel.has(r) ? '✓' : '⠿';
      g.closest('.bxrow')?.classList.toggle('sel', sel.has(r));
    }
    drawSelBar();
  }
  function clearSel(): void {
    if (!sel.size) return;
    sel.clear();
    for (const g of box.querySelectorAll<HTMLElement>('.bxgrip[aria-pressed="true"]')) {
      g.setAttribute('aria-pressed', 'false');
      g.querySelector('.bxdots')!.textContent = '⠿';
    }
    for (const row of box.querySelectorAll('.bxrow.sel')) row.classList.remove('sel');
    drawSelBar();
  }
  /** While rows are selected, a bar at the top of the boxes copies them to the end. */
  function drawSelBar(): void {
    let bar = box.querySelector<HTMLElement>('.bxselbar');
    if (!sel.size) {
      bar?.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'bxselbar';
      bar.innerHTML = '<span class="bxselt" role="status"></span><button type="button" class="btn primary" data-act="copysel">Copy to the end</button><button type="button" class="btn" data-act="clearsel">Clear</button>';
      box.prepend(bar);
    }
    const lines = Array.from(sel).filter((r) => grips()[r]?.closest('.bxnotes')).length;
    const heads = sel.size - lines;
    bar.querySelector('.bxselt')!.textContent = [lines ? lines + (lines === 1 ? ' line' : ' lines') : '', heads ? heads + (heads === 1 ? ' heading' : ' headings') : ''].filter(Boolean).join(' and ') + ' selected';
  }

  // ── Playing a line ─────────────────────────────────────────────────────────

  function showPlaying(): void {
    for (const b of box.querySelectorAll<HTMLElement>('.bxplay')) {
      const on = +b.dataset.n! === playingLine;
      b.classList.toggle('on', on);
      b.textContent = on ? '■ Stop' : '▶ Play';
      b.setAttribute('aria-label', (on ? 'Stop line ' : 'Play line ') + (+b.dataset.n! + 1));
    }
  }
  function lightBeat(): void {
    for (const e of box.querySelectorAll('.bx.playing')) e.classList.remove('playing');
    const P = drawnP;
    const n = P && beatNow >= 0 ? P.lineOfBeat[beatNow] : undefined;
    if (P && n != null) el('b:' + n + ':' + (beatNow - P.noteLines[n]!.start))?.classList.add('playing');
  }

  /** A row being dragged by its handle. Positions are in the boxes' scrolled content. */
  let drag: {
    id: number; r: number; row: HTMLElement; grip: HTMLElement; mark: HTMLElement;
    y0: number; tops: number[]; bottoms: number[]; to: number; y: number; moved: boolean; raf: number;
  } | null = null;
  const contentTop = () => box.getBoundingClientRect().top + box.clientTop - box.scrollTop;

  function dragTo(clientY: number): void {
    const d = drag;
    if (!d) return;
    d.y = clientY;
    const y = clientY - contentTop();
    if (!d.moved && Math.abs(y - d.y0) < 5) return;
    if (!d.moved) d.row.classList.add('dragging');
    d.moved = true;
    d.row.style.transform = 'translateY(' + (y - d.y0) + 'px)';
    let to = d.tops.length;
    for (let i = 0; i < d.tops.length; i++) {
      if (i !== d.r && y < (d.tops[i]! + d.bottoms[i]!) / 2) {
        to = i;
        break;
      }
    }
    d.to = to;
    d.mark.hidden = to === d.r || to === d.r + 1;
    d.mark.style.top = (to < d.tops.length ? d.tops[to]! : d.bottoms[d.bottoms.length - 1]!) - 2 + 'px';
  }

  /** Near the top or bottom of the boxes (as far as they are on screen), they scroll while a
   * row is dragged, faster nearer the edge; at their end, the page scrolls if they go past it. */
  function edgeScroll(): void {
    const d = drag;
    if (!d) return;
    const b = box.getBoundingClientRect();
    const top = Math.max(b.top, 0);
    const bottom = Math.min(b.bottom, window.innerHeight);
    const edge = Math.min(48, (bottom - top) / 4);
    const depth = d.y < top + edge ? d.y - top - edge : d.y > bottom - edge ? d.y - bottom + edge : 0;
    if (depth && d.moved) {
      const step = Math.sign(depth) * Math.min(20, 4 + Math.abs(depth) / 3);
      const was = box.scrollTop;
      box.scrollTop += step;
      if (box.scrollTop === was && (step > 0 ? b.bottom > window.innerHeight : b.top < 0)) window.scrollBy(0, step);
      dragTo(d.y);
    }
    d.raf = requestAnimationFrame(edgeScroll);
  }

  /** When the last drag ended, so the click that follows it is not taken for a tap. */
  let dragEnded = 0;
  function endDrag(commit: boolean): void {
    const d = drag;
    if (!d) return;
    drag = null;
    if (d.moved) dragEnded = Date.now();
    cancelAnimationFrame(d.raf);
    window.removeEventListener('keydown', dragKey, true);
    d.mark.remove();
    d.row.classList.remove('dragging');
    d.row.style.transform = '';
    if (!d.row.isConnected || !commit) return;
    // The handle keeps the focus (a tap only focuses it), so ↑ ↓ and Ctrl+Z work on from there.
    if (!d.moved) d.grip.focus();
    else moveTo(d.r, d.to, true);
  }
  const dragKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' || !drag) return;
    ev.preventDefault();
    ev.stopPropagation();
    endDrag(false);
  };

  box.addEventListener('pointerdown', (ev) => {
    const g = (ev.target as Element).closest<HTMLElement>('.bxgrip');
    const row = g?.closest<HTMLElement>('.bxrow');
    if (!g || !row || drag || ev.button !== 0) return;
    ev.preventDefault();
    const top = contentTop();
    const rows = grips().map((x) => x.closest('.bxrow')!.getBoundingClientRect());
    const mark = document.createElement('div');
    mark.className = 'bxdrop';
    mark.hidden = true;
    box.append(mark);
    const r = +g.dataset.r!;
    drag = {
      id: ev.pointerId, r, row, grip: g, mark, y0: ev.clientY - top, y: ev.clientY, to: r, moved: false, raf: 0,
      tops: rows.map((x) => x.top - top), bottoms: rows.map((x) => x.bottom - top),
    };
    try {
      g.setPointerCapture(ev.pointerId);
    } catch {
      // a pointer already gone
    }
    window.addEventListener('keydown', dragKey, true);
    drag.raf = requestAnimationFrame(edgeScroll);
  });
  box.addEventListener('pointermove', (ev) => {
    if (drag && ev.pointerId === drag.id) dragTo(ev.clientY);
  });
  box.addEventListener('pointerup', (ev) => {
    if (drag && ev.pointerId === drag.id) endDrag(true);
  });
  box.addEventListener('pointercancel', (ev) => {
    if (drag && ev.pointerId === drag.id) endDrag(false);
  });

  // ── Events ─────────────────────────────────────────────────────────────────

  box.addEventListener('input', (ev) => {
    const e = ev.target as HTMLInputElement;
    const key = e.dataset.key;
    if (!key || (ev as InputEvent).isComposing) return;
    const k = key[0];
    if (k === 'b' || k === 'g' || k === 'n') onBeatInput(e, key);
    else if (k === 'l' && (ev as InputEvent).inputType === 'insertFromPaste' && e.value.trim()) {
      // A paste that came without a paste event (a phone keyboard's clipboard): the same.
      if (!pasteWords(key, e.value)) onLyricInput(e, key);
    } else if (k === 'l') onLyricInput(e, key);
    else if (k === 'h') onHeadInput(e, key);
  });
  // Phonetic keyboards finish a word here, without another input event.
  box.addEventListener('compositionend', (ev) => {
    const e = ev.target as HTMLInputElement;
    if (e.dataset.key) e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  box.addEventListener('change', (ev) => {
    const e = ev.target as HTMLInputElement;
    if (e.dataset.key?.startsWith('t:')) onTempoChange(e, e.dataset.key);
  });
  box.addEventListener('paste', (ev) => {
    const e = ev.target as HTMLInputElement;
    const key = e.dataset.key;
    const txt = ev.clipboardData?.getData('text/plain') ?? '';
    if (key?.startsWith('l:') && txt.trim()) {
      ev.preventDefault();
      pasteWords(key, txt);
      return;
    }
    if (!key || !/\n/.test(txt.trim())) return;
    // Several lines: they go in whole (headings, words and all), after this line.
    ev.preventDefault();
    const [k, a] = parts(key);
    const P = parsed();
    const at: NewAt = k === 'n' ? atOf(a!) : k === 'b' || k === 'g' || k === 'l' ? { after: +a! } : { end: true };
    write(insertText(host.text(), P, at, txt), key, false);
    grow = null;
    pending = null;
    render();
  });
  box.addEventListener('keydown', (ev) => {
    const e = ev.target as HTMLInputElement;
    if (e.classList.contains('bxgrip')) {
      const r = +e.dataset.r!;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        moveTo(r, ev.key === 'ArrowUp' ? r - 1 : r + 2, true);
      } else if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        undo();
      } else if (ev.key === 'Escape' && sel.size && !drag) {
        clearSel();
      }
      return;
    }
    if (e.dataset.key) onKey(ev, e, e.dataset.key);
  });
  box.addEventListener('focusin', (ev) => {
    const e = ev.target as HTMLInputElement;
    const key = e.dataset.key;
    if (!key) return;
    // An empty box past the first of its row leads to the first.
    if ((key[0] === 'g' || key[0] === 'n') && e.tabIndex === -1) {
      const first = e.closest('.bxbeats')?.querySelector<HTMLInputElement>('input.bx:not([tabindex="-1"])');
      const firstEmpty = Array.from(e.closest('.bxbeats')?.querySelectorAll<HTMLInputElement>('input.bx') ?? []).find((x) => !x.value && x.tabIndex !== -1);
      (firstEmpty ?? first)?.focus();
      return;
    }
    if (key[0] === 'b' || key[0] === 'g' || key[0] === 'n') {
      // Leaving the line being typed ends its longer row.
      if (grow && !(key[0] !== 'n' && +parts(key)[1]! === grow.n)) {
        grow = null;
        requestAnimationFrame(() => render(activeFocus()));
      }
      lastKey = key;
      markCurrent();
      host.focusBeat(beatOf(key));
    }
  });
  box.addEventListener('focusout', (ev) => {
    const e = ev.target as HTMLInputElement;
    if (e.dataset.key) leave(e, e.dataset.key, (ev as FocusEvent).relatedTarget);
  });
  box.addEventListener('click', (ev) => {
    const g = (ev.target as Element).closest<HTMLElement>('.bxgrip');
    if (g) {
      // A tap or a key (Enter, Space) on a handle; not the end of a drag.
      if (Date.now() > dragEnded + 400) toggleSel(+g.dataset.r!);
      return;
    }
    const b = (ev.target as Element).closest<HTMLElement>('button[data-act]');
    if (!b) return;
    const P = parsed();
    if (b.dataset.act === 'play') {
      host.playLine(+b.dataset.n!);
    } else if (b.dataset.act === 'copy') {
      const r = +(b.closest('.bxrow')?.querySelector<HTMLElement>('.bxgrip')?.dataset.r ?? -1);
      copyToEnd([r]);
    } else if (b.dataset.act === 'copysel') {
      copyToEnd(sel);
    } else if (b.dataset.act === 'clearsel') {
      clearSel();
    } else if (b.dataset.act === 'delline') {
      write(removeLine(host.text(), P, +b.dataset.n!), 'x:delline', false);
      extraVerse.clear();
      render();
    } else if (b.dataset.act === 'delhead') {
      write(removeHeading(host.text(), +b.dataset.k!), 'x:delhead', false);
      render();
    }
  });

  return {
    refresh() {
      if (shapeOf() !== drawn) {
        grow = null;
        pending = null;
        extraVerse.clear();
        render(activeFocus());
      }
    },
    render() {
      render(activeFocus());
    },
    beat: () => beatOf(lastKey),
    type(token: string) {
      let key = lastKey && el(lastKey) ? lastKey : '';
      if (!key) {
        const first = box.querySelector<HTMLInputElement>('.bxnew[data-at="end"] input');
        key = first?.dataset.key ?? '';
      }
      if (!key) return;
      const tokens = beatsTyped(token);
      if (!tokens.length) return;
      place(key, tokens, false);
    },
    newLine() {
      const key = lastKey && el(lastKey) ? lastKey : '';
      const [k, a] = parts(key);
      if (key && (k === 'b' || k === 'g')) pending = +a!;
      render();
      const row = key && (k === 'b' || k === 'g') ? box.querySelector<HTMLElement>('.bxnew[data-at="' + a + '"]') : null;
      const first = (row ?? box.querySelector<HTMLElement>('.bxnew[data-at="end"]'))?.querySelector<HTMLInputElement>('input');
      if (first) {
        lastKey = first.dataset.key!;
        markCurrent();
        first.scrollIntoView({ block: 'nearest' });
      }
    },
    showBeat(g: number) {
      const P = parsed();
      const n = P.lineOfBeat[g];
      if (n == null) return;
      const key = 'b:' + n + ':' + (g - P.noteLines[n]!.start);
      lastKey = key;
      focusKey(key);
      markCurrent();
      el(key)?.scrollIntoView({ block: 'nearest' });
    },
    undo,
    linePlaying(n: number) {
      playingLine = n;
      showPlaying();
    },
    markBeat(g: number) {
      if (g === beatNow) return;
      beatNow = g;
      lightBeat();
    },
  };
}

/** A heading added at the end, ready to name (the + Heading button). */
export const withNewHeading = (text: string): string => addHeading(text);

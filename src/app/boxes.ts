/**
 * Beat boxes in the editor (docs/NOTATION.md → Beat boxes): one box per beat, grouped by the
 * taal's vibhags, a box for the words under each beat, and the headings as their own rows.
 * Typing a space (or a bar) moves to the next box; pasting "সা রা গা মা" fills a box each.
 * Every change goes into the song text (src/core/notation/boxes.ts works it out), which the
 * Free text view shows as it is. The HTML builder is pure and tested in Node.
 */
import { addHeading, appendBeats, beatsTyped, boxRows, insertLines, insertText, newRowShape, nextSpot, placeBeats, readableBeat, removeBeat, removeHeading, removeLine, setBeat, setHeading, setLyrics, type BoxRow, type BoxSpot, type NewAt } from '../core/notation/boxes';
import { parseSong } from '../core/notation/parse';
import { setHeadingTempo } from '../core/notation/sections';
import type { ParsedSong } from '../core/notation/types';
import type { TaalInfo } from '../core/taal/taals';
import { esc } from './view';

const atKey = (at: NewAt) => ('end' in at ? 'end' : String(at.after));
const input = (key: string, cls: string, value: string, label: string, extra = '') =>
  '<input class="' + cls + '" data-key="' + key + '" value="' + esc(value) + '" aria-label="' + esc(label) + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' + extra + '>';

/** The rows as HTML. `verses`: how many word rows each notes line shows (at least one). */
export function boxesHTML(rows: readonly BoxRow[], T: TaalInfo, verses: (n: number, written: number) => number): string {
  let html = '';
  for (const r of rows) {
    if (r.kind === 'head') {
      html += '<div class="bxrow bxhead"><span class="bxln" aria-hidden="true">#</span>' +
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
      html += '<div class="bxrow bxnotes" data-n="' + r.n + '"><span class="bxln">' + (r.n + 1) + '</span><div class="bxbeats">' + groups + '</div>' +
        '<span class="bxacts"><button type="button" class="bxadd" data-act="verse" data-n="' + r.n + '" title="Another row of words (a verse)">+ words</button>' +
        '<button type="button" class="bxdel" data-act="delline" data-n="' + r.n + '" aria-label="Remove line ' + (r.n + 1) + '">×</button></span></div>';
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
    rendering = true;
    try {
      box.innerHTML = boxesHTML(rows, host.taal(), (n, written) => Math.max(1, written + (extraVerse.has(n) ? 1 : 0)));
    } finally {
      rendering = false;
    }
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
    if (ln) ln.textContent = String(n + 1);
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
      if (ev.key === 'ArrowRight' && e.selectionEnd !== e.value.length) return;
      if (ev.key === 'ArrowLeft' && e.selectionStart !== 0) return;
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
    if (k === 'l' && ev.key === 'ArrowUp') {
      ev.preventDefault();
      el('b:' + a + ':' + parts(key)[3])?.focus();
    }
  }

  function undo(): boolean {
    const top = undoStack.pop();
    if (!top) return false;
    host.setText(top.text, false);
    drawn = shapeOf();
    grow = null;
    pending = null;
    render({ key: top.key, select: false });
    return true;
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  box.addEventListener('input', (ev) => {
    const e = ev.target as HTMLInputElement;
    const key = e.dataset.key;
    if (!key || (ev as InputEvent).isComposing) return;
    const k = key[0];
    if (k === 'b' || k === 'g' || k === 'n') onBeatInput(e, key);
    else if (k === 'l') onLyricInput(e, key);
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
    const b = (ev.target as Element).closest<HTMLElement>('button[data-act]');
    if (!b) return;
    const P = parsed();
    if (b.dataset.act === 'verse') {
      extraVerse.add(+b.dataset.n!);
      render();
      const nl = P.noteLines[+b.dataset.n!];
      if (nl) {
        const rows = box.querySelectorAll<HTMLInputElement>('[data-key^="l:' + nl.n + ':"][data-key$=":0"]');
        rows[rows.length - 1]?.focus();
      }
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
  };
}

/** A heading added at the end, ready to name (the + Heading button). */
export const withNewHeading = (text: string): string => addHeading(text);

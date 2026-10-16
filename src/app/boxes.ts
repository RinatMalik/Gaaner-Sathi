/**
 * Beat boxes in the editor (docs/NOTATION.md → Beat boxes): one box per beat, grouped by the
 * taal's vibhags, a box for the words under each beat, and the headings as their own rows.
 * Typing a space (or a bar) moves to the next box; pasting "সা রা গা মা" fills a box each, and
 * a line of words pasted under the notes is split into syllables, one to each note.
 * A row is dragged by its number (or moved with ↑ ↓ on it), with the other rows selected if it is
 * one of them; a tap on the number, or on any empty space in the row, selects it. The rows
 * selected can be copied, to paste after the row selected (in this song or another). Each line
 * ends with buttons to play it, play from it to the end, and remove it. The first beat of each
 * vibhag is coloured for sam, khali or tali. A
 * heading can give its section a tempo and a taal of its own (taal pherta), which the rows
 * under it follow. Every change goes into the song text (src/core/notation/boxes.ts works it out), which the
 * Free text view shows as it is. The HTML builder is pure and tested in Node.
 */
import { addHeading, appendBeats, beatsTyped, boxRows, copyRows, insertLines, insertText, moveRows, newRowShape, nextSpot, pasteRows, placeBeats, readableBeat, removeBeat, removeHeading, removeLine, setBeat, setHeading, setLyrics, type BoxRow, type BoxSpot, type BoxTaal, type NewAt } from '../core/notation/boxes';
import { fillWords, syllables } from '../core/notation/lyrics';
import { parseSong } from '../core/notation/parse';
import { setHeadingTaal, setHeadingTempo } from '../core/notation/sections';
import { taalMap, type Taals } from '../core/notation/taalmap';
import type { ParsedSong } from '../core/notation/types';
import { isTaalId, TAAL_GROUPS, TAALS } from '../core/taal/taals';
import { esc } from './view';

const atKey = (at: NewAt) => ('end' in at ? 'end' : String(at.after));
const input = (key: string, cls: string, value: string, label: string, extra = '') =>
  '<input class="' + cls + '" data-key="' + key + '" value="' + esc(value) + '" aria-label="' + esc(label) + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' + extra + '>';

/** The handle of row r (of rowBlocks): its line number, or # for a heading, the full height of
 * the row. A tap selects the row (as does a tap on any empty space in it); dragging it, or
 * ↑ ↓, moves it. */
const grip = (r: number, num: string, what: string, sel: boolean) =>
  '<button type="button" class="bxln bxgrip" data-r="' + r + '" aria-pressed="' + sel + '" aria-label="' + esc(what) + ': select it, or drag it (or press ↑ ↓) to move it" title="Tap to select · drag to move">' +
  '<span>' + esc(num) + '</span></button>';

/** The icons on a row's buttons. */
const svg = (body: string) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
export const ICONS = {
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  from: svg('<path d="M3 6.5h11M3 11.5h11M3 16.5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 13.5v8l7-4z" fill="currentColor"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>'),
  del: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
};

/** The buttons at the end of notes line n, each the full height of the row: play this line,
 * play from here to the end, remove the line. */
const lineButtons = (n: number) =>
  '<span class="bxside">' +
  '<button type="button" class="bxbtn bxplay" data-act="play" data-n="' + n + '" aria-label="Play line ' + (n + 1) + '" title="Play this line">' + ICONS.play + '</button>' +
  '<button type="button" class="bxbtn bxfrom" data-act="from" data-n="' + n + '" aria-label="Play from line ' + (n + 1) + ' to the end" title="Play from here">' + ICONS.from + '</button>' +
  '<button type="button" class="bxbtn bxdel" data-act="delline" data-n="' + n + '" aria-label="Remove line ' + (n + 1) + '" title="Remove this line">' + ICONS.del + '</button></span>';

/** The first beat of each vibhag is coloured by its kind instead of marked X, 0 or a number
 * (Rinat, 2026-10-12): sam, khali, or another tali. */
const vibhag = (m: string | undefined) => (m == null ? '' : m === 'X' ? ' v-sam' : m === '0' ? ' v-khali' : ' v-tali');
const vibhagName = (m: string | undefined) => (m == null ? '' : m === 'X' ? ', sam' : m === '0' ? ', khali' : ', tali ' + m);

/** A heading's taal picker: the song's, or one of the taals for this section alone. */
const taalPicker = (k: number, id: string | undefined) =>
  '<label class="bxtl">taal <select class="bxtaal" data-key="a:' + k + '" aria-label="Taal of this section">' +
  '<option value=""' + (id ? '' : ' selected') + '>song’s</option>' +
  TAAL_GROUPS.map((g) => '<optgroup label="' + esc(g.label) + '">' +
    g.ids.map((t) => '<option value="' + t + '"' + (t === id ? ' selected' : '') + '>' + TAALS[t].name + ' · ' + TAALS[t].bn + '</option>').join('') + '</optgroup>').join('') +
  '</select></label>';

/** The rows as HTML, each in its own taal. `verses`: how many word rows each notes line shows
 * (at least one); `selected`: the rows selected (rowBlocks indices). */
export function boxesHTML(rows: readonly BoxRow[], verses: (n: number, written: number) => number, selected: ReadonlySet<number> = new Set()): string {
  let html = '';
  let rk = 0;
  const open = (cls: string, extra = '') => '<div class="bxrow ' + cls + (selected.has(rk) ? ' sel' : '') + '"' + extra + '>';
  for (const r of rows) {
    if (r.kind === 'head') {
      // The fields wrap among themselves, so the × stays at the end of the row, as on a line.
      html += open('bxhead') + grip(rk, '#', 'Heading', selected.has(rk++)) + '<span class="bxhf">' +
        input('h:' + r.k, 'bxh', r.label, 'Heading', ' placeholder="Heading, such as স্থায়ী or অন্তরা"') +
        '<label class="bxtl">tempo ' + input('t:' + r.k, 'bxt', r.tempo != null ? String(r.tempo) : '', 'Tempo of this section', ' type="number" min="30" max="240" inputmode="numeric" placeholder="song’s"') + '</label>' +
        taalPicker(r.k, r.taal) + '</span>' +
        '<span class="bxside"><button type="button" class="bxbtn bxdel" data-act="delhead" data-k="' + r.k + '" aria-label="Remove this heading" title="Remove this heading">' + ICONS.del + '</button></span></div>';
      continue;
    }
    const T = r.T;
    const nv = r.kind === 'notes' ? verses(r.n, r.verses) : 0;
    const cells: { p: number; html: string }[] = [];
    if (r.kind === 'notes') {
      const where = (j: number, p: number) => 'Line ' + (r.n + 1) + ', beat ' + (j + 1) + vibhagName(T.markAt.get(p));
      for (const b of r.beats) {
        let ly = '';
        for (let v = 0; v < nv; v++) ly += input('l:' + r.n + ':' + v + ':' + b.j, 'lx', b.lyrics[v] ?? '', 'Line ' + (r.n + 1) + ', beat ' + (b.j + 1) + ', words' + (nv > 1 ? ' ' + (v + 1) : ''));
        cells.push({ p: b.p, html: '<span class="bxcell' + vibhag(T.markAt.get(b.p)) + (b.err ? ' bad' : '') + '"' + (b.err ? ' title="' + esc(b.err) + '"' : '') + '>' + input('b:' + r.n + ':' + b.j, 'bx', b.src, where(b.j, b.p)) + ly + '</span>' });
      }
      r.ghosts.forEach((g, i) => cells.push({ p: g.p, html: ghostCell('g:' + r.n + ':' + g.j, T, g.p, i === 0, where(g.j, g.p), nv) }));
    } else {
      r.ghosts.forEach((g, i) => cells.push({ p: g.p, html: ghostCell('n:' + atKey(r.at) + ':' + g.j, T, g.p, i === 0, 'New line, beat ' + (g.j + 1) + vibhagName(T.markAt.get(g.p)), 0) }));
    }
    // Vibhags: a group starts at each vibhag line (and at the start of the row).
    let groups = '';
    cells.forEach((c, i) => {
      if (i === 0 || T.markAt.has(c.p)) groups += (i ? '</span>' : '') + '<span class="bxgrp">';
      groups += c.html;
    });
    if (cells.length) groups += '</span>';
    if (r.kind === 'notes') {
      html += open('bxnotes', ' data-n="' + r.n + '"') + grip(rk, String(r.n + 1), 'Line ' + (r.n + 1), selected.has(rk++)) + '<div class="bxbeats">' + groups + '</div>' + lineButtons(r.n) + '</div>';
    } else {
      html += '<div class="bxrow bxnew" data-at="' + atKey(r.at) + '"><span class="bxln" aria-hidden="true">+</span><div class="bxbeats">' + groups + '</div></div>';
    }
  }
  return html;
}

/** An empty box; only the first of a row takes typing (the others lead there). */
function ghostCell(key: string, T: BoxTaal, p: number, first: boolean, label: string, verses: number): string {
  return '<span class="bxcell ghost' + vibhag(T.markAt.get(p)) + '">' +
    input(key, 'bx', '', label, first ? '' : ' tabindex="-1"') + '<span class="lxgap" style="--v:' + verses + '"></span></span>';
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface BoxesHost {
  text(): string;
  /** Write the song text; `soon`: parse and redraw the sheets after a pause (while typing);
   * `key`: where the change was made, for undo (src/app/undo.ts). */
  setText(text: string, soon: boolean, key: string): void;
  /** Take back the last change to the text (wherever it was made); false when there is none. */
  undo(): boolean;
  /** The song's taal and the beat it starts on (sections may name taals of their own). */
  songTaal(): { taal: string; startOn: number };
  /** The beat being typed in, for the octave and beat buttons (−1 when none). */
  focusBeat(g: number): void;
  /** Play notes line n once (or stop it, if it is the line playing). */
  playLine(n: number): void;
  /** Play from notes line n to the end of the song (or stop, if that is playing). */
  playFrom(n: number): void;
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
  /** Go to the box of a beat (the preview, the checker; the next box after an octave, Join or
   * Split). `focus` false: only light it (on a phone, so its keyboard stays down). */
  showBeat(g: number, focus?: boolean): void;
  /** An undo put the text back: draw again, the keyboard on the box the change was made in. */
  restored(key: string): void;
  /** The line playing on its own, or (`from`) the line playing started from (−1: none), for
   * its button. */
  linePlaying(n: number, from?: boolean): void;
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
  /** The song as last drawn; the rows selected (rowBlocks indices); the line playing on its own
   * and the beat sounding, kept across drawing again. */
  let drawnP: ParsedSong | null = null;
  const sel = new Set<number>();
  let playingLine = -1;
  let playingFrom = false;
  let beatNow = -1;

  const parsed = (): ParsedSong => parseSong(host.text());
  const el = (key: string) => box.querySelector<HTMLInputElement>('[data-key="' + key + '"]');
  const parts = (key: string) => key.split(':');
  const atOf = (s: string): NewAt => (s === 'end' ? { end: true } : { after: +s });

  /** The song's taal map for a text (it changes as lines and headings do). */
  const taalsOf = (text: string, P: ParsedSong): Taals => {
    const st = host.songTaal();
    return taalMap(text, P, st.taal, st.startOn);
  };
  /** What the boxes were drawn from: the text, the taal and where the song starts in it. */
  const shapeOf = () => host.text() + '\u0000' + host.songTaal().taal + '\u0000' + host.songTaal().startOn;
  let rendering = false;

  function render(focus?: { key: string; select?: boolean; caret?: number }): void {
    const text = host.text();
    const P = parseSong(text);
    drawn = shapeOf();
    if (pending != null && pending > P.noteLines.length - 1) pending = null;
    const rows = boxRows(text, P, taalsOf(text, P), 0, { pending, grow });
    drawnP = P;
    rendering = true;
    try {
      box.innerHTML = boxesHTML(rows, (n, written) => Math.max(1, written + (extraVerse.has(n) ? 1 : 0)), sel);
    } finally {
      rendering = false;
    }
    centre();
    drawSelBar();
    showPlaying();
    lightBeat();
    if (focus) focusKey(focus.key, focus.select, focus.caret);
    markCurrent();
  }

  /** Each line's boxes centred between its number and its buttons, as one block as wide as the
   * longest line's, so the beats stay one under another (Rinat, 2026-10-16). Measured when the
   * boxes show (a hidden box measures nothing; they are measured again once shown). */
  function centre(): void {
    if (!box.offsetParent) return;
    let w = 0;
    for (const b of box.querySelectorAll<HTMLElement>('.bxnotes > .bxbeats, .bxnew > .bxbeats')) {
      let s = 0;
      for (const g of Array.from(b.children)) s += (g as HTMLElement).offsetWidth;
      w = Math.max(w, s);
    }
    if (w) box.style.setProperty('--bxw', Math.ceil(w) + 2 + 'px');
  }
  let shownW = 0;
  new ResizeObserver(() => {
    const w = box.clientWidth;
    if (w && w !== shownW) centre();
    shownW = w;
  }).observe(box);

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

  /** Write the text, saying which box the change was made in (for undo, kept with the song's
   * text by the host: one step per box typed in). */
  function write(text: string, key: string, soon: boolean): void {
    if (text === host.text()) return;
    clearSel();
    host.setText(text, soon, key);
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
    const P = parsed();
    const M = taalsOf(host.text(), P);
    let from: { n: number; j: number } | { at: NewAt };
    let tgt = 0;
    if (k === 'n') {
      const at = atOf(a!);
      from = { at };
      grow = { n: 'end' in at ? P.noteLines.length : at.after + 1, to: newRowShape(P, M, 0, at).count };
      pending = null;
    } else {
      from = { n: +a!, j: +j! };
      tgt = target(+a!);
    }
    const r = placeBeats(host.text(), taalsOf, 0, from, tokens, tgt);
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
    row.insertAdjacentHTML('beforeend', lineButtons(n));
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
    const P = parsed();
    const M = taalsOf(host.text(), P);
    if (k === 'b') {
      const nl = P.noteLines[+a!];
      if (nl && nl.beats[+j!]) write(setBeat(host.text(), P, nl.start + +j!, tok), key, soon);
      return;
    }
    if (k === 'g') {
      write(appendBeats(host.text(), P, M, 0, +a!, [tok]), key, soon);
      becomeBeat(e, +a!, +j!);
      return;
    }
    const at = atOf(a!);
    const shape = newRowShape(P, M, 0, at);
    const n = 'end' in at ? P.noteLines.length : at.after + 1;
    write(insertLines(host.text(), P, M, 0, at, [tok], shape.count).text, key, soon);
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
      goTo(spotKey(nextSpot(P, taalsOf(host.text(), P), 0, +a2!, +j2! + 1, target(+a2!))));
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

  /** The 1-based text line of heading k, or 0. */
  function headingLine(k: number): number {
    const lines = host.text().split('\n');
    let seen = 0;
    for (let i = 0; i < lines.length; i++) if (lines[i]!.trim()[0] === '#' && seen++ === k) return i + 1;
    return 0;
  }

  function onTempoChange(e: HTMLInputElement, key: string): void {
    const line = headingLine(+parts(key)[1]!);
    if (!line) return;
    const n = Math.round(+e.value);
    write(setHeadingTempo(host.text(), line, e.value.trim() && n > 0 ? n : null), key, false);
    render();
  }

  /** A heading's taal picked: written into the heading, or taken out for the song's. */
  function onTaalChange(e: HTMLSelectElement, key: string): void {
    const line = headingLine(+parts(key)[1]!);
    if (!line) return;
    write(setHeadingTaal(host.text(), line, isTaalId(e.value) ? e.value : null), key, false);
    render({ key, select: false });
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
      host.undo();
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

  function restored(key: string): void {
    // Undone from a row's handle (after moving it): the focus stays on a handle there.
    const a = document.activeElement as HTMLElement | null;
    const onGrip = a && box.contains(a) && a.classList.contains('bxgrip') ? +a.dataset.r! : -1;
    drawn = shapeOf();
    grow = null;
    pending = null;
    render({ key, select: false });
    if (onGrip >= 0) {
      const gs = grips();
      gs[Math.min(onGrip, gs.length - 1)]?.focus({ preventScroll: true });
    }
  }

  // ── Moving and copying lines ───────────────────────────────────────────────

  /** Each move or copy is its own undo step. */
  let moves = 0;
  const grips = () => Array.from(box.querySelectorAll<HTMLElement>('.bxgrip'));

  /** The rows that move with row r: the rows selected, if r is one of them (in order), else r. */
  const movingWith = (r: number): number[] => (sel.has(r) ? Array.from(sel).sort((a, b) => a - b) : [r]);

  /** Move rows (rowBlocks order) together to before row `to`, and show where they went; rows
   * that were selected stay selected, so they can be moved on. */
  function moveTo(rows: readonly number[], to: number, focus: boolean): void {
    const keep = rows.every((r) => sel.has(r));
    const m = moveRows(host.text(), parsed(), rows, to);
    if (m.text === host.text()) {
      if (focus) grips()[rows[0]!]?.focus({ preventScroll: true });
      return;
    }
    write(m.text, 'x:move:' + ++moves, false);
    if (keep) rows.forEach((_, i) => sel.add(m.at + i));
    afterRows(m.at, focus, rows.length);
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

  /** Rows copied, kept (across songs too) until something else is copied, to paste after the
   * row selected as often as wanted. Just after copying, the bar says how to paste, for a while. */
  let copied: { lines: string[]; count: number; what: string } | null = null;
  let justCopied = false;
  let copiedTimer = 0;

  /** "2 lines and 1 heading", for some rows. */
  function rowsText(rows: Iterable<number>): string {
    const gs = grips();
    const all = Array.from(rows);
    const lines = all.filter((r) => gs[r]?.closest('.bxnotes')).length;
    const heads = all.length - lines;
    return [lines ? lines + (lines === 1 ? ' line' : ' lines') : '', heads ? heads + (heads === 1 ? ' heading' : ' headings') : ''].filter(Boolean).join(' and ');
  }

  /** Copy rows (also to the device's clipboard, as text), ending the selection. */
  function copy(rows: Iterable<number>): void {
    const pick = Array.from(new Set(rows));
    const c = copyRows(host.text(), parsed(), pick);
    if (!c.count) return;
    copied = { lines: c.lines, count: c.count, what: rowsText(pick) };
    navigator.clipboard?.writeText(c.lines.join('\n')).catch(() => {});
    sel.clear();
    justCopied = true;
    clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      justCopied = false;
      drawSelBar();
    }, 6000);
    render(activeFocus());
  }

  /** The rows copied, after row r, as one undo step; they stay copied to paste again. */
  function paste(r: number): void {
    if (!copied || r < 0) return;
    justCopied = false;
    const t = pasteRows(host.text(), parsed(), r, copied.lines);
    if (t === host.text()) return;
    write(t, 'x:paste:' + ++moves, false);
    afterRows(r + 1, true, copied.count);
  }

  // ── Selecting rows ─────────────────────────────────────────────────────────

  /** A tap on a handle selects its row, or unselects it. */
  function toggleSel(r: number): void {
    if (sel.has(r)) sel.delete(r);
    else sel.add(r);
    const g = grips()[r];
    if (g) {
      g.setAttribute('aria-pressed', String(sel.has(r)));
      g.closest('.bxrow')?.classList.toggle('sel', sel.has(r));
    }
    drawSelBar();
  }
  function clearSel(): void {
    if (!sel.size) return;
    sel.clear();
    for (const g of box.querySelectorAll<HTMLElement>('.bxgrip[aria-pressed="true"]')) g.setAttribute('aria-pressed', 'false');
    for (const row of box.querySelectorAll('.bxrow.sel')) row.classList.remove('sel');
    drawSelBar();
  }
  /** Where a paste goes: after the last row selected. */
  const pasteAfter = () => (sel.size ? Math.max(...sel) : -1);

  /** While rows are selected, a bar at the top of the boxes: Copy them, Paste the rows copied
   * after the last one, Clear. Just after a copy, it says how to paste. */
  function drawSelBar(): void {
    let bar = box.querySelector<HTMLElement>('.bxselbar');
    if (!sel.size && !(copied && justCopied)) {
      bar?.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'bxselbar';
      box.prepend(bar);
    }
    const r = pasteAfter();
    const n = r >= 0 ? grips()[r]?.closest<HTMLElement>('.bxnotes')?.dataset.n : undefined;
    const said = sel.size
      ? rowsText(sel) + ' selected' + (copied ? ' · ' + copied.what + ' copied' : '')
      : copied!.what + ' copied. Tap the number of the line to paste after.';
    bar.innerHTML = '<span class="bxselt" role="status">' + esc(said) + '</span>' +
      (sel.size ? '<button type="button" class="btn' + (copied ? '' : ' primary') + '" data-act="copysel">Copy</button>' : '') +
      (sel.size && copied ? '<button type="button" class="btn primary" data-act="paste">Paste ' + (n != null ? 'after line ' + (+n + 1) : 'under the heading') + '</button>' : '') +
      (sel.size ? '<button type="button" class="btn" data-act="clearsel">Clear</button>' : '');
  }

  // ── Playing a line ─────────────────────────────────────────────────────────

  function showPlaying(): void {
    for (const b of box.querySelectorAll<HTMLElement>('.bxplay, .bxfrom')) {
      const from = b.classList.contains('bxfrom');
      const n = +b.dataset.n!;
      const on = n === playingLine && from === playingFrom;
      b.classList.toggle('on', on);
      b.innerHTML = on ? ICONS.stop : from ? ICONS.from : ICONS.play;
      b.setAttribute('aria-label', on ? 'Stop' : from ? 'Play from line ' + (n + 1) + ' to the end' : 'Play line ' + (n + 1));
      b.title = on ? 'Stop' : from ? 'Play from here' : 'Play this line';
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
    id: number; r: number; group: number[]; rows: HTMLElement[]; grip: HTMLElement; mark: HTMLElement;
    y0: number; tops: number[]; bottoms: number[]; to: number; y: number; moved: boolean; raf: number;
  } | null = null;

  /** Whether moving `group` to before row `to` would leave everything where it is. */
  function staysPut(group: readonly number[], to: number): boolean {
    let t = to;
    while (group.includes(t)) t++;
    const at = t - group.filter((g) => g < t).length;
    return group.every((g, i) => g === at + i);
  }
  const contentTop = () => box.getBoundingClientRect().top + box.clientTop - box.scrollTop;

  function dragTo(clientY: number): void {
    const d = drag;
    if (!d) return;
    d.y = clientY;
    const y = clientY - contentTop();
    if (!d.moved && Math.abs(y - d.y0) < 5) return;
    if (!d.moved) d.rows.forEach((row) => row.classList.add('dragging'));
    d.moved = true;
    for (const row of d.rows) row.style.transform = 'translateY(' + (y - d.y0) + 'px)';
    let to = d.tops.length;
    for (let i = 0; i < d.tops.length; i++) {
      if (!d.group.includes(i) && y < (d.tops[i]! + d.bottoms[i]!) / 2) {
        to = i;
        break;
      }
    }
    d.to = to;
    d.mark.hidden = staysPut(d.group, to);
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
    for (const row of d.rows) {
      row.classList.remove('dragging');
      row.style.transform = '';
    }
    if (!d.grip.isConnected || !commit) return;
    // The handle keeps the focus (a tap only focuses it), so ↑ ↓ and Ctrl+Z work on from there.
    if (!d.moved) d.grip.focus();
    else moveTo(d.group, d.to, true);
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
    const group = movingWith(r);
    const gs = grips();
    drag = {
      id: ev.pointerId, r, group, rows: group.map((i) => gs[i]!.closest<HTMLElement>('.bxrow')!), grip: g, mark, y0: ev.clientY - top, y: ev.clientY, to: r, moved: false, raf: 0,
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
    else if (e.dataset.key?.startsWith('a:')) onTaalChange(e as unknown as HTMLSelectElement, e.dataset.key);
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
      const ctrl = (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const group = movingWith(r);
        moveTo(group, ev.key === 'ArrowUp' ? group[0]! - 1 : group[group.length - 1]! + 2, true);
      } else if (ctrl && (ev.key.toLowerCase() === 'c' || ev.key.toLowerCase() === 'v')) {
        ev.preventDefault();
        if (ev.key.toLowerCase() === 'c') copy(sel.size ? sel : [r]);
        else paste(r);
      } else if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        host.undo();
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
  /** Where the last press began: a click that began in a box or on a button (a text selection
   * dragged out of a box, say) is not a tap on the row. */
  let pressedOn: Element | null = null;
  box.addEventListener('pointerdown', (ev) => (pressedOn = ev.target as Element), true);
  box.addEventListener('click', (ev) => {
    const t = ev.target as Element;
    const g = t.closest<HTMLElement>('.bxgrip');
    if (g) {
      // A tap or a key (Enter, Space) on a handle; not the end of a drag.
      if (Date.now() > dragEnded + 400) toggleSel(+g.dataset.r!);
      return;
    }
    const b = t.closest<HTMLElement>('button[data-act]');
    if (!b) {
      // A tap on any empty space in a heading or line selects it, or unselects it.
      const row = t.closest<HTMLElement>('.bxhead, .bxnotes');
      const field = 'input, select, textarea, label, button, .bxselbar';
      if (!row || t.closest(field) || pressedOn?.closest(field) || Date.now() <= dragEnded + 400) return;
      const rg = row.querySelector<HTMLElement>('.bxgrip');
      if (!rg) return;
      toggleSel(+rg.dataset.r!);
      rg.focus({ preventScroll: true });
      return;
    }
    const P = parsed();
    if (b.dataset.act === 'play') {
      host.playLine(+b.dataset.n!);
    } else if (b.dataset.act === 'from') {
      host.playFrom(+b.dataset.n!);
    } else if (b.dataset.act === 'copysel') {
      copy(sel);
    } else if (b.dataset.act === 'paste') {
      paste(pasteAfter());
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
        // With a mouse, the keyboard goes to the new line (Rinat, 2026-10-16: typing went
        // nowhere); on a phone it stays down, the pad typing there.
        if (matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
        markCurrent();
        first.scrollIntoView({ block: 'nearest' });
      }
    },
    showBeat(g: number, focus = true) {
      const P = parsed();
      const n = P.lineOfBeat[g];
      if (n == null) return;
      const key = 'b:' + n + ':' + (g - P.noteLines[n]!.start);
      lastKey = key;
      if (focus) focusKey(key);
      markCurrent();
      el(key)?.scrollIntoView({ block: 'nearest' });
    },
    restored,
    linePlaying(n: number, from = false) {
      playingLine = n;
      playingFrom = from;
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

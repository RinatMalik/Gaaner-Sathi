/**
 * The Practice view's lines (Rinat, 2026-10-15): the song as a vertical carousel, about seven
 * lines in view with the line being sung third, sliding on a line as each one plays. Beat by
 * beat, each line shows its words big with the notes small above them (a line without words
 * shows its notes big), and under them a pitch strip: a bar for each note at its height and,
 * while "Check my pitch" listens, the voice drawn over it. The line being sung is large, with a
 * tall strip, the beat sounding lit and a playhead moving through it; the lines around it are
 * small. Beside it, a taal figure draws each vibhag as a shape with a corner for each beat (a
 * square for four beats, a triangle for three, a stroke for two), the corner of the beat
 * sounding lit and the shapes traced round as the cycle goes. The HTML builders are pure and
 * tested in Node; initLines wires them to the page.
 */
import { asTaals, placeIn, type Taals } from '../core/notation/taalmap';
import type { NotesLine, ParsedSong } from '../core/notation/types';
import { eventsByBeat, foldOctave } from '../core/pitch/track';
import type { TaalInfo } from '../core/taal/taals';
import { beatNoteHTML, esc, type Script } from './view';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── Layout ───────────────────────────────────────────────────────────────────

/** How many beats go across: the song's longest line, halved until each beat has at least
 * `minCol` pixels (so a 16-beat Teentaal line goes over two rows of 8 on a phone). */
export function columnsFor(maxBeats: number, width: number, minCol: number): number {
  let c = Math.max(1, maxBeats);
  while (c > 1 && width / c < minCol) c = Math.ceil(c / 2);
  return c;
}

/** A line's pitch strip, in cents from Sa: two semitones above and below its notes, and at
 * least ten semitones tall, so a line of two notes is not drawn as a leap. */
export function stripRange(P: ParsedSong, n: number): { lo: number; hi: number } {
  const L = P.noteLines[n];
  let min = Infinity;
  let max = -Infinity;
  if (L) {
    for (const e of P.events) {
      if (e.start + e.dur <= L.start + 1e-9 || e.start >= L.end - 1e-9) continue;
      const c = 100 * (e.semi + 12 * e.oct);
      min = Math.min(min, c);
      max = Math.max(max, c);
    }
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 700;
  }
  let a = Math.floor(min / 100) - 2;
  let b = Math.ceil(max / 100) + 2;
  while (b - a < 10) {
    a--;
    if (b - a < 10) b++;
  }
  return { lo: 100 * a, hi: 100 * b };
}

/** Where a pitch is drawn in a strip (SVG units: 0 at the top, 100 at the bottom). */
export const stripY = (cents: number, r: { lo: number; hi: number }): number => clamp(100 - ((cents - r.lo) / (r.hi - r.lo)) * 100, 2, 98);

const kindOf = (m: string | undefined) => (m == null ? '' : m === 'X' ? 'v-sam' : m === '0' ? 'v-khali' : 'v-tali');

/** Whether a notes line has words under it. */
const hasWords = (L: NotesLine) => L.beats.some((b) => (b.lyrics || []).some((t) => t.trim()));

/** A beat's words, one row per verse; a held vowel (০ 0 - – —) drawn faded. */
function wordsHTML(rows: readonly string[] | undefined): string {
  const r = rows || [];
  if (!r.some((t) => t.trim())) return '<span class="ply"></span>';
  return '<span class="ply">' + r.map((t, i) => '<span class="' + (i ? 'plv2' : 'plv') + '">' + (/^[০0\-–—]+$/.test(t) ? '<span class="held">' + esc(t) + '</span>' : esc(t)) + '</span>').join('') + '</span>';
}

/**
 * Every heading and notes line of the song. A line: its number (a button that plays from
 * there) with room for what it is (now, next) and its score, then a cell per beat, laid out
 * `--cols` across by the page: the notes, the words, a mark for how the beat was sung, and the
 * pitch strip with a bar for each note sounding in the beat (inset where a note starts or ends,
 * so repeated notes show as two). The first beat of each vibhag is marked by its kind.
 */
export function linesHTML(P: ParsedSong, taals: TaalInfo | Taals, off: number, script: Script): string {
  const M = asTaals(taals, off);
  if (!P.noteLines.length) return '<div class="plempty">No notes yet. Type the first line from your diary in Edit notation.</div>';
  const byBeat = eventsByBeat(P);
  let html = '';
  for (const it of P.items) {
    if (it.type === 'head') {
      html += '<div class="plhd">' + esc(it.text) + '</div>';
      continue;
    }
    const r = stripRange(P, it.n);
    const run = M.line(it.n);
    const words = hasWords(it);
    let cells = '';
    for (const b of it.beats) {
      const p = placeIn(run, b.g).p;
      const kind = kindOf(run.T.markAt.get(p));
      let bars = '';
      for (const i of byBeat[b.g] || []) {
        const e = P.events[i]!;
        const a = Math.max(e.start, b.g);
        const z = Math.min(e.start + e.dur, b.g + 1);
        if (z - a <= 1e-9) continue;
        const x1 = (a - b.g) * 100 + (Math.abs(a - e.start) < 1e-9 ? 5 : 0);
        const x2 = (z - b.g) * 100 - (Math.abs(z - e.start - e.dur) < 1e-9 ? 5 : 0);
        const y = stripY(100 * (e.semi + 12 * e.oct), r).toFixed(1);
        bars += '<line class="nb" x1="' + x1.toFixed(1) + '" y1="' + y + '" x2="' + Math.max(x1 + 2, x2).toFixed(1) + '" y2="' + y + '"/>';
      }
      cells += '<div class="plb' + (kind ? ' vs ' + kind : '') + (b.err ? ' bad' : '') + '" data-b="' + b.g + '"' + (b.err ? ' title="' + esc(b.err) + '"' : '') + '>' +
        '<span class="pnt">' + beatNoteHTML(b, script) + '</span>' + (words ? wordsHTML(b.lyrics) : '') + '<span class="plg"></span>' +
        '<span class="plsw"><svg class="pls" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + bars + '<g class="pltr"></g></svg></span></div>';
    }
    html += '<div class="pll' + (words ? ' words' : '') + '" data-n="' + it.n + '" data-lo="' + r.lo + '" data-hi="' + r.hi + '">' +
      '<div class="pln"><button type="button" class="pl-n" data-n="' + it.n + '" aria-label="Play from line ' + (it.n + 1) + '">' + (it.n + 1) + '</button><span class="plst"></span><span class="plsc"></span></div>' +
      '<div class="plbeats">' + cells + '</div></div>';
  }
  return html;
}

// ── The taal figure ──────────────────────────────────────────────────────────

/** The corners of a vibhag's shape in a 24 × 24 box, a corner a beat, clockwise from the top
 * left (a square), the top (a triangle) or the left (a stroke, for two beats). */
export function shapeCorners(n: number): [number, number][] {
  if (n <= 1) return [[12, 12]];
  const R = n === 4 ? 9 * Math.SQRT2 : n === 2 ? 9 : 10;
  const a0 = n % 2 ? -Math.PI / 2 : -Math.PI / 2 - Math.PI / n;
  const dy = n === 3 ? 2.5 : 0;
  const r1 = (v: number) => Math.round(v * 100) / 100;
  return Array.from({ length: n }, (_, k) => {
    const a = a0 + (2 * Math.PI * k) / n;
    return [r1(12 + R * Math.cos(a)), r1(12 + R * Math.sin(a) + dy)] as [number, number];
  });
}

const pts = (c: readonly [number, number][]) => c.map((p) => p[0] + ',' + p[1]).join(' ');

/** The taal as shapes, one per vibhag, each a sam, tali or khali (drawn dashed, the empty
 * clap); every corner is a beat (`data-p`), sam's a little bigger. */
export function taalFigureHTML(T: TaalInfo): string {
  return '<span class="tf" role="img" aria-label="' + esc(T.name + ': ' + T.vib.join(' + ') + ' beats') + '">' + T.vib.map((n, k) => {
    const c = shapeCorners(n);
    const outline = n >= 3 ? '<polygon class="tfo" points="' + pts(c) + '"/>' : n === 2 ? '<polyline class="tfo" points="' + pts(c) + '"/>' : '';
    const dots = c.map((p, j) => '<circle class="tfv' + (j === 0 ? ' tf1' : '') + (T.starts[k]! + j === 0 ? ' tfsam' : '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (T.starts[k]! + j === 0 ? 3.4 : 2.6) + '" data-p="' + (T.starts[k]! + j) + '"/>').join('');
    return '<svg class="tfs ' + kindOf(T.marks[k]) + '" viewBox="-2 -2 28 28" aria-hidden="true">' + outline + '<polyline class="tfp" points=""/>' + dots + '</svg>';
  }).join('') + '</span>';
}

/** How far round each shape the cycle has gone at taal beat p (−1: not started): a shape
 * done is closed, the one sounding traced to the beat's corner, those to come empty. */
export function figureProgress(T: TaalInfo, p: number): string[] {
  return T.vib.map((n, k) => {
    const c = shapeCorners(n);
    const j = p - T.starts[k]!;
    if (p < 0 || j < 0) return '';
    if (j >= n) return pts(n >= 3 ? [...c, c[0]!] : c);
    return pts(c.slice(0, j + 1));
  });
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface LinesHost {
  parsed(): ParsedSong;
  taals(): Taals;
  script(): Script;
  /** The Practice view is showing. */
  shown(): boolean;
  /** How many lines to show (5, 7 or 9). */
  rows(): number;
}

export interface LinesUI {
  /** The song or the script changed: draw the lines again (when the view is showing). */
  render(): void;
  /** The view came into sight, or its size or settings changed. */
  refresh(): void;
  /** The line playing (or that playing would start at): shown third, large. `state`: what its
   * number says (Now, Paused, Start). */
  current(n: number, state: string, playing: boolean): void;
  /** Light song beat g in the line playing (−1: none). */
  beat(g: number): void;
  /** The playhead at fraction f of beat g (g < 0: hidden). */
  playhead(g: number, f: number): void;
  /** The taal the figure shows, and the beat of it sounding (−1: none). */
  taal(T: TaalInfo): void;
  taalBeat(p: number): void;
  /** The voice at fraction f of beat g in round `pass`: `cents` from Sa as drawn (`fold`: moved
   * by octaves into the strip), `cls` how close it is; null cents: no voice (a gap). */
  voice(g: number, pass: number, f: number, cents: number | null, fold: boolean, cls: string): void;
  /** Hide the voice's dot (playing paused or stopped). */
  voiceOff(): void;
  /** A line's score this run (NaN: not sung). */
  lineScore(n: number, score: number): void;
  /** A new run: forget the voice drawn and the scores. */
  clearRun(): void;
  /** The cells of song beat g, for the marks of how each beat was sung. */
  cells(g: number): readonly HTMLElement[];
}

interface Seg {
  cls: string;
  pts: string[];
  el: SVGPathElement;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const grade = (score: number) => (score >= 85 ? 'good' : score >= 60 ? 'ok' : 'off');

export function initLines(host: LinesHost): LinesUI {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const view = $('#plView');
  const list = $('#plList');
  /** The HTML drawn last, so the same song is not drawn again (a tempo written into a heading
   * redraws it, but nothing else changes). */
  let drawn = '';
  let dirty = true;
  let lines: HTMLElement[] = [];
  const cellsOf = new Map<number, HTMLElement[]>();
  let maxBeats = 1;
  /** Each line's beats, to know which lines go over more than one row. */
  let beatsOf: number[] = [];
  let cur = -1;
  let curState = '';
  let playingNow = false;
  let nowG = -1;
  let fig: { T: TaalInfo | null; el: HTMLElement | null; p: number } = { T: null, el: null, p: -1 };
  const scores = new Map<number, number>();
  /** The voice drawn: each cell's segments, each line's round, and the last point. */
  const segs = new Map<number, Seg[]>();
  const linePass = new Map<number, number>();
  let last: { n: number; g: number; x: number; y: number; cls: string } | null = null;
  const head = document.createElement('span');
  head.className = 'plph';
  head.setAttribute('aria-hidden', 'true');
  const dot = document.createElement('span');
  dot.className = 'pldot';
  dot.setAttribute('aria-hidden', 'true');

  function build(): void {
    dirty = false;
    const P = host.parsed();
    const html = linesHTML(P, host.taals(), 0, host.script());
    if (html === drawn && list.childElementCount) return;
    drawn = html;
    head.remove();
    dot.remove();
    fig.el?.remove();
    list.innerHTML = html;
    lines = Array.from(list.querySelectorAll<HTMLElement>('.pll'));
    cellsOf.clear();
    for (const el of list.querySelectorAll<HTMLElement>('.plb[data-b]')) {
      const g = +el.dataset.b!;
      if (!cellsOf.has(g)) cellsOf.set(g, []);
      cellsOf.get(g)!.push(el);
    }
    beatsOf = P.noteLines.map((l) => l.beats.length);
    maxBeats = Math.max(1, ...beatsOf);
    shownCols = 0;
    segs.clear();
    linePass.clear();
    last = null;
    // Put back what was showing.
    const n = cur;
    cur = -1;
    if (n >= 0) current(n, curState, playingNow);
    for (const [k, v] of scores) showScore(k, v);
    const g = nowG;
    nowG = -1;
    if (g >= 0) beat(g);
  }

  /** Columns and the view's height: the line playing at its full size and the rest small. A
   * line over more than one row (`--r`) shares the strip height of one among its rows. */
  let shownCols = 0;
  function layout(): void {
    if (!host.shown() || !view.clientWidth) return;
    const numW = lines[0]?.querySelector<HTMLElement>('.pln')?.offsetWidth ?? 48;
    const cols = columnsFor(maxBeats, view.clientWidth - numW - 2, matchMedia('(max-width:520px)').matches ? 34 : 46);
    if (cols !== shownCols) {
      shownCols = cols;
      list.style.setProperty('--cols', String(cols));
      lines.forEach((l, i) => {
        const r = Math.ceil((beatsOf[i] ?? 1) / cols);
        if (r > 1) l.style.setProperty('--r', String(r));
        else l.style.removeProperty('--r');
      });
    }
    const small = lines.filter((_, i) => i !== cur).map((l) => l.offsetHeight).sort((a, b) => a - b);
    const hc = small.length ? small[small.length >> 1]! : 64;
    const hx = lines[cur]?.offsetHeight ?? hc;
    const rows = host.rows();
    view.style.setProperty('--plh', Math.round(hx + (rows - 1) * hc + 6) + 'px');
    view.style.setProperty('--pltail', Math.round(Math.max(0, rows - 3) * hc) + 'px');
  }

  let layoutTimer = 0;
  function refresh(): void {
    if (!host.shown()) return;
    if (dirty) build();
    layout();
    // Once sizes have settled after a change (the line playing grows over a quarter second).
    clearTimeout(layoutTimer);
    layoutTimer = window.setTimeout(() => {
      layout();
      scrollTo(false);
    }, 320);
    scrollTo(false);
  }

  /** Scroll so the line playing is third from the top (or as near as the song's start allows). */
  function scrollTo(smooth: boolean): void {
    const L = lines[cur];
    if (!L || !view.clientHeight) return;
    const above = lines[Math.max(0, cur - 2)]!;
    const top = cur < 2 ? 0 : above.offsetTop - list.offsetTop;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (Math.abs(view.scrollTop - top) < 2) return;
    view.scrollTo({ top, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }

  function setState(n: number): void {
    const L = lines[n];
    if (!L) return;
    const st = n === cur ? curState : n === cur + 1 && cur >= 0 ? 'Next' : '';
    const el = L.querySelector<HTMLElement>('.plst')!;
    if (el.textContent !== st) el.textContent = st;
  }

  function current(n: number, state: string, playing: boolean): void {
    const was = cur;
    curState = state;
    playingNow = playing;
    if (n !== was) {
      cur = n;
      lines[was]?.classList.remove('cur');
      lines.forEach((l, i) => l.classList.toggle('past', playing && i < n));
      const L = lines[n];
      if (L) {
        L.classList.add('cur');
        if (fig.el) L.querySelector('.pln')!.appendChild(fig.el);
        gridFor(n);
      }
      if (lines[was]) clearGrid(was);
      for (const k of [was, was + 1, n, n + 1]) setState(k);
      if (!playing) beat(-1);
      scrollTo(playing && was >= 0);
    } else {
      lines.forEach((l, i) => l.classList.toggle('past', playing && i < n));
      setState(n);
      setState(n + 1);
    }
  }

  /** The semitone lines across the strip of the line playing (Sa stronger). */
  function gridFor(n: number): void {
    const L = lines[n];
    if (!L) return;
    const r = { lo: +L.dataset.lo!, hi: +L.dataset.hi! };
    let g = '';
    for (let c = r.lo + 100; c < r.hi; c += 100) {
      const y = stripY(c, r).toFixed(1);
      g += '<line class="' + ((((c / 100) % 12) + 12) % 12 === 0 ? 'sg sa' : 'sg') + '" x1="0" y1="' + y + '" x2="100" y2="' + y + '"/>';
    }
    for (const svg of L.querySelectorAll('svg.pls')) svg.insertAdjacentHTML('afterbegin', '<g class="plgrid">' + g + '</g>');
  }
  function clearGrid(n: number): void {
    for (const g of lines[n]?.querySelectorAll('.plgrid') ?? []) g.remove();
  }

  function beat(g: number): void {
    if (g === nowG) return;
    for (const el of cellsOf.get(nowG) ?? []) el.classList.remove('now');
    nowG = g;
    const L = lines[cur];
    if (g < 0) {
      for (const el of L?.querySelectorAll('.plb.past') ?? []) el.classList.remove('past');
      return;
    }
    for (const el of cellsOf.get(g) ?? []) el.classList.add('now');
    if (L) for (const el of L.querySelectorAll<HTMLElement>('.plb')) el.classList.toggle('past', +el.dataset.b! < g);
  }

  function playhead(g: number, f: number): void {
    if (g < 0) {
      head.remove();
      return;
    }
    const w = cellsOf.get(g)?.[0]?.querySelector('.plsw');
    if (!w) {
      head.remove();
      return;
    }
    if (head.parentElement !== w) w.appendChild(head);
    head.style.left = (clamp(f, 0, 1) * 100).toFixed(2) + '%';
  }

  function taal(T: TaalInfo): void {
    if (fig.T?.id === T.id && fig.el) return;
    fig.el?.remove();
    const box = document.createElement('span');
    box.innerHTML = taalFigureHTML(T);
    fig = { T, el: box.firstElementChild as HTMLElement, p: -2 };
    lines[cur]?.querySelector('.pln')?.appendChild(fig.el!);
    taalBeat(-1);
  }

  function taalBeat(p: number): void {
    const { T, el } = fig;
    if (!T || !el || p === fig.p) return;
    fig.p = p;
    const prog = figureProgress(T, p);
    el.querySelectorAll('.tfp').forEach((pl, k) => pl.setAttribute('points', prog[k] ?? ''));
    for (const c of el.querySelectorAll<SVGElement>('.tfv')) {
      const q = +c.dataset.p!;
      c.classList.toggle('on', q === p);
      c.classList.toggle('done', p >= 0 && q < p);
    }
  }

  // ── The voice ──────────────────────────────────────────────────────────────

  function segIn(g: number, cls: string, first: string[]): Seg | null {
    const svg = cellsOf.get(g)?.[0]?.querySelector('.pltr');
    if (!svg) return null;
    const el = document.createElementNS(SVGNS, 'path');
    el.setAttribute('class', 'vt ' + cls);
    svg.appendChild(el);
    const s: Seg = { cls, pts: first, el };
    if (!segs.has(g)) segs.set(g, []);
    segs.get(g)!.push(s);
    return s;
  }
  const draw = (s: Seg) => s.el.setAttribute('d', 'M' + s.pts.join('L'));
  const pt = (x: number, y: number) => x.toFixed(1) + ' ' + y.toFixed(1);

  function clearLine(n: number): void {
    for (const el of lines[n]?.querySelectorAll('.pltr') ?? []) el.textContent = '';
    for (const g of [...segs.keys()]) if (host.parsed().lineOfBeat[g] === n) segs.delete(g);
    if (last?.n === n) last = null;
  }

  function voice(g: number, pass: number, f: number, cents: number | null, fold: boolean, cls: string): void {
    const P = host.parsed();
    const n = P.lineOfBeat[g];
    const L = n == null ? null : lines[n];
    if (n == null || !L) return;
    if (linePass.get(n) !== pass) {
      clearLine(n);
      linePass.set(n, pass);
    }
    if (cents == null) {
      last = null;
      dot.remove();
      return;
    }
    const r = { lo: +L.dataset.lo!, hi: +L.dataset.hi! };
    const c = fold ? (r.lo + r.hi) / 2 + foldOctave(cents - (r.lo + r.hi) / 2) : cents;
    const x = clamp(f, 0, 1) * 100;
    const y = stripY(c, r);
    const prev = last && last.n === n && (last.g === g || last.g === g - 1) ? last : null;
    const mine = segs.get(g);
    const open = mine?.[mine.length - 1];
    if (prev && prev.g === g && prev.cls === cls && open && open.cls === cls) {
      open.pts.push(pt(x, y));
      draw(open);
    } else if (prev) {
      // Carry on from the last point: across the beat's edge, or in another colour.
      const dx = 100 * (g - prev.g);
      if (dx) {
        const before = segs.get(prev.g);
        const ps = before?.[before.length - 1];
        if (ps) {
          ps.pts.push(pt(x + dx, y));
          draw(ps);
        }
      }
      const s = segIn(g, cls, [pt(prev.x - dx, prev.y), pt(x, y)]);
      if (s) draw(s);
    } else segIn(g, cls, [pt(x, y)]);
    last = { n, g, x, y, cls };
    const w = cellsOf.get(g)?.[0]?.querySelector('.plsw');
    if (w && L.classList.contains('cur')) {
      if (dot.parentElement !== w) w.appendChild(dot);
      dot.className = 'pldot ' + cls;
      dot.style.left = x.toFixed(2) + '%';
      dot.style.top = y.toFixed(2) + '%';
    } else dot.remove();
  }

  function showScore(n: number, score: number): void {
    const el = lines[n]?.querySelector<HTMLElement>('.plsc');
    if (!el) return;
    el.className = 'plsc ' + (Number.isFinite(score) ? grade(score) : 'miss');
    el.textContent = Number.isFinite(score) ? String(score) : '–';
    el.title = Number.isFinite(score) ? 'Pitch score for this line: ' + score + ' out of 100' : 'Not sung';
  }

  new ResizeObserver(() => {
    if (host.shown()) layout();
  }).observe(view);

  return {
    render() {
      dirty = true;
      if (host.shown()) {
        build();
        layout();
      }
    },
    refresh,
    current,
    beat,
    playhead,
    taal,
    taalBeat,
    voice,
    voiceOff() {
      dot.remove();
      last = null;
    },
    lineScore(n, score) {
      scores.set(n, score);
      showScore(n, score);
    },
    clearRun() {
      scores.clear();
      for (const el of list.querySelectorAll<HTMLElement>('.plsc')) {
        el.textContent = '';
        el.className = 'plsc';
      }
      for (const el of list.querySelectorAll('.pltr')) el.textContent = '';
      segs.clear();
      linePass.clear();
      last = null;
      dot.remove();
    },
    cells: (g) => cellsOf.get(g) ?? [],
  };
}

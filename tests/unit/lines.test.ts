// The Practice view's lines (src/app/lines.ts): the layout, each line's strip and cells, and
// the taal figure (Rinat, 2026-10-15).
import { describe, expect, it } from 'vitest';
import { centsText, closeness, columnsFor, figureProgress, gaugeHTML, gaugeY, linesHTML, ragColour, shapeCorners, shapePath, stripRange, stripY, taalFigureHTML } from '../../src/app/lines';
import { parseSong } from '../../src/core/notation/parse';
import { taalMap } from '../../src/core/notation/taalmap';
import { taalInfo } from '../../src/core/taal/taals';

/** The cells of one line, in order: their classes and beat numbers. */
const cells = (html: string) => Array.from(html.matchAll(/<div class="(plb[^"]*)" data-b="(\d+)"/g), (m) => ({ cls: m[1]!, g: +m[2]! }));
/** The note bars in a cell's strip: [x1, x2, y]. */
function bars(html: string, g: number): number[][] {
  const cell = html.split('data-b="' + g + '"')[1]!.split('</svg>')[0]!;
  return Array.from(cell.matchAll(/<line class="nb" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)"/g), (m) => [+m[1]!, +m[3]!, +m[2]!]);
}

describe('the lines’ layout', () => {
  it('puts the longest line across, halved until each beat has room', () => {
    expect(columnsFor(8, 1000, 46)).toBe(8);
    expect(columnsFor(16, 1000, 46)).toBe(16);
    // A phone: Teentaal over two rows of 8, Ektaal of 6, Jhaptal of 5; Dadra fits.
    expect(columnsFor(16, 282, 34)).toBe(8);
    expect(columnsFor(12, 282, 34)).toBe(6);
    expect(columnsFor(10, 282, 34)).toBe(5);
    expect(columnsFor(6, 282, 34)).toBe(6);
    expect(columnsFor(7, 282, 34)).toBe(7);
    expect(columnsFor(1, 10, 34)).toBe(1);
    expect(columnsFor(0, 300, 34)).toBe(1);
  });

  it('gives each line a strip two semitones beyond its notes, at least ten tall', () => {
    const P = parseSong('S R G M P\nS\nS\' R\' G\'\nx x');
    expect(stripRange(P, 0)).toEqual({ lo: -200, hi: 900 });
    // One note: centred in ten semitones.
    expect(stripRange(P, 1)).toEqual({ lo: -500, hi: 500 });
    // Upper Sa to Ga: widened a semitone below first, then above.
    expect(stripRange(P, 2)).toEqual({ lo: 900, hi: 1900 });
    // No notes: Sa to Pa's room.
    expect(stripRange(P, 3)).toEqual({ lo: -200, hi: 900 });
  });

  it('draws higher notes higher, inside the strip', () => {
    const r = { lo: -200, hi: 900 };
    expect(stripY(350, r)).toBe(50);
    expect(stripY(0, r)).toBeGreaterThan(stripY(700, r));
    expect(stripY(-5000, r)).toBe(98);
    expect(stripY(5000, r)).toBe(2);
  });
});

describe('the lines', () => {
  const text = '# স্থায়ী\nসা রা গা মা | পা - পা - \n> আ মা র সো | না ০ <র> বাং\nসা সা x সারা | -\n# অন্তরা · tempo 90\nপা পা পা পা | পা পা পা পা';
  const P = parseSong(text);
  const M = taalMap(text, P, 'keherwa', 1);
  const html = linesHTML(P, M, 0, 'bn');

  it('shows the headings and each line with its number box, a button that plays from it', () => {
    expect(html.startsWith('<div class="plhd">স্থায়ী</div><div class="pll words" data-n="0"')).toBe(true);
    expect(html).toContain('<div class="plhd">অন্তরা · tempo 90</div>');
    expect(html).toContain('<div class="pll words" data-n="0" data-lo="-200" data-hi="900"><button type="button" class="pln" data-n="0" aria-label="Play from line 1"><span class="plnum">1</span><span class="plst"></span><span class="plsc"></span></button><div class="plbeats">');
    expect(html).toContain('<button type="button" class="pln" data-n="2" aria-label="Play from line 3"><span class="plnum">3</span>');
  });

  it('gives each beat a cell: its notes, its words (escaped, a held vowel faded), the mark for how it was sung, its strip', () => {
    const c = cells(html);
    expect(c.map((x) => x.g)).toEqual(Array.from({ length: P.total }, (_, g) => g));
    const first = html.split('data-b="0"')[1]!.split('data-b="1"')[0]!;
    expect(first).toMatch(/^><span class="pnt"><span class="u">সা<\/span><\/span><span class="ply"><span class="plv">আ<\/span><\/span><span class="plg"><\/span><span class="plsw"><svg class="pls" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">/);
    expect(html).toContain('<span class="plv"><span class="held">০</span></span>');
    expect(html).toContain('<span class="plv">&lt;র&gt;</span>');
  });

  it('shows the notes alone, big, on a line without words', () => {
    expect(html).toMatch(/<div class="pll" data-n="1"/);
    const line2 = html.split('data-n="1"')[1]!.split('class="pll')[0]!;
    expect(line2).not.toContain('class="ply"');
  });

  it('marks the first beat of each vibhag by its kind, by the taal of its own line', () => {
    const c = cells(html);
    expect(c[0]!.cls).toBe('plb vs v-sam');
    expect(c[1]!.cls).toBe('plb');
    expect(c[4]!.cls).toBe('plb vs v-khali');
    const tt = 'S R G M P D N S\'';
    const T16 = linesHTML(parseSong(tt), taalInfo('teentaal'), 0, 'lat');
    expect(cells(T16).map((x) => x.cls)).toEqual(['plb vs v-sam', 'plb', 'plb', 'plb', 'plb vs v-tali', 'plb', 'plb', 'plb']);
    // Starting on beat 9 of Teentaal: khali first.
    expect(cells(linesHTML(parseSong(tt), taalInfo('teentaal'), 8, 'lat'))[0]!.cls).toBe('plb vs v-khali');
  });

  it('draws a bar for each note at its height: inset where it starts and ends, carried across a held beat', () => {
    const r = stripRange(P, 0);
    // সা at the bottom, পা held over two beats.
    expect(bars(html, 0)).toEqual([[5, 95, +stripY(0, r).toFixed(1)]]);
    expect(bars(html, 4)).toEqual([[5, 100, +stripY(700, r).toFixed(1)]]);
    expect(bars(html, 5)).toEqual([[0, 95, +stripY(700, r).toFixed(1)]]);
    // Two notes in a beat; a silence has none; the same note twice shows as two bars.
    expect(bars(html, 11).map((b) => [b[0], b[1]])).toEqual([[5, 45], [55, 100]]);
    expect(bars(html, 10)).toEqual([]);
    expect(bars(html, 8)).toEqual([[5, 95, +stripY(0, stripRange(P, 1)).toFixed(1)]]);
    expect(html).toContain('data-n="0" data-lo="' + r.lo + '" data-hi="' + r.hi + '"');
  });

  it('says what to do when there are no notes yet', () => {
    expect(linesHTML(parseSong(''), taalInfo('dadra'), 0, 'bn')).toBe('<div class="plempty">No notes yet. Type the first line from your diary in Edit notation.</div>');
  });
});

describe('the taal figure', () => {
  it('draws a vibhag of four beats as a square, three as a triangle, two as a lens, each a closed path from its first corner', () => {
    expect(shapeCorners(4)).toEqual([[3, 3], [21, 3], [21, 21], [3, 21]]);
    expect(shapeCorners(3)[0]).toEqual([12, 4.5]);
    expect(shapeCorners(3).map((c) => c[1])).toEqual([4.5, 19.5, 19.5]);
    expect(shapeCorners(2)).toEqual([[3, 12], [21, 12]]);
    expect(shapeCorners(1)).toEqual([[12, 12]]);
    expect(shapePath(4)).toBe('M3 3L21 3L21 21L3 21Z');
    expect(shapePath(3)).toBe('M12 4.5L20.66 19.5L3.34 19.5Z');
    // Two beats: over to the second corner, then back under to the first.
    expect(shapePath(2)).toBe('M3 12A10 10 0 0 1 21 12A10 10 0 0 1 3 12Z');
  });

  it('has a shape per vibhag, of its kind, one under another, and a corner per beat, sam’s bigger', () => {
    const k = taalFigureHTML(taalInfo('keherwa'));
    // How many shapes, and their heights added up in widths, for the page to size them by.
    expect(k.startsWith('<span class="tf" style="--nv:2;--nh:2" role="img" aria-label="Keherwa: 4 + 4 beats"><span class="tfg"><svg class="tfs v-sam" viewBox="-3 -3 30 30"')).toBe(true);
    expect(k.endsWith('</svg></span><span class="tfn">Keherwa</span></span>')).toBe(true);
    expect(k).toContain('<svg class="tfs v-khali"');
    expect(Array.from(k.matchAll(/data-p="(\d+)"/g), (m) => +m[1]!)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(k).toContain('<circle class="tfv tf1 tfsam" cx="3" cy="3" r="3.4" data-p="0"/>');
    expect(k).toContain('<circle class="tfv tf1" cx="3" cy="3" r="2.6" data-p="4"/>');
    // Each shape: a fill, its outline, and the path drawn on as the beats go, a fraction at a time.
    expect(k).toContain('<path class="tff" d="M3 3L21 3L21 21L3 21Z"/><path class="tfo" d="M3 3L21 3L21 21L3 21Z"/><path class="tfp" d="M3 3L21 3L21 21L3 21Z" pathLength="1" stroke-dasharray="0 2"/>');
    expect(k.match(/<path class="tfp"/g)).toHaveLength(2);
    // Rupak begins on khali; Ektal is six lenses; Teentaal four squares.
    expect(taalFigureHTML(taalInfo('rupak'))).toMatch(/^<span class="tf" style="--nv:3;--nh:2.2"[^>]*><span class="tfg"><svg class="tfs v-khali"/);
    // A lens is drawn in a flatter box.
    const e = taalFigureHTML(taalInfo('ektal'));
    expect(e.match(/<path class="tfo" d="M3 12A/g)).toHaveLength(6);
    expect(e.match(/viewBox="-3 3 30 18"/g)).toHaveLength(6);
    expect(e).toContain('style="--nv:6;--nh:3.6"');

    expect(taalFigureHTML(taalInfo('teentaal')).match(/<svg class="tfs v-tali"/g)).toHaveLength(2);
  });

  it('draws each shape on through its beats, so the last beat closes it as the next vibhag starts', () => {
    const T = taalInfo('keherwa');
    expect(figureProgress(T, -1, 0.5)).toEqual([0, 0]);
    expect(figureProgress(T, 0)).toEqual([0, 0]);
    expect(figureProgress(T, 0, 0.5)).toEqual([0.125, 0]);
    expect(figureProgress(T, 2, 0.5)).toEqual([0.625, 0]);
    // The 4th beat draws the edge back to the first corner: at its end the square is closed.
    expect(figureProgress(T, 3, 1)).toEqual([1, 0]);
    expect(figureProgress(T, 5, 0.25)).toEqual([1, 0.3125]);
    expect(figureProgress(T, 7, 1)).toEqual([1, 1]);
    expect(figureProgress(T, 7, 3)).toEqual([1, 1]);
    const J = taalInfo('jhaptal');
    expect(figureProgress(J, 2, 0.5)).toEqual([1, 0.5 / 3, 0, 0]);
  });

  it('colours a line by its score: red, amber, green, mixed between, grey when not sung', () => {
    expect(ragColour(30)).toBe('var(--red-ink)');
    expect(ragColour(50)).toBe('var(--red-ink)');
    expect(ragColour(62.5)).toBe('color-mix(in srgb, var(--warn) 50%, var(--red-ink))');
    expect(ragColour(75)).toBe('color-mix(in srgb, var(--good) 0%, var(--warn))');
    expect(ragColour(85)).toBe('color-mix(in srgb, var(--good) 50%, var(--warn))');
    expect(ragColour(95)).toBe('var(--good)');
    expect(ragColour(NaN)).toBe('var(--ink-2)');
  });
});

describe('the pitch gauge (Rinat, 2026-10-19)', () => {
  it('puts the note expected in the middle, sharp up and flat down, held at a quarter tone', () => {
    expect(gaugeY(0)).toBe(50);
    expect(gaugeY(25)).toBe(25);
    expect(gaugeY(-25)).toBe(75);
    expect(gaugeY(50)).toBe(0);
    expect(gaugeY(-50)).toBe(100);
    expect(gaugeY(180)).toBe(0);
    expect(gaugeY(-90)).toBe(100);
  });

  it('writes the cents whole and signed', () => {
    expect(centsText(12.4)).toBe('+12');
    expect(centsText(-7.6)).toBe('−8');
    expect(centsText(0.3)).toBe('0');
    expect(centsText(-0.4)).toBe('0');
  });

  it('has bands for in tune, close and off, as the voice is coloured', () => {
    expect([0, 15, -15, 16, 35, -35, 36, -80].map(closeness)).toEqual(['good', 'good', 'good', 'ok', 'ok', 'ok', 'off', 'off']);
    const bands = Array.from(gaugeHTML().matchAll(/<span class="pgb (\w+)" style="top:([\d.]+)%;height:([\d.]+)%"/g), (m) => [m[1], +m[2]!, +m[3]!]);
    // From the top: off (sharp), close, in tune across the middle, close, off (flat); end to end.
    expect(bands).toEqual([['off', 0, 15], ['ok', 15, 20], ['good', 35, 30], ['ok', 65, 20], ['off', 85, 15]]);
    expect(gaugeHTML()).toContain('class="pgauge idle"');
    expect(gaugeHTML()).toContain('class="pgm"');
  });
});

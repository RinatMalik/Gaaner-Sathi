// The Practice view's lines (src/app/lines.ts): the layout, each line's strip and cells, and
// the taal figure (Rinat, 2026-10-15).
import { describe, expect, it } from 'vitest';
import { columnsFor, figureProgress, linesHTML, shapeCorners, stripRange, stripY, taalFigureHTML } from '../../src/app/lines';
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

  it('shows the headings and each line with a button that plays from it', () => {
    expect(html.startsWith('<div class="plhd">স্থায়ী</div><div class="pll words" data-n="0"')).toBe(true);
    expect(html).toContain('<div class="plhd">অন্তরা · tempo 90</div>');
    expect(html).toContain('<button type="button" class="pl-n" data-n="0" aria-label="Play from line 1">1</button><span class="plst"></span><span class="plsc"></span>');
    expect(html).toContain('<button type="button" class="pl-n" data-n="2" aria-label="Play from line 3">3</button>');
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
  it('draws a vibhag of four beats as a square, three as a triangle, two as a stroke', () => {
    expect(shapeCorners(4)).toEqual([[3, 3], [21, 3], [21, 21], [3, 21]]);
    expect(shapeCorners(3)[0]).toEqual([12, 4.5]);
    expect(shapeCorners(3).map((c) => c[1])).toEqual([4.5, 19.5, 19.5]);
    expect(shapeCorners(2)).toEqual([[3, 12], [21, 12]]);
    expect(shapeCorners(1)).toEqual([[12, 12]]);
  });

  it('has a shape per vibhag, of its kind, and a corner per beat, sam’s bigger', () => {
    const k = taalFigureHTML(taalInfo('keherwa'));
    expect(k.startsWith('<span class="tf" role="img" aria-label="Keherwa: 4 + 4 beats"><svg class="tfs v-sam"')).toBe(true);
    expect(k).toContain('<svg class="tfs v-khali"');
    expect(Array.from(k.matchAll(/data-p="(\d+)"/g), (m) => +m[1]!)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(k).toContain('<circle class="tfv tf1 tfsam" cx="3" cy="3" r="3.4" data-p="0"/>');
    expect(k).toContain('<circle class="tfv tf1" cx="3" cy="3" r="2.6" data-p="4"/>');
    expect(k.match(/<polygon class="tfo"/g)).toHaveLength(2);
    // Rupak begins on khali; Ektal is six strokes; Teentaal four squares.
    expect(taalFigureHTML(taalInfo('rupak'))).toMatch(/^<span class="tf"[^>]*><svg class="tfs v-khali"/);
    expect(taalFigureHTML(taalInfo('ektal')).match(/<polyline class="tfo"/g)).toHaveLength(6);
    expect(taalFigureHTML(taalInfo('teentaal')).match(/<svg class="tfs v-tali"/g)).toHaveLength(2);
  });

  it('traces each shape round to the beat sounding, the ones before closed', () => {
    const T = taalInfo('keherwa');
    expect(figureProgress(T, -1)).toEqual(['', '']);
    expect(figureProgress(T, 0)).toEqual(['3,3', '']);
    expect(figureProgress(T, 2)).toEqual(['3,3 21,3 21,21', '']);
    expect(figureProgress(T, 5)).toEqual(['3,3 21,3 21,21 3,21 3,3', '3,3 21,3']);
    const J = taalInfo('jhaptal');
    expect(figureProgress(J, 2)).toEqual(['3,12 21,12', '12,4.5', '', '']);
  });
});

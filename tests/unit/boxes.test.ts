// Beat boxes (src/core/notation/boxes.ts): the rows shown, and every change a box makes to
// the song text.
import { describe, expect, it } from 'vitest';
import { addHeading, appendBeats, barChar, beatsTyped, boxRows, insertLines, insertText, newRowShape, nextSpot, placeBeats, readableBeat, copyRows, moveRow, moveRows, pasteRows, removeBeat, removeHeading, removeLine, rowBlocks, setBeat, setHeading, setLyrics, verseTokens } from '../../src/core/notation/boxes';
import { boxesHTML } from '../../src/app/boxes';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';

const DADRA = taalInfo('dadra');
const TEEN = taalInfo('teentaal');
const beatsOf = (t: string) => parseSong(t).noteLines.map((l) => l.beats.map((b) => b.src).join(' '));

describe('reading what was typed', () => {
  it('mends sargam spelt out and রে / নি, and leaves everything readable alone', () => {
    const cases: [string, string][] = [
      ['sa', 'S'], ['Re', 'R'], ['GA', 'G'], ['ma', 'M'], ['pa', 'P'], ['dha', 'D'], ['ni', 'N'],
      ["sa'", "S'"], ['.ni', '.N'], ['sare', 'SR'], ['padha', 'PD'], ['sa-', 'S-'], ['ma#', 'M#'],
      ['রে', 'রা'], ['নি', 'না'], ['সারে', 'সারা'], ['র্নি', 'র্না'],
      ['S', 'S'], ['r', 'r'], ['n', 'n'], ['সা', 'সা'], ['পধা', 'পধা'], ['-', '-'], ['x', 'x'],
      ['xyz', 'xyz'], ['hello', 'hello'], ['রেখা', 'রেখা'], ['sab', 'sab'],
      // Spelt out among letters, as when a note is added to a beat that has one.
      ['Sre', 'SR'], ['Sga', 'SG'], ['Spadha', 'SPD'], ["S'ni", "S'N"],
    ];
    for (const [typed, kept] of cases) expect([typed, readableBeat(typed)]).toEqual([typed, kept]);
  });

  it('splits what was typed or pasted into beats where the player would', () => {
    expect(beatsTyped('sa re ga | ma')).toEqual(['S', 'R', 'G', 'M']);
    expect(beatsTyped('  সা রা গা।মা  পধা ')).toEqual(['সা', 'রা', 'গা', 'মা', 'পধা']);
    expect(beatsTyped('S\tR\nG')).toEqual(['S', 'R', 'G']);
    expect(beatsTyped('   ')).toEqual([]);
  });
});

describe('the rows', () => {
  const TEXT = '# স্থায়ী\nসা রা গা | মা পা ধা\n> আ মার সো | নার বাং লা\n> তু মি -\n\nনা র্সা না | ধা\n# অন্তরা · tempo 110\nপা ধা না\n';

  it('show headings, and each notes line with its lyrics and empty boxes to the end of its cycle', () => {
    const P = parseSong(TEXT);
    const rows = boxRows(TEXT, P, DADRA, 0);
    // No empty row at the end yet: the last line is not finished.
    expect(rows.map((r) => r.kind)).toEqual(['head', 'notes', 'notes', 'head', 'notes']);
    const [h0, l0, l1, h1, l2] = rows as any[];
    expect([h0.k, h0.label, h0.tempo, h1.k, h1.label, h1.tempo, h1.line]).toEqual([0, 'স্থায়ী', undefined, 1, 'অন্তরা', 110, 6]);
    expect(l0.beats.map((b: any) => [b.src, b.p, b.lyrics.join('/')])).toEqual([
      ['সা', 0, 'আ/তু'], ['রা', 1, 'মার/মি'], ['গা', 2, 'সো/-'], ['মা', 3, 'নার/'], ['পা', 4, 'বাং/'], ['ধা', 5, 'লা/'],
    ]);
    expect([l0.verses, l0.ghosts.length, l1.verses, l1.ghosts.map((g: any) => [g.j, g.p])]).toEqual([2, 0, 0, [[4, 4], [5, 5]]]);
    // Line 3 starts where line 2 left off (beat 5 of the cycle) and finishes the next cycle.
    expect([l2.beats.map((b: any) => b.p), l2.ghosts.map((g: any) => g.p)]).toEqual([[4, 5, 0], [1, 2, 3, 4, 5]]);
    // Asked for (Enter on the last line), the new row starts where the song is and finishes
    // that cycle; a heading after the last line brings it too.
    const end = boxRows(TEXT, P, DADRA, 0, { pending: 2 }).pop() as any;
    expect([end.kind, end.ghosts.map((g: any) => g.p)]).toEqual(['new', [1, 2, 3, 4, 5]]);
    const withHead = TEXT + '# সঞ্চারী\n';
    expect(boxRows(withHead, parseSong(withHead), DADRA, 0).map((r) => r.kind).slice(-2)).toEqual(['head', 'new']);
    // A finished last line brings it.
    const done = 'সা রা গা মা পা ধা';
    expect(boxRows(done, parseSong(done), DADRA, 0).map((r) => r.kind)).toEqual(['notes', 'new']);
  });

  it('start a song that begins on a later beat there, and give the new row as many cycles as the line before', () => {
    const t = 'সা রা গা মা পা ধা না সা রা গা মা পা';
    const rows = boxRows(t, parseSong(t), DADRA, 3) as any[];
    expect(rows[0].beats.map((b: any) => b.p)).toEqual([3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2]);
    expect(rows[0].ghosts.map((g: any) => g.p)).toEqual([3, 4, 5]);
    expect(newRowShape(parseSong(t), DADRA, 3, { end: true })).toEqual({ start: 12, p: 3, count: 9 });
    const empty = boxRows('# স্থায়ী\n', parseSong('# স্থায়ী\n'), TEEN, 0) as any[];
    expect(empty.map((r) => r.kind)).toEqual(['head', 'new']);
    expect(empty[1].ghosts).toHaveLength(16);
  });

  it('show an empty row after a line when asked, and keep a line being typed as long as its row', () => {
    const t = 'সা রা গা মা পা ধা\nনা সা';
    const P = parseSong(t);
    const rows = boxRows(t, P, DADRA, 0, { pending: 0 }) as any[];
    expect(rows.map((r) => r.kind)).toEqual(['notes', 'new', 'notes']);
    expect(rows[1].at).toEqual({ after: 0 });
    expect((boxRows(t, P, DADRA, 0, { grow: { n: 1, to: 12 } })[1] as any).ghosts).toHaveLength(10);
  });
});

describe('changes to the text', () => {
  it('a beat typed over keeps everything else as written', () => {
    const t = '# a\nসা  রা | গা\n> x y z';
    const P = parseSong(t);
    expect(setBeat(t, P, 1, 'পধা')).toBe('# a\nসা  পধা | গা\n> x y z');
  });

  it('beats typed into a new song’s empty row make lines a cycle long, with bar lines at the vibhags', () => {
    const r = placeBeats('# স্থায়ী\n', DADRA, 0, { at: { end: true } }, beatsTyped('sa re ga ma pa dha ni sa'));
    expect(r.text).toBe('# স্থায়ী\nS R G | M P D\nN S\n');
    expect(r.next).toEqual({ n: 1, j: 2 });
    const one = placeBeats('# স্থায়ী\n', DADRA, 0, { at: { end: true } }, ['সা']);
    expect(one.text).toBe('# স্থায়ী\nসা\n');
    expect(one.next).toEqual({ n: 0, j: 1 });
  });

  it('beats typed into a box write over the boxes after it, then fill the line, then make new lines', () => {
    const t = 'সা রা গা | মা\n> আ মার সো | নার\n# অন্তরা\nপা';
    let r = placeBeats(t, DADRA, 0, { n: 0, j: 1 }, ['X', 'Y']);
    expect(beatsOf(r.text)).toEqual(['সা X Y মা', 'পা']);
    expect(r.text.split('\n')[1]).toBe('> আ মার সো | নার');
    expect(r.next).toEqual({ n: 0, j: 3 });
    r = placeBeats(t, DADRA, 0, { n: 0, j: 3 }, ['A', 'B', 'C', 'D', 'E']);
    expect(r.text).toBe('সা রা গা | A B C\n> আ মার সো | নার\nD E\n# অন্তরা\nপা');
    expect(r.next).toEqual({ n: 1, j: 2 });
    // The last box of a full line: on to the next line.
    r = placeBeats(r.text, DADRA, 0, { n: 0, j: 5 }, ['Z']);
    expect(r.next).toEqual({ n: 1, j: 0 });
  });

  it('a line being typed in a two-cycle row stays one line until the row is full', () => {
    const t = 'সা রা গা মা পা ধা না সা রা গা মা পা';
    const r1 = placeBeats(t, DADRA, 0, { at: { end: true } }, ['S']);
    expect(r1.next).toEqual({ n: 1, j: 1 });
    const r2 = placeBeats(r1.text, DADRA, 0, { n: 1, j: 1 }, ['R', 'G', 'M', 'P', 'D', 'N'], 12);
    expect(beatsOf(r2.text)[1]).toBe('S R G M P D N');
    expect(r2.next).toEqual({ n: 1, j: 7 });
    expect(nextSpot(parseSong(r2.text), DADRA, 0, 1, 12, 12)).toEqual({ end: true, j: 0 });
  });

  it('beats added to a line with bars get bars at the vibhags; a line written without them gets none', () => {
    let t = 'সা রা গা মা';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 0, ['পা', 'ধা', 'না'])).toBe('সা রা গা মা পা ধা না');
    // A line too short to have crossed a vibhag follows the song: bars, unless its lines have none.
    t = 'সা রা';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 0, ['গা', 'মা', 'পা'])).toBe('সা রা গা | মা পা');
    t = 'S R G M P D\nS R';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 1, ['G', 'M'])).toBe('S R G M P D\nS R G M');
    t = 'S R G | M P D\nS R';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 1, ['G', 'M'])).toBe('S R G | M P D\nS R G | M');
    t = 'সা রা গা |';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 0, ['মা', 'পা'])).toBe('সা রা গা | মা পা');
    t = 'সা । রা';
    expect(appendBeats(t, parseSong(t), DADRA, 0, 0, ['গা', 'মা', 'পা'])).toBe('সা । রা গা । মা পা');
  });

  it('new lines follow the song’s bars: none when its lines have none, its own bar character when they do', () => {
    let t = 'S R G M P D';
    expect(insertLines(t, parseSong(t), DADRA, 0, { end: true }, ['N', 'S']).text).toBe('S R G M P D\nN S');
    t = 'সা রা গা । মা পা ধা\nনা';
    expect(barChar(t)).toBe('।');
    expect(insertLines(t, parseSong(t), DADRA, 0, { after: 0 }, ['পা', 'ধা', 'না', 'সা']).text).toBe('সা রা গা । মা পা ধা\nপা ধা না । সা\nনা');
  });

  it('lyrics: a word in any box, blanks inside held with "-", a new verse under the last, an empty verse removed', () => {
    const t = 'সা রা গা | মা পা ধা\n> আ মার সো';
    const P = parseSong(t);
    expect(setLyrics(t, P, 0, 0, 4, ['বাং'])).toBe('সা রা গা | মা পা ধা\n> আ মার সো - বাং');
    expect(setLyrics(t, P, 0, 1, 2, ['সো', 'নার'])).toBe('সা রা গা | মা পা ধা\n> আ মার সো\n> - - সো | নার');
    expect(setLyrics(t, P, 0, 1, 0, ['তু', 'মি'])).toBe('সা রা গা | মা পা ধা\n> আ মার সো\n> তু মি');
    expect(setLyrics(t, P, 0, 0, 2, [''])).toBe('সা রা গা | মা পা ধা\n> আ মার');
    expect(setLyrics(t, P, 0, 0, 0, ['', '', ''])).toBe('সা রা গা | মা পা ধা');
    const u = 'S R G\n\n> a b c\n> d e\n# x';
    expect(verseTokens(u, parseSong(u), 0, 1)).toEqual(['d', 'e']);
    expect(setLyrics(u, parseSong(u), 0, 2, 1, ['f'])).toBe('S R G\n\n> a b c\n> d e\n> - f\n# x');
  });

  it('removing a beat takes its lyric with it, keeps one bar where a vibhag emptied, and a last beat takes its line', () => {
    const t = 'সা রা গা | মা | পা ধা\n> আ মার সো | নার | বাং লা\n> ১ ২ ৩ ৪ ৫\n# x\nনি';
    let P = parseSong(t);
    expect(removeBeat(t, P, 1)).toBe('সা গা | মা | পা ধা\n> আ সো | নার | বাং লা\n> ১ ৩ ৪ ৫\n# x\nনি');
    expect(removeBeat(t, P, 3)).toBe('সা রা গা | পা ধা\n> আ মার সো | বাং লা\n> ১ ২ ৩ ৫\n# x\nনি');
    expect(removeBeat(t, P, 0)).toBe('রা গা | মা | পা ধা\n> মার সো | নার | বাং লা\n> ২ ৩ ৪ ৫\n# x\nনি');
    expect(removeBeat(t, P, 6)).toBe('সা রা গা | মা | পা ধা\n> আ মার সো | নার | বাং লা\n> ১ ২ ৩ ৪ ৫\n# x');
    P = parseSong('S R\n> a\n> b c');
    expect(removeBeat('S R\n> a\n> b c', P, 0)).toBe('R\n> c');
    expect(removeLine(t, parseSong(t), 0)).toBe('# x\nনি');
  });

  it('headings: renamed keeping their tempo, added at the end, removed', () => {
    const t = '# স্থায়ী\nS\n# Antara (tempo 96)\nR\n\n';
    expect(setHeading(t, 1, 'অন্তরা')).toBe('# স্থায়ী\nS\n# অন্তরা (tempo 96)\nR\n\n');
    expect(setHeading(t, 1, '')).toBe('# স্থায়ী\nS\n# (tempo 96)\nR\n\n');
    expect(setHeading(t, 0, '  আস্থায়ী  ')).toBe('# আস্থায়ী\nS\n# Antara (tempo 96)\nR\n\n');
    expect(addHeading(t, 'সঞ্চারী')).toBe('# স্থায়ী\nS\n# Antara (tempo 96)\nR\n# সঞ্চারী\n\n');
    expect(addHeading('', '')).toBe('#\n');
    expect(removeHeading(t, 0)).toBe('S\n# Antara (tempo 96)\nR\n\n');
  });

  it('text pasted with line breaks goes in whole, after the line or at the end', () => {
    const t = 'S R G\n> a b\n# x\nM P';
    const P = parseSong(t);
    expect(insertText(t, P, { after: 0 }, '\n# অন্তরা\nপা ধা\n')).toBe('S R G\n> a b\n# অন্তরা\nপা ধা\n# x\nM P');
    expect(insertText(t + '\n\n', P, { end: true }, 'D N')).toBe('S R G\n> a b\n# x\nM P\nD N\n\n');
  });

  it('rows move whole: a notes line with its lyrics, a heading on its own; other lines stay put', () => {
    const t = '# স্থায়ী\nসা রা গা\n> আ মার সো\n\n> তু মি\nমা পা ধা\n\n# অন্তরা\nনা সা রা\n';
    const P = parseSong(t);
    expect(rowBlocks(t, P)).toEqual([{ first: 0, last: 0 }, { first: 1, last: 4, notes: 0 }, { first: 5, last: 5, notes: 1 }, { first: 7, last: 7 }, { first: 8, last: 8, notes: 2 }]);
    // Line 2 to the top, then the first line to the end.
    expect(moveRow(t, P, 2, 0)).toBe('মা পা ধা\n# স্থায়ী\nসা রা গা\n> আ মার সো\n\n> তু মি\n\n# অন্তরা\nনা সা রা\n');
    expect(moveRow(t, P, 1, 5)).toBe('# স্থায়ী\nমা পা ধা\n\n# অন্তরা\nনা সা রা\nসা রা গা\n> আ মার সো\n\n> তু মি\n');
    // A heading moved up takes the line before it into its section.
    expect(moveRow(t, P, 3, 2)).toBe('# স্থায়ী\nসা রা গা\n> আ মার সো\n\n> তু মি\n# অন্তরা\nমা পা ধা\n\nনা সা রা\n');
    // Nowhere to go: the text as it was.
    for (const [f, to] of [[1, 1], [1, 2], [9, 0], [0, 6], [0, -1]]) expect(moveRow(t, P, f!, to!)).toBe(t);
    // No line break at the end of the text.
    const u = 'S R G\nM P D';
    expect(moveRow(u, parseSong(u), 1, 0)).toBe('M P D\nS R G');
  });

  it('rows copied are the song’s lines, in its order; pasted after a line’s lyrics or under a heading', () => {
    const t = '# স্থায়ী\nসা রা গা\n> আ মার সো\nমা পা ধা\n# অন্তরা\nনা সা রা\n\n';
    const P = parseSong(t);
    // One line, with its lyrics; several, picked in any order (and twice), in the song's order.
    expect(copyRows(t, P, [1])).toEqual({ lines: ['সা রা গা', '> আ মার সো'], count: 1 });
    expect(copyRows(t, P, [2, 0, 1, 2]).lines).toEqual(['# স্থায়ী', 'সা রা গা', '> আ মার সো', 'মা পা ধা']);
    expect(copyRows(t, P, [5, -1])).toEqual({ lines: [], count: 0 });
    const line1 = copyRows(t, P, [1]).lines;
    // After line 2 (row 2), after line 1's lyrics (row 1), just under a heading (row 3), after the last line.
    expect(pasteRows(t, P, 2, line1)).toBe('# স্থায়ী\nসা রা গা\n> আ মার সো\nমা পা ধা\nসা রা গা\n> আ মার সো\n# অন্তরা\nনা সা রা\n\n');
    expect(pasteRows(t, P, 1, ['S R G'])).toBe('# স্থায়ী\nসা রা গা\n> আ মার সো\nS R G\nমা পা ধা\n# অন্তরা\nনা সা রা\n\n');
    expect(pasteRows(t, P, 3, ['S R G'])).toBe('# স্থায়ী\nসা রা গা\n> আ মার সো\nমা পা ধা\n# অন্তরা\nS R G\nনা সা রা\n\n');
    const u = 'S R G\nM P D';
    expect(pasteRows(u, parseSong(u), 1, ['S R G'])).toBe('S R G\nM P D\nS R G');
    // Nowhere to paste, or nothing copied: unchanged.
    expect(pasteRows(u, parseSong(u), 7, ['S'])).toBe(u);
    expect(pasteRows(u, parseSong(u), 0, [])).toBe(u);
  });

  it('several rows move together, in the song’s order, wherever they were', () => {
    const t = '# A\nS R G\n> a b c\nM P D\n# B\nN S R\nG M P\n';
    const P = parseSong(t);
    // Rows: 0 # A, 1 S R G (with its lyrics), 2 M P D, 3 # B, 4 N S R, 5 G M P.
    expect(moveRows(t, P, [1, 4], 6)).toEqual({ text: '# A\nM P D\n# B\nG M P\nS R G\n> a b c\nN S R\n', at: 4 });
    expect(moveRows(t, P, [5, 2], 0)).toEqual({ text: 'M P D\nG M P\n# A\nS R G\n> a b c\n# B\nN S R\n', at: 0 });
    // Dropped on one of themselves: they gather there, before the next row that is not moving.
    expect(moveRows(t, P, [1, 4], 1).text).toBe('# A\nS R G\n> a b c\nN S R\nM P D\n# B\nG M P\n');
    // Together already where they would go, or nothing to move: unchanged.
    expect(moveRows(t, P, [1, 2], 3)).toEqual({ text: t, at: 1 });
    expect(moveRows(t, P, [1, 2], 1).text).toBe(t);
    expect(moveRows(t, P, [9], 0).text).toBe(t);
    expect(moveRows(t, P, [1], 7).text).toBe(t);
  });
});

describe('the boxes as HTML', () => {
  it('give each heading and line a handle numbered in row order, each line ▶ under it, and each row its × last', () => {
    const t = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা\nনা সা রা | গা মা পা';
    const html = boxesHTML(boxRows(t, parseSong(t), DADRA, 0), () => 1);
    const L = ': select it, or drag it (or press ↑ ↓) to move it';
    expect(Array.from(html.matchAll(/class="bxln bxgrip" data-r="(\d+)" aria-pressed="(\w+)" aria-label="([^"]+)"/g), (m) => m[1] + ' ' + m[2] + ' ' + m[3])).toEqual([
      '0 false Heading' + L,
      '1 false Line 1' + L,
      '2 false Heading' + L,
      '3 false Line 2' + L,
    ]);
    // Selected rows: marked, their handles pressed.
    const picked = boxesHTML(boxRows(t, parseSong(t), DADRA, 0), () => 1, new Set([1, 2]));
    expect(Array.from(picked.matchAll(/<div class="bxrow (\w+)( sel)?"/g), (m) => m[1] + (m[2] ?? ''))).toEqual(['bxhead', 'bxnotes sel', 'bxhead sel', 'bxnotes', 'bxnew']);
    expect(Array.from(picked.matchAll(/data-r="(\d)" aria-pressed="true"/g), (m) => +m[1]!)).toEqual([1, 2]);
    // A line: its number, ▶ just under it (icon only), the boxes, then × (no Copy of its own).
    expect(html).not.toContain('data-act="copy"');
    expect(html).not.toContain('data-act="verse"');
    expect(html).toContain('<span class="bxlead"><button type="button" class="bxln bxgrip" data-r="1"');
    expect(Array.from(html.matchAll(/class="bxplay" data-act="play" data-n="(\d)" aria-label="([^"]+)"[^>]*>([^<]*)</g), (m) => m[1] + ' ' + m[2] + ' ' + m[3])).toEqual(['0 Play line 1 ▶', '1 Play line 2 ▶']);
    expect(Array.from(html.matchAll(/data-act="(delline|play)" data-n="0"/g), (m) => m[1])).toEqual(['play', 'delline']);
    expect(html).toMatch(/<\/div><button type="button" class="bxdel" data-act="delline" data-n="0"[^>]*>×<\/button><\/div>/);
    // A heading: its fields together, then × at the end of the row (its top right).
    expect(html).toMatch(/<span class="bxhf"><input class="bxh"[\s\S]*?<\/select><\/label><\/span><button type="button" class="bxdel" data-act="delhead" data-k="0"/);
    // The empty row to start a new line has no handle.
    expect(html).toContain('<div class="bxrow bxnew" data-at="end"><span class="bxln" aria-hidden="true">+</span>');
  });
});

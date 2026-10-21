// The printed sheet (src/app/print.ts).
import { describe, expect, it } from 'vitest';
import { printSheetHTML } from '../../src/app/print';
import { sheetHTML } from '../../src/app/view';
import { parseSong } from '../../src/core/notation/parse';
import { normalize } from '../../src/core/song/model';
import { taalInfo } from '../../src/core/taal/taals';

describe('the printed sheet', () => {
  const text = '# স্থায়ী\nসা রা গা | মা পা ধা\n> আ মার সো | নার বাং লা';
  const song = normalize({ id: 'a', title: 'আমার <সোনার> বাংলা', taal: 'rupak', tempo: 84, saKey: 1, saOct: 3, startOn: 2, text, tags: ['Rabindrasangeet'], notes: 'Source: Gitabitan\n<meaning>' });
  const P = parseSong(text);
  const T = taalInfo('rupak');

  it('has the title, the taal, Sa, tempo and start beat, the sheet itself, tags and notes, escaped', () => {
    const html = printSheetHTML(song, P, T, 'bn');
    expect(html).toContain('<h1>আমার &lt;সোনার&gt; বাংলা</h1>');
    expect(html).toContain('Rupak · রূপক, 7 matras, 3 + 2 + 2, starting on beat 2 · Sa C♯3 (Black 1), low octave · 84 matras a minute');
    expect(html).toContain(sheetHTML(P, T, 1, false, 'bn'));
    expect(html).toContain('Rabindrasangeet');
    expect(html).toContain('<h2>About this song</h2><p>Source: Gitabitan\n&lt;meaning&gt;</p>');
  });

  it('leaves out what a song does not have, and follows the chosen script', () => {
    const plain = normalize({ id: 'b', title: 'Plain', text: 'S R G' });
    const html = printSheetHTML(plain, parseSong('S R G'), taalInfo('dadra'), 'lat');
    expect(html).not.toContain('About this song');
    expect(html).not.toContain('prtags');
    expect(html).not.toContain('starting on beat');
    expect(html).toContain('>Sa<');
  });
});

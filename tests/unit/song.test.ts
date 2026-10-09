import { describe, expect, it } from 'vitest';
import { fileName, IMPORT_LIMITS, songFileText, songsFromFile, stripExamplePrefix } from '../../src/core/song/file';
import { newId, normalize } from '../../src/core/song/model';
import { taalInfo } from '../../src/core/taal/taals';

describe('song model', () => {
  // The one deliberate change from the prototype: its TAALS[id] lookup accepted names that
  // every object inherits ("constructor", "toString"…) and arrays like ["dadra"], so an
  // imported file could set such a taal and crash playback.
  it('falls back to Dadra for a taal name inherited from Object, or a non-string', () => {
    for (const taal of ['constructor', 'toString', '__proto__', 'hasOwnProperty', ['dadra']]) {
      expect(normalize({ id: 'x', taal }).taal).toBe('dadra');
    }
    expect(taalInfo('constructor').id).toBe('dadra');
  });

  it('clamps every field into range', () => {
    expect(normalize({ id: 'x', title: '  ', tempo: 999, saKey: -4, saOct: 7, startOn: -2, text: 42 })).toEqual({
      id: 'x', example: false, title: 'Untitled song', taal: 'dadra', tempo: 240, saKey: 0, saOct: 4, startOn: 1, text: '', updatedAt: 0,
    });
  });

  it('makes ids like the prototype: song-<time in base 36>-<up to 5 characters>', () => {
    const now = 1791544356355;
    expect(newId(now, () => 0.123456789)).toMatch(/^song-[0-9a-z]+-[0-9a-z]{1,5}$/);
    expect(newId(now, () => 0.5).startsWith('song-' + now.toString(36) + '-')).toBe(true);
  });
});

describe('song files', () => {
  it('round-trips: export then import gives the same songs back', () => {
    const songs = [
      normalize({ id: 'a', title: 'গান', taal: 'rupak', tempo: 90, saKey: 3, saOct: 3, startOn: 2, text: '# স্থায়ী\nসা রা গা\n> সা রে গা\n' }),
      normalize({ id: 'b', title: 'Second', taal: 'teentaal', text: "S R G M | P D N S'" }),
    ];
    const back = songsFromFile(songFileText(songs, '2026-10-10'), 'backup.json')
      .map((s, i) => normalize({ ...s, id: songs[i]!.id, updatedAt: songs[i]!.updatedAt }));
    expect(back).toEqual(songs);
  });

  it('cuts long text and titles to the limits', () => {
    const [s] = songsFromFile(JSON.stringify({ title: 'T'.repeat(500), text: 'স'.repeat(300_000) }), 'x.json');
    expect(s!.title.length).toBe(IMPORT_LIMITS.titleChars);
    expect(s!.text.length).toBe(IMPORT_LIMITS.chars);
  });

  it('plain text becomes one song named after the file; a blank file gives none', () => {
    expect(songsFromFile('সা রা', 'আমার গান.txt')).toEqual([{ title: 'আমার গান', text: 'সা রা' }]);
    expect(songsFromFile('  \n ', 'x.txt')).toEqual([]);
  });

  it('file names are safe on Windows and macOS', () => {
    expect(fileName('a/b:c*?"<>|d')).toBe('a-b-c-d.json');
    expect(fileName('   ')).toBe('song.json');
  });

  it('drops an example prefix from a title', () => {
    expect(stripExamplePrefix('Typing example · Sa Re Ga letters')).toBe('Sa Re Ga letters');
  });
});

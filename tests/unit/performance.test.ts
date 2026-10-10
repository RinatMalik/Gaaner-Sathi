// Invariants: the parser and checker run on every keystroke and stay fast on 500-beat songs;
// the library search runs on every keystroke too.
import { describe, expect, it } from 'vitest';
import { songsListHTML } from '../../src/app/songs';
import { EXERCISES } from '../../src/core/exercises';
import { checkNotation } from '../../src/core/notation/check';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';

describe('performance', () => {
  it('parses and checks a 504-beat song well within a keystroke', () => {
    const line = 'সা রা গা মা | পা ধা না র্সা';
    const lyric = '> সা রে গা মা | পা ধা নি সা';
    const text = Array.from({ length: 63 }, (_, i) => (i % 8 === 0 ? '# অন্তরা\n' : '') + line + '\n' + lyric).join('\n');
    const T = taalInfo('keherwa');
    expect(parseSong(text).total).toBe(504);
    const times: number[] = [];
    for (let i = 0; i < 31; i++) {
      const t0 = performance.now();
      checkNotation(parseSong(text), T, 0);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    // A keystroke frame is about 16 ms; the bound leaves slow CI machines plenty of room.
    expect(times[15]!).toBeLessThan(25);
  });

  it('searches a library of 300 long songs well within a keystroke', () => {
    const line = 'সা রা গা মা | পা ধা না র্সা\n> আ মার সো নার | বাং ০ লা ০\n';
    const own = Array.from({ length: 300 }, (_, i) => ({
      id: 'song-' + i, title: 'গান ' + i, text: line.repeat(60), taal: 'keherwa' as const, tempo: 100, saKey: 0,
      tags: ['Rabindrasangeet', 'Tag ' + (i % 7)], updatedAt: i,
    }));
    const opts = { query: 'সোনার', filter: { kind: 'all' } as const, sort: 'practised' as const, currentId: 'song-3', practisedAt: () => 0, now: Date.now() };
    const times: number[] = [];
    for (let i = 0; i < 11; i++) {
      const t0 = performance.now();
      songsListHTML(own, EXERCISES, opts);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(songsListHTML(own, EXERCISES, opts).shown).toBe(300);
    expect(times[5]!).toBeLessThan(40);
  });
});

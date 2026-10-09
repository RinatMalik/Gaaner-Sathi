// Invariant: the parser and checker run on every keystroke and stay fast on 500-beat songs.
import { describe, expect, it } from 'vitest';
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
});

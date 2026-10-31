// Full screen while practising (Rinat, 2026-10-31): where playing has got to in the title's bar,
// the notes named up the strip of the line being sung, the break before a rewaz item, and the
// page's parts it shows.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { whereText } from '../../src/app/full';
import { axisNotes } from '../../src/app/lines';
import { itemWhat, type ItemSong } from '../../src/app/rewaz';
import { parseSong } from '../../src/core/notation/parse';
import { eventsByBeat } from '../../src/core/pitch/track';

describe('where playing has got to', () => {
  it('names the line of the song’s lines, and the round while the lines loop', () => {
    expect(whereText(2, 12, null)).toBe('Line 3 of 12');
    expect(whereText(2, 12, { pass: 1, rounds: 3 })).toBe('Line 3 of 12 · Round 2 of 3');
    // A loop with no end; one round only says nothing of rounds.
    expect(whereText(0, 4, { pass: 4, rounds: 0 })).toBe('Line 1 of 4 · Round 5');
    expect(whereText(0, 4, { pass: 0, rounds: 1 })).toBe('Line 1 of 4');
    expect(whereText(0, 0, null)).toBe('');
  });
});

describe('the notes named up the strip', () => {
  const notes = (t: string, gap: number) => {
    const P = parseSong(t);
    return axisNotes(P, P.noteLines[0]!, eventsByBeat(P), gap).map((x) => x.cents);
  };

  it('names each pitch sounding in the line once, low to high', () => {
    expect(notes('S R G S G P', 0)).toEqual([0, 200, 400, 700]);
    expect(notes("P D N S'", 0)).toEqual([700, 900, 1100, 1200]);
  });

  it('leaves out a name that would overlap one kept: Sa first, then the notes sounding most', () => {
    // Re is too near Sa; Ga sounds twice, so it is kept before Pa, which is far enough from it.
    expect(notes('S R G S G P', 250)).toEqual([0, 400, 700]);
    // Ni a semitone under upper Sa: Sa wins though Ni sounds more.
    expect(notes("N N N S'", 150)).toEqual([1200]);
  });

  it('gives each name its note and octave', () => {
    const P = parseSong("S' N");
    expect(axisNotes(P, P.noteLines[0]!, eventsByBeat(P), 0)).toEqual([
      { semi: 11, oct: 0, cents: 1100 },
      { semi: 0, oct: 1, cents: 1200 },
    ]);
  });
});

describe('the break before a rewaz item', () => {
  const song: ItemSong = { tempo: 80, lineBeats: [8, 8, 8], cycle: 8, labels: [], title: 'Alankar' };

  it('says its lines, rounds and tempo', () => {
    expect(itemWhat({ song: 'a', rounds: 2 }, song)).toBe('The whole song · 2 rounds · tempo 80');
    expect(itemWhat({ song: 'a', from: 1, to: 1, rounds: 1, tempo: 100 }, song)).toBe('Line 2 · 1 round · tempo 100');
    expect(itemWhat({ song: 'a', from: 0, to: 2, rounds: 3 }, song)).toBe('Lines 1–3 · 3 rounds · tempo 80');
    // Lines past the song's end are its last.
    expect(itemWhat({ song: 'a', from: 5, to: 9, rounds: 3 }, song)).toBe('Line 3 · 3 rounds · tempo 80');
  });
});

describe('the page', () => {
  /** The markup between two ids' elements. */
  const between = (a: string, b: string) => page.split('id="' + a + '"')[1]!.split('id="' + b + '"')[0]!;

  it('has the full screen button by the title and in the rewaz bar', () => {
    const head = page.split('<div class="sheetHead">')[1]!.split('</div>')[0]!;
    expect(head).toContain('id="fullWhere"');
    expect(head).toMatch(/<button id="fullBtn"[^>]*>.*<span class="fbon">Full screen<\/span><span class="fboff">Exit full screen<\/span><\/button>/);
    expect(between('rwLeft', 'rwSkip')).toMatch(/<button id="rwFull"[^>]*>.*Full screen<\/button>/);
  });

  it('has the break inside the lines, and a bar for the deck’s controls after them', () => {
    expect(between('plView', 'pitchBox')).toContain('id="fullBreak"');
    expect(between('fullBreak', 'pitchBox')).toContain('id="fbCount"');
    expect(between('pitchBox', 'keysRow')).toMatch(/<\/section>\s*<!--[^]*?-->\s*<div class="fullctl" id="fullCtl"[^>]* hidden><\/div>\s*<section class="keyscard" $/);
    // The controls it moves there are the deck's.
    expect(between('deck', 'dpGuide')).toMatch(/<div class="transport">\s*<button id="playBtn"/);
    expect(between('deck', 'dpGuide')).toContain('<button id="micBtn"');
  });
});

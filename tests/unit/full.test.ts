// Full screen while practising (Rinat, 2026-10-31; five panels, 2026-11-01): where playing has
// got to in the title's bar, the notes named up the strip of the line being sung, the break
// before a rewaz item, the score panel's words and streak, and the page's parts it shows.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { fullZoom, whereText } from '../../src/app/full';
import { beatGlow, beatKind, noteAt, noteHue } from '../../src/app/fullfx';
import { scoreWord, streakOf } from '../../src/app/fullscore';
import { axisNotes, gaugeHTML } from '../../src/app/lines';
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

describe('full screen on a big screen', () => {
  it('is drawn as a 1440 × 900 screen’s, scaled up to fill it', () => {
    // A laptop, as it is; 1080p, 1440p and a 4K TV larger by the shorter side's share.
    expect(fullZoom(1280, 800)).toBe(1);
    expect(fullZoom(1920, 1080)).toBe(1.2);
    expect(fullZoom(2560, 1440)).toBe(1.6);
    expect(fullZoom(3840, 2160)).toBe(2.4);
    // A wide screen by its height; never smaller, at most 3 times.
    expect(fullZoom(3440, 1440)).toBe(1.6);
    expect(fullZoom(360, 780)).toBe(1);
    expect(fullZoom(7680, 4320)).toBe(3);
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

describe('the score panel', () => {
  it('has a word for each line as it ends', () => {
    expect([100, 95, 94, 85, 84, 70, 69, 60, 59, 0].map(scoreWord)).toEqual(['Superb!', 'Superb!', 'Lovely!', 'Lovely!', 'Good', 'Good', 'Nearly there', 'Nearly there', 'Keep going', 'Keep going']);
    expect(scoreWord(NaN)).toBe('Not heard');
  });

  it('counts the lines in tune in a row, ending with the latest', () => {
    expect(streakOf([])).toBe(0);
    expect(streakOf([90, 40, 85, 100])).toBe(2);
    expect(streakOf([90, 92, 84])).toBe(0);
    // A line not heard ends it.
    expect(streakOf([90, NaN, 88])).toBe(1);
  });
});

describe('the glow behind the panels', () => {
  it('flashes brightest on sam, then a tali, a khali, and least between', () => {
    expect([beatKind('X'), beatKind('2'), beatKind('0'), beatKind(undefined)]).toEqual(['sam', 'tali', 'khali', '']);
    const g = (['sam', 'tali', 'khali', ''] as const).map(beatGlow);
    expect(g[0]).toBe(1);
    expect(g.every((v, i) => i === 0 || v < g[i - 1]!)).toBe(true);
  });

  it('takes its colour from the note: Sa gold, each semitone on round the wheel', () => {
    expect(noteHue(0)).toBe(40);
    expect(noteHue(7)).toBe(250);
    expect(noteHue(11)).toBe(10);
    expect(noteHue(-1)).toBe(noteHue(11));
    expect(new Set(Array.from({ length: 12 }, (_, i) => noteHue(i))).size).toBe(12);
  });

  it('finds the note starting in a beat, else the one held through it', () => {
    const P = parseSong('S - R G | P - - -');
    const by = eventsByBeat(P);
    expect([0, 1, 2, 3, 4, 5].map((g) => noteAt(P, by, g))).toEqual([0, 0, 2, 4, 7, 7]);
    expect(noteAt(parseSong('S x R'), eventsByBeat(parseSong('S x R')), 1)).toBeNull();
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

  it('has five panels: the rewaz and title bars together, the score, the lines, the gauge, the controls', () => {
    const top = page.split('<div class="ptop">')[1]!;
    expect(top.indexOf('id="rwBar"')).toBeGreaterThan(-1);
    expect(top.indexOf('id="rwBar"')).toBeLessThan(top.indexOf('<div class="sheetHead">'));
    const order = ['class="ptop"', 'id="fullScore"', 'id="pl"', 'id="fullGauge"', 'id="fullCtl"'].map((x) => page.indexOf(x));
    expect(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1]!))).toBe(true);
    for (const id of ['fsRing', 'fsArc', 'fsAvg', 'fsSung', 'fsStreak', 'fsPop', 'fsLines', 'fsBurst']) expect(between('fullScore', 'pl')).toContain('id="' + id + '"');
    // The gauge names the note expected beside its middle.
    expect(gaugeHTML()).toContain('<span class="pgx"></span>');
  });

  it('has the break inside the lines, and a bar for the deck’s controls after them', () => {
    expect(between('plView', 'pitchBox')).toContain('id="fullBreak"');
    expect(between('fullBreak', 'pitchBox')).toContain('id="fbCount"');
    expect(between('pitchBox', 'keysRow')).toMatch(/<\/section>\s*<!--[^]*?-->\s*<aside class="fgauge" id="fullGauge"[^>]*><span class="fph">Pitch<\/span><\/aside>\s*<!--[^]*?-->\s*<div class="fullctl" id="fullCtl"[^>]* hidden><\/div>\s*<section class="keyscard" $/);
    // The controls it moves there are the deck's.
    expect(between('deck', 'dpGuide')).toMatch(/<div class="transport">\s*<button id="playBtn"/);
    expect(between('deck', 'dpGuide')).toContain('<button id="micBtn"');
    expect(between('deck', 'dpGuide')).toContain('<button id="recBtn"');
  });
});

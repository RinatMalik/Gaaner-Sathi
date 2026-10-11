// Taal pherta: a section's heading names a taal of its own (src/core/notation/sections.ts,
// src/core/notation/taalmap.ts), which the checker, the beat boxes, the sheet and the
// transport all follow.
import { describe, expect, it } from 'vitest';
import { boxesHTML } from '../../src/app/boxes';
import { issuesHTML, sheetHTML } from '../../src/app/view';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport, type BeatEntry, type PlaySource } from '../../src/audio/transport';
import { appendBeats, boxRows, placeBeats, setHeading } from '../../src/core/notation/boxes';
import { checkNotation } from '../../src/core/notation/check';
import { parseSong } from '../../src/core/notation/parse';
import { endHeadings, headingLabel, headingTaal, headingTempo, setHeadingTaal, songSections } from '../../src/core/notation/sections';
import { placeIn, taalMap } from '../../src/core/notation/taalmap';
import { taalInfo } from '../../src/core/taal/taals';
import { firstDifference, RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const TEXT = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\nপা ধা না র্সা | না ধা পা মা\n# স্থায়ী\nসা রা গা | মা পা ধা';

describe('a taal named in a heading', () => {
  it('is read in Bengali or English, in any of its spellings, alone or with তাল', () => {
    const cases: [string, string | undefined][] = [
      ['অন্তরা · কাহারবা', 'keherwa'],
      ['অন্তরা · কাহারবা · tempo 110', 'keherwa'],
      ['Antara (Keherwa)', 'keherwa'],
      ['antara - kaharwa taal', 'keherwa'],
      ['তাল: দাদরা', 'dadra'],
      ['KEHERWA', 'keherwa'],
      ['ঝাঁপতাল', 'jhaptal'],
      ['Teen taal', 'teentaal'],
      ['ত্রিতাল', 'teentaal'],
      ['রূপকড়া', 'rupakra'],
      ['রূপক', 'rupak'],
      ['সঞ্চারী (তেওড়া)', 'teora'],
      // য় as one character, and as য and a nukta.
      ['কাওয়ালি', 'kawali'],
      ['কাওয়ালি', 'kawali'],
      ['Dandiya', 'garba'],
      // None: no taal, part of a longer word, or two taals (the song's own taal pherta note).
      ['স্থায়ী', undefined],
      ['অন্তরা ২', undefined],
      ['Dadras', undefined],
      ['তাল ফেরতা: দাদরা/কাহারবা', undefined],
    ];
    expect(cases.map(([h]) => headingTaal(h))).toEqual(cases.map(([, id]) => id));
  });

  it('is left out of the section’s name, as the tempo is', () => {
    expect(headingLabel('অন্তরা · কাহারবা · tempo 110')).toBe('অন্তরা');
    expect(headingLabel('Antara (Keherwa)')).toBe('Antara');
    expect(headingLabel('কাহারবা · অন্তরা')).toBe('অন্তরা');
    expect(headingLabel('অন্তরা · তাল কাহারবা')).toBe('অন্তরা');
    expect(headingLabel('কাহারবা')).toBe('');
    expect(headingLabel('তাল ফেরতা: দাদরা/কাহারবা')).toBe('তাল ফেরতা: দাদরা/কাহারবা');
    expect(headingLabel('স্থায়ী')).toBe('স্থায়ী');
    expect(headingTempo('অন্তরা · কাহারবা · tempo 110')).toBe(110);
  });

  it('is written into a heading, changed or taken out, leaving the rest as written', () => {
    expect(setHeadingTaal('# অন্তরা\nসা', 1, 'keherwa')).toBe('# অন্তরা · কাহারবা\nসা');
    expect(setHeadingTaal('# অন্তরা · tempo 110', 1, 'keherwa')).toBe('# অন্তরা · কাহারবা · tempo 110');
    expect(setHeadingTaal('# tempo 100', 1, 'dadra')).toBe('# দাদরা · tempo 100');
    expect(setHeadingTaal('#', 1, 'keherwa')).toBe('# কাহারবা');
    expect(setHeadingTaal('# অন্তরা (Keherwa)\r\nসা', 1, 'dadra')).toBe('# অন্তরা (দাদরা)\r\nসা');
    expect(setHeadingTaal('# অন্তরা · কাহারবা · tempo 110', 1, null)).toBe('# অন্তরা · tempo 110');
    expect(setHeadingTaal('# কাহারবা · অন্তরা', 1, null)).toBe('# অন্তরা');
    expect(setHeadingTaal('# অন্তরা (Keherwa)', 1, null)).toBe('# অন্তরা');
    // Not a heading, or a heading naming none to take out: unchanged.
    expect(setHeadingTaal('সা রা গা', 1, 'dadra')).toBe('সা রা গা');
    expect(setHeadingTaal('# স্থায়ী', 1, null)).toBe('# স্থায়ী');
    // Renaming a heading in the boxes keeps its taal and its tempo.
    expect(setHeading('# অন্তরা · কাহারবা · tempo 110', 0, 'Antara')).toBe('# Antara · কাহারবা · tempo 110');
    expect(setHeading('# অন্তরা · কাহারবা', 0, '')).toBe('# কাহারবা');
  });

  it('gives its section that taal; of several headings in a row, the nearest naming one does', () => {
    const S = songSections(TEXT, parseSong(TEXT));
    expect(S.map((s) => [s.label, s.taal])).toEqual([['স্থায়ী', undefined], ['অন্তরা', 'keherwa'], ['স্থায়ী', undefined]]);
    const t = '# কাহারবা\n# অন্তরা\nসা রা গা মা';
    expect(songSections(t, parseSong(t))[0]!.taal).toBe('keherwa');
    expect(endHeadings(TEXT + '\n# আভোগ · দাদরা', parseSong(TEXT + '\n# আভোগ · দাদরা'))).toEqual({ any: true, taal: 'dadra' });
    expect(endHeadings(TEXT, parseSong(TEXT))).toEqual({ any: false });
  });
});

describe('the taal map', () => {
  it('starts each change of taal on sam, and goes back to the song’s taal after the section', () => {
    const P = parseSong(TEXT);
    const M = taalMap(TEXT, P, 'dadra', 1);
    expect(M.runs.map((r) => [r.from, r.T.id, r.off])).toEqual([[0, 'dadra', 0], [6, 'keherwa', -6], [14, 'dadra', -14]]);
    expect(M.changes).toBe(true);
    expect(P.beatList.map((b) => placeIn(M.beat(b.g), b.g).p)).toEqual([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5]);
    expect(M.line(1).T.id).toBe('keherwa');
    expect(M.end).toBe(M.runs[2]);
  });

  it('starts the song on its start beat', () => {
    const P = parseSong(TEXT);
    const M = taalMap(TEXT, P, 'dadra', 4);
    expect(P.beatList.slice(0, 8).map((b) => placeIn(M.beat(b.g), b.g).p)).toEqual([3, 4, 5, 0, 1, 2, 0, 1]);
  });

  it('is one taal from the start beat for a song whose headings name none, as before', () => {
    const t = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · tempo 90\nপা ধা না | র্সা না ধা';
    const P = parseSong(t);
    const M = taalMap(t, P, 'rupak', 2);
    expect(M.runs).toHaveLength(1);
    expect(M.changes).toBe(false);
    expect(P.beatList.map((b) => placeIn(M.beat(b.g), b.g).p)).toEqual(P.beatList.map((b) => (b.g + 1) % 7));
  });

  it('puts a new line under a heading after the last line in that heading’s taal, on sam', () => {
    const t = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\n';
    const P = parseSong(t);
    const M = taalMap(t, P, 'dadra', 1);
    expect([M.end.T.id, M.end.from, M.end.off]).toEqual(['keherwa', 6, -6]);
    expect(M.changes).toBe(true);
    const empty = taalMap('# স্থায়ী · কাহারবা\n', parseSong('# স্থায়ী · কাহারবা\n'), 'dadra', 3);
    expect([empty.end.T.id, empty.end.off]).toEqual(['keherwa', 2]);
  });
});

describe('a section in its own taal', () => {
  const P = parseSong(TEXT);
  const M = taalMap(TEXT, P, 'dadra', 1);

  it('is checked against its own taal’s vibhags', () => {
    expect(checkNotation(P, M)).toEqual([]);
    // Read as all Dadra, the Kaharwa line's bars fall wrong.
    expect(checkNotation(P, taalInfo('dadra'), 0).length).toBeGreaterThan(0);
    const r = issuesHTML(P, M, 0, 'bn');
    expect(r.html).toContain('in Dadra, then Keherwa, then Dadra');
    expect(r.html).toContain('vibhag line of its section’s taal');
  });

  it('shows its own taal’s marks on the sheet', () => {
    const html = sheetHTML(P, M, 0, false, 'bn');
    const line = (n: number) => Array.from(html.split('data-n="' + n + '"')[2]!.split('</div></div>')[0]!.matchAll(/<span class="tm">([^<]*)<\/span>/g), (m) => m[1]);
    expect(line(0)).toEqual(['X', '', '', '0', '', '']);
    expect(line(1)).toEqual(['X', '', '', '', '0', '', '', '']);
    expect(line(2)).toEqual(['X', '', '', '0', '', '']);
  });

  it('gets boxes grouped by its taal, and its heading a taal picker', () => {
    const rows = boxRows(TEXT, P, M, 0) as any[];
    const line1 = rows.find((r) => r.kind === 'notes' && r.n === 1);
    expect(line1.T.cycle).toBe(8);
    expect(line1.beats.map((b: any) => b.p)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(rows.filter((r) => r.kind === 'head').map((r) => r.taal)).toEqual([undefined, 'keherwa', undefined]);
    const html = boxesHTML(rows, () => 1);
    const pickers = Array.from(html.matchAll(/<select class="bxtaal" data-key="a:(\d)"[^>]*>([\s\S]*?)<\/select>/g), (m) => m[1] + ' ' + (/<option value="(\w*)" selected>/.exec(m[2]!)?.[1] ?? '?'));
    expect(pickers).toEqual(['0 ', '1 keherwa', '2 ']);
    // Kaharwa's groups of four, Dadra's of three.
    const groups = html.split('<div class="bxrow').slice(1).map((r) => r.split('class="bxgrp"').slice(1).map((g) => (g.match(/class="bxcell/g) || []).length));
    expect(groups.slice(0, 4)).toEqual([[], [3, 3], [], [4, 4]]);
  });

  it('is typed in its own taal: bars at its vibhags, a new line under its heading a cycle of it long', () => {
    const t = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\nপা ধা না র্সা';
    expect(appendBeats(t, parseSong(t), taalMap(t, parseSong(t), 'dadra', 1), 0, 1, ['না', 'ধা'])).toBe(t.replace('র্সা', 'র্সা | না ধা'));
    const u = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\n';
    const r = placeBeats(u, (x, Q) => taalMap(x, Q, 'dadra', 1), 0, { at: { end: true } }, ['S', 'R', 'G', 'M', 'P', 'D', 'N', 'S']);
    expect(r.text).toBe('# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · কাহারবা\nS R G M | P D N S\n');
    expect(r.next).toEqual({ end: true, j: 0 });
  });
});

describe('taal pherta in the transport', () => {
  function play(text: string, taal: string, opts: { from: number; to: number; loop: boolean; rounds?: number }, map: boolean, countIn = false) {
    const P = parseSong(text);
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(5)), () => {});
    const beats: BeatEntry[] = [];
    T.onBeat = (q) => beats.push(q);
    const M = taalMap(text, P, taal, 1);
    const src: PlaySource = { parsed: P, taal: taalInfo(taal), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound: { ...structuredClone(DEFAULT_SOUND), countIn } };
    if (map) src.taalAt = (s) => M.beat(s);
    T.start(src, opts);
    for (let i = 1; i * 0.025 <= 30 && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    return { beats, log: rec.log };
  }

  it('counts each section in its own taal', () => {
    const b = play(TEXT, 'dadra', { from: 0, to: 2, loop: false }, true).beats;
    expect(b.map((q) => q.p)).toEqual([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5]);
  });

  it('counts in with a cycle of the taal of the section it starts in', () => {
    const b = play(TEXT, 'dadra', { from: 1, to: 1, loop: true, rounds: 1 }, true, true).beats;
    expect(b.filter((q) => q.pass < 0).map((q) => q.p)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('plays a Kaharwa section exactly as a song in Kaharwa plays the same line', () => {
    const own = play('পা ধা না র্সা | না ধা পা মা', 'keherwa', { from: 0, to: 0, loop: true, rounds: 1 }, false, true);
    const pherta = play(TEXT, 'dadra', { from: 1, to: 1, loop: true, rounds: 1 }, true, true);
    expect(own.log.length).toBeGreaterThan(100);
    expect(firstDifference(own.log, pherta.log)).toBeNull();
  });

  it('plays a song whose headings name no taal exactly as before', () => {
    const t = '# স্থায়ী\nসা রা গা | মা পা ধা\nপা ধা না | র্সা না ধা';
    const a = play(t, 'dadra', { from: 0, to: 1, loop: false }, false, true);
    const b = play(t, 'dadra', { from: 0, to: 1, loop: false }, true, true);
    expect(firstDifference(a.log, b.log)).toBeNull();
  });
});

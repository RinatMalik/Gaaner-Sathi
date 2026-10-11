// A song's sections: jumping between them, and a tempo of their own (src/core/notation/sections.ts),
// played by the transport beat by beat.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport, type BeatEntry } from '../../src/audio/transport';
import { EXERCISES } from '../../src/core/exercises';
import { parseSong } from '../../src/core/notation/parse';
import { headingLabel, headingTempo, sectionOfLine, setHeadingTempo, songSections } from '../../src/core/notation/sections';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const SONG = [
  'সা রা গা | মা পা ধা', // before any heading
  '# স্থায়ী',
  'না র্সা না | ধা পা মা',
  '> আ মার সো | নার বাং লা',
  'গা মা পা | ধা না র্সা',
  '',
  '# রাগ: ইমন',
  '# অন্তরা · tempo 110',
  'পা ধা না | র্সা র্রা র্সা',
  '# সঞ্চারী (লয় ৮০)',
  'সা - - | - - -',
  '# আভোগ',
].join('\n');

describe('sections', () => {
  it('read a tempo from a heading in Latin or Bengali, with or without words around it', () => {
    expect(headingTempo('অন্তরা · tempo 110')).toBe(110);
    expect(headingTempo('Antara (Tempo: 96)')).toBe(96);
    expect(headingTempo('সঞ্চারী লয় ৮০')).toBe(80);
    expect(headingTempo('সঞ্চারী লয় ৮০')).toBe(80); // য় written as য + nukta
    expect(headingTempo('সঞ্চারী লয় ৮০')).toBe(80); // য় as one character
    expect(headingTempo('আভোগ ♩=72')).toBe(72);
    expect(headingTempo('tempo 400')).toBe(240);
    expect(headingTempo('tempo 12')).toBe(30);
    for (const h of ['স্থায়ী', 'tempo', 'contemporary 12', 'tempo 0', 'Puja 12']) expect(headingTempo(h)).toBeUndefined();
    expect(headingLabel('অন্তরা · tempo 110')).toBe('অন্তরা');
    expect(headingLabel('সঞ্চারী (লয় ৮০)')).toBe('সঞ্চারী');
    expect(headingLabel('স্থায়ী')).toBe('স্থায়ী');
  });

  it('group the notes lines under each heading; the last of several headings names them', () => {
    const P = parseSong(SONG);
    const S = songSections(SONG, P);
    expect(S.map((s) => [s.label, s.first, s.last, s.tempo, s.headLine, s.tempoLine])).toEqual([
      ['', 0, 0, undefined, 0, 0],
      ['স্থায়ী', 1, 2, undefined, 2, 0],
      ['অন্তরা', 3, 3, 110, 8, 8],
      ['সঞ্চারী', 4, 4, 80, 10, 10],
    ]);
    expect([0, 1, 2, 3, 4, 9].map((l) => sectionOfLine(S, l))).toEqual([0, 1, 1, 2, 3, -1]);
  });

  it('a tempo written in a heading just above the one that names the section still counts', () => {
    const t = '# Bhairavi · tempo 90\n# স্থায়ী\nসা রা গা';
    const S = songSections(t, parseSong(t));
    expect(S).toHaveLength(1);
    expect([S[0]!.label, S[0]!.tempo, S[0]!.headLine, S[0]!.tempoLine]).toEqual(['স্থায়ী', 90, 2, 1]);
  });

  it('cover every notes line of every exercise once, in order, with no tempo of their own', () => {
    let several = 0;
    for (const e of EXERCISES) {
      const P = parseSong(e.text);
      const S = songSections(e.text, P);
      expect(S.flatMap((s) => Array.from({ length: s.last - s.first + 1 }, (_, k) => s.first + k))).toEqual(P.noteLines.map((l) => l.n));
      expect(S.every((s) => s.tempo == null && s.label)).toBe(true);
      if (S.length > 1) several++;
    }
    expect(several).toBeGreaterThan(0); // আরোহ / অবরোহ and the like
  });

  it('rewrite a heading’s tempo in place, keeping its words and digits, or add or remove one', () => {
    expect(setHeadingTempo(SONG, 8, 96).split('\n')[7]).toBe('# অন্তরা · tempo 96');
    expect(setHeadingTempo(SONG, 10, 92).split('\n')[9]).toBe('# সঞ্চারী (লয় ৯২)');
    expect(setHeadingTempo(SONG, 2, 70).split('\n')[1]).toBe('# স্থায়ী · tempo 70');
    expect(setHeadingTempo(SONG, 8, null).split('\n')[7]).toBe('# অন্তরা');
    expect(setHeadingTempo(SONG, 10, null).split('\n')[9]).toBe('# সঞ্চারী');
    expect(setHeadingTempo('#\nসা', 1, 100)).toBe('# tempo 100\nসা');
    expect(setHeadingTempo('# a\r\nসা', 1, 100)).toBe('# a · tempo 100\r\nসা');
    // Not a heading: left alone. Everything else in the text is untouched.
    expect(setHeadingTempo(SONG, 3, 100)).toBe(SONG);
    const changed = setHeadingTempo(SONG, 8, 120).split('\n');
    expect(changed.filter((l, i) => l !== SONG.split('\n')[i])).toEqual(['# অন্তরা · tempo 120']);
  });
});

describe('a tempo per section in the transport', () => {
  function play(text: string, opts: { from: number; to: number; loop: boolean; rounds?: number }, sound: Partial<typeof DEFAULT_SOUND> = {}, secs = 40) {
    const P = parseSong(text);
    const S = songSections(text, P);
    const song = { saKey: 0, saOct: 4, tempo: 120, startOn: 1 };
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
    const beats: { q: BeatEntry; spb: number }[] = [];
    T.onBeat = (q, spb) => beats.push({ q, spb });
    const tempoAt = (s: number) => S[sectionOfLine(S, P.lineOfBeat[s] ?? -1)]?.tempo ?? song.tempo;
    T.start({ parsed: P, taal: taalInfo('dadra'), song, sound: { ...structuredClone(DEFAULT_SOUND), countIn: false, ...sound }, tempoAt }, opts);
    for (let i = 1; i * 0.025 <= secs && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    return beats;
  }
  const TEXT = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · tempo 60\nপা ধা না | র্সা না ধা\n# আভোগ\nগা মা পা | মা গা রা';

  it('plays each section at its own tempo, the others at the song’s, with the beats spaced to match', () => {
    const b = play(TEXT, { from: 0, to: 2, loop: false });
    const played = b.filter((x) => x.q.pass >= 0);
    expect(played.map((x) => x.q.tempo)).toEqual([...Array(6).fill(120), ...Array(6).fill(60), ...Array(6).fill(120)]);
    // Each beat lands one beat of its own tempo after the one before.
    for (let i = 1; i < played.length; i++) expect(played[i]!.q.time - played[i - 1]!.q.time).toBeCloseTo(played[i - 1]!.spb, 9);
  });

  it('counts in at the tempo of the section it starts in, and the tempo trainer speeds each section from its own', () => {
    const b = play(TEXT, { from: 1, to: 1, loop: true, rounds: 3 }, { countIn: true, ramp: true, rampStep: 10, rampMax: 200 });
    expect(b.filter((x) => x.q.pass < 0).every((x) => x.q.tempo === 60)).toBe(true);
    const byRound = [0, 1, 2].map((r) => Array.from(new Set(b.filter((x) => x.q.pass === r).map((x) => x.q.tempo))));
    expect(byRound).toEqual([[60], [70], [80]]);
  });

  it('without section tempos plays exactly as before', () => {
    const plain = 'সা রা গা | মা পা ধা\nপা ধা না | র্সা না ধা';
    const b = play(plain, { from: 0, to: 1, loop: false });
    expect(new Set(b.map((x) => x.q.tempo))).toEqual(new Set([120]));
  });
});

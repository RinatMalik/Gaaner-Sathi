// The new screen's HTML against the prototype's own rendering code (cut out of the HTML
// and run against fake page elements), on the edge cases, every exercise and generated
// songs: note glyphs, the diary sheet, line pickers, the checker panel, the taal strip,
// the now-singing panel, chips, the song picker, layer chips and the editor palette.
import { describe, expect, it } from 'vitest';
import * as V from '../../src/app/view';
import { EXERCISES } from '../../src/core/exercises';
import { parseSong } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { normalize, type Song } from '../../src/core/song/model';
import { beatLabel, LAYERS, SPEEDS } from '../../src/core/taal/rhythm';
import { taalInfo } from '../../src/core/taal/taals';
import { canon, seeded } from '../helpers';
import { EDGE_CASES, randomSong } from './generate';
import { protoExamples, protoRhythm, protoViewWorld, type ProtoViewState } from './prototype';

const rand = seeded(20261011);
/** Held vowels in every spelling (০ 0 - – —), alone and mixed, which lyrics draw faded. */
const LYRIC_CASES = ['সা রা গা মা পা ধা\n> — ০০ -–— 0a আ— ০\n> ০ — x – - 00', "S R G M\n> ০-— – —০ sa\n> <b>&\" ' ।"];
const SONGS = [...EDGE_CASES, ...LYRIC_CASES, ...EXERCISES.map((e) => e.text), ...Array.from({ length: 600 }, () => randomSong(rand))];
const SCRIPTS = ['bn', 'lat'] as const;
/** The prototype's taals; the ten added since are tested in tests/unit/taals.test.ts. */
const TAAL_IDS = Object.keys(protoRhythm.TAALS);
const STYLES = ['tabla', 'dholak', 'kit', 'click', 'off'] as const;
const W = protoViewWorld();
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const int = (r: () => number, n: number) => Math.floor(r() * n);

// Each song parsed by both sides: the port's parser feeds the port, the prototype's its own.
const parsed = new Map<string, [ParsedSong, any]>(SONGS.map((t) => [t, [parseSong(t), W.parseSong(t)]]));

function state(o: Partial<ProtoViewState>): ProtoViewState {
  return {
    prefs: { script: 'bn' }, parsed: null, taal: null, current: { startOn: 1, example: false },
    S: { playing: false, loop: false, secStart: 0, secEnd: 0, secLen: 1, curEls: [], lastLine: -1 },
    songs: new Map(), insOct: 0, EXAMPLES: [], ...o,
  };
}

/** How many cases differ, with the first few to debug from. */
function differences<T>(cases: T[], same: (c: T) => boolean) {
  const bad = cases.filter((c) => !same(c));
  return { differing: bad.length, first: bad.slice(0, 3) };
}
const NONE = { differing: 0, first: [] };

// The now-singing panel's four elements. Unwritten ones keep a marker, so "not written" counts.
const NOW = ['#nowLab', '#bigNote', '#bigLy', '#nextStrip'] as const;
const MARK = '∅';
function protoNow(run: () => void): string[] {
  for (const s of NOW) Object.assign(W.el(s), { textContent: MARK, innerHTML: MARK });
  run();
  return [W.el('#nowLab').textContent, W.el('#bigNote').innerHTML, W.el('#bigLy').innerHTML, W.el('#nextStrip').innerHTML];
}
const portNow = (v: V.NowView | null): string[] => (v ? [v.label, v.big, v.ly, v.next ?? MARK] : [MARK, MARK, MARK, MARK]);

describe('the screen matches the prototype', () => {
  it('note glyphs, lyrics and plain beats, in both scripts', () => {
    const cases = SONGS.flatMap((t) => SCRIPTS.flatMap((script) => parsed.get(t)![0].beatList.map((_, g) => ({ t, g, script }))));
    expect(cases.length).toBeGreaterThan(5000);
    expect(
      differences(cases, ({ t, g, script }) => {
        const [P, Q] = parsed.get(t)!;
        const b = P.beatList[g]!;
        const q = Q.beatList[g];
        W.set(state({ prefs: { script } }));
        return (
          V.beatNoteHTML(b, script) === W.beatNoteHTML(q) &&
          V.lyricHTML(b) === W.lyricHTML(q) &&
          V.plainBeat(b, script) === W.plainBeat(q) &&
          b.units.every((u, i) => V.unitHTML(u, script) === W.unitHTML(q.units[i], script))
        );
      }),
    ).toEqual(NONE);
  });

  it('the diary sheet, in every taal, from several start beats, in both scripts', () => {
    const r = seeded(1);
    const cases = [
      ...SONGS.flatMap((t) => [0, 1, 2].map(() => ({ t, id: pick(r, TAAL_IDS), startOn: 1 + int(r, 9), script: pick(r, SCRIPTS), example: r() < 0.3 }))),
      ...EXERCISES.flatMap((e) => TAAL_IDS.flatMap((id) => SCRIPTS.map((script) => ({ t: e.text, id, startOn: 1, script, example: true })))),
    ];
    expect(
      differences(cases, ({ t, id, startOn, script, example }) => {
        const [P, Q] = parsed.get(t)!;
        W.set(state({ prefs: { script }, parsed: Q, taal: W.taalInfo(id), current: { startOn, example } }));
        const el = { innerHTML: '' };
        W.renderSheet(el);
        return V.sheetHTML(P, taalInfo(id), startOn - 1, example, script) === el.innerHTML;
      }),
    ).toEqual(NONE);
  });

  it('the taal strip for every taal, rhythm style and speed', () => {
    const cases = TAAL_IDS.flatMap((id) => STYLES.flatMap((beat) => (['half', 'normal', 'double'] as const).map((speed) => ({ id, beat, speed }))));
    expect(
      differences(cases, ({ id, beat, speed }) => {
        W.set(state({ prefs: { beat, speed }, taal: W.taalInfo(id) }));
        W.renderTaal();
        const T = taalInfo(id);
        return (
          V.taalName(T) === W.el('#taalName').textContent &&
          V.taalSub(T) === W.el('#taalSub').textContent &&
          V.taalStripHTML(T, (p) => beatLabel(beat, T.id, SPEEDS[speed] || 1, p)) === W.el('#taalStrip').innerHTML
        );
      }),
    ).toEqual(NONE);
  });

  it('the line pickers', () => {
    const cases = SONGS.flatMap((t) => SCRIPTS.map((script) => ({ t, script })));
    expect(
      differences(cases, ({ t, script }) => {
        const [P, Q] = parsed.get(t)!;
        W.set(state({ prefs: { script }, parsed: Q }));
        W.renderLineSelects(false);
        return V.lineOptionsHTML(P, script) === W.el('#fromLine').innerHTML && W.el('#toLine').innerHTML === W.el('#fromLine').innerHTML;
      }),
    ).toEqual(NONE);
  });

  it('the checker panel, with its Show and Fix targets', () => {
    const r = seeded(2);
    const cases = SONGS.flatMap((t) => [0, 1].map(() => ({ t, id: pick(r, TAAL_IDS), startOn: 1 + int(r, 6), script: pick(r, SCRIPTS) })));
    expect(
      differences(cases, ({ t, id, startOn, script }) => {
        const [P, Q] = parsed.get(t)!;
        W.set(state({ prefs: { script }, parsed: Q, taal: W.taalInfo(id), current: { startOn } }));
        W.renderIssues();
        const v = V.issuesHTML(P, taalInfo(id), startOn - 1, script);
        return v.html === W.el('#issues').innerHTML && canon(v.list) === canon(W.issues());
      }),
    ).toEqual(NONE);
    // The generated songs exercise every kind of row.
    const html = cases.map(({ t, id, startOn, script }) => V.issuesHTML(parsed.get(t)![0], taalInfo(id), startOn - 1, script).html).join('');
    for (const bit of ['data-act="fix"', 'data-act="show"', 'should probably have', 'ends partway', 'is not a note', 'lyrics need', 'more. Fix these first', 'Checked: every bar']) expect(html).toContain(bit);
  });

  it('the now-singing panel when ready, in every taal and both scripts', () => {
    const r = seeded(3);
    const cases = SONGS.map((t) => ({ t, id: pick(r, TAAL_IDS), from: int(r, 10) - 1, countIn: r() < 0.5, example: r() < 0.3, script: pick(r, SCRIPTS) }));
    expect(
      differences(cases, ({ t, id, from, countIn, example, script }) => {
        const [P, Q] = parsed.get(t)!;
        W.set(state({ prefs: { script, countIn }, parsed: Q, taal: W.taalInfo(id), current: { startOn: 1, example } }));
        W.el('#fromLine').value = String(from);
        const got = protoNow(() => W.showIdle());
        return canon(portNow(V.nowIdle(P, taalInfo(id), +String(from) || 0, example, countIn, script))) === canon(got);
      }),
    ).toEqual(NONE);
  });

  it('the now-singing panel while playing: count-in, every beat, loops and rounds', () => {
    const r = seeded(4);
    const cases: { t: string; q: any; sec: V.Section; ramp: boolean; guide: 'full' | 'soft' | 'off'; script: 'bn' | 'lat' }[] = [];
    for (const t of SONGS) {
      const P = parsed.get(t)![0];
      const L = P.noteLines;
      if (!L.length) continue;
      for (let k = 0; k < 3; k++) {
        const from = int(r, L.length);
        const to = from + int(r, L.length - from);
        const loop = r() < 0.6;
        const secStart = L[from]!.start;
        const secEnd = loop ? L[to]!.end : P.total;
        const sec = { secStart, secEnd, secLen: Math.max(1, secEnd - secStart), loop };
        const opts = { ramp: r() < 0.5, guide: pick(r, ['full', 'soft', 'off'] as const), script: pick(r, SCRIPTS) };
        for (let c = 1; c <= 3; c++) cases.push({ t, sec, ...opts, q: { s: secStart - c, raw: secStart - c, p: int(r, 8), pass: -1, tempo: 100, guide: false } });
        for (let c = 0; c < 6; c++) {
          const s = secStart + int(r, sec.secLen + 2);
          cases.push({ t, sec, ...opts, q: { s, raw: s + int(r, 40), p: int(r, 16), pass: int(r, 4), tempo: 60 + int(r, 120), guide: r() < 0.5 } });
        }
      }
    }
    expect(cases.length).toBeGreaterThan(5000);
    expect(
      differences(cases, ({ t, q, sec, ramp, guide, script }) => {
        const [P, Q] = parsed.get(t)!;
        W.set(state({ prefs: { script, ramp, guide }, parsed: Q, S: { playing: true, ...sec, curEls: [], lastLine: -1 } }));
        const got = protoNow(() => W.showBeat(q));
        return canon(portNow(V.nowBeat(P, q, sec, ramp, guide, script))) === canon(got);
      }),
    ).toEqual(NONE);
  });

  it('panel messages and the coming-up chips, wrapping inside a loop', () => {
    for (const [label, sub, big] of [['Count-in', '', '7'], ['Finished', 'Press play to sing it again, or tap a line to start there.', ''], ['<b>&"', '<i>"&', '<&>'], ['', '', '']]) {
      expect(canon(portNow(V.nowMessage(label!, sub!, big!)))).toBe(canon(protoNow(() => W.setNowMessage(label, sub, big))));
    }
    const r = seeded(5);
    const cases = SONGS.flatMap((t) => [0, 1, 2].map(() => ({ t, g: int(r, 40) - 3, n: int(r, 6), playing: r() < 0.7, loop: r() < 0.6, a: int(r, 20), len: 1 + int(r, 12), script: pick(r, SCRIPTS) })));
    expect(
      differences(cases, ({ t, g, n, playing, loop, a, len, script }) => {
        const [P, Q] = parsed.get(t)!;
        const sec = { secStart: a, secEnd: a + len, secLen: len, loop };
        W.set(state({ prefs: { script }, parsed: Q, S: { playing, ...sec } }));
        return V.chipsHTML(P, g, n, script, playing ? sec : null) === W.chipsFrom(g, n);
      }),
    ).toEqual(NONE);
  });

  it('the song picker, with awkward titles', () => {
    const r = seeded(6);
    const words = ['আমার', 'সোনার', 'বাংলা', 'a', 'Z', '<b>', '&amp;', '"q"', 'é', '১২', ' '];
    for (let k = 0; k < 60; k++) {
      const list: Song[] = Array.from({ length: int(r, 8) }, (_, i) =>
        normalize({ id: 'song-' + i + (r() < 0.2 ? '"<&>' : ''), title: Array.from({ length: 1 + int(r, 4) }, () => pick(r, words)).join(' '), text: '' }));
      W.set(state({ songs: new Map(list.map((s) => [s.id, s])), EXAMPLES: protoExamples, current: null as unknown as Record<string, unknown> }));
      W.renderLibrary();
      const own = [...list].sort((a, b) => a.title.localeCompare(b.title));
      expect(V.libraryHTML(own, EXERCISES)).toBe(W.el('#songSel').innerHTML);
    }
  });

  it('the layer chips for each rhythm style', () => {
    const r = seeded(7);
    const ids = Object.keys(LAYERS);
    for (const style of STYLES) {
      for (let k = 0; k < 20; k++) {
        const on = ids.filter(() => r() < 0.4);
        W.set(state({ prefs: { beat: style, layers: { tabla: on, dholak: on, kit: on } } }));
        W.renderLayerChips();
        const v = V.layerChipsHTML(style, style === 'click' || style === 'off' ? [] : on);
        expect([v.hidden, v.html]).toEqual([W.el('#layerRow').hidden, W.el('#layerChips').innerHTML]);
      }
    }
  });

  it('the palette, the taal and start-beat pickers, and the key and octave pickers', () => {
    for (const insOct of [-1, 0, 1]) {
      for (const script of SCRIPTS) {
        W.set(state({ prefs: { script }, insOct }));
        W.renderNoteButtons();
        expect(V.noteButtonsHTML(insOct, script)).toBe(W.el('#noteBtns').innerHTML);
      }
    }
    W.renderTaalControls();
    // The prototype's six come first, as it listed them; the new taals follow in their own groups.
    const first = /^<optgroup label="Common taals">(.*?)<\/optgroup>/.exec(V.taalOptionsHTML());
    expect(first?.[1]).toBe(W.el('#taalSel').innerHTML);
    for (const id of TAAL_IDS) {
      W.set(state({ taal: W.taalInfo(id), current: { startOn: 3 } }));
      W.renderStartOn();
      expect(V.startOnOptionsHTML(taalInfo(id))).toBe(W.el('#startOn').innerHTML);
    }
    expect(V.keyOptionsHTML()).toBe(W.keyOptions());
    expect(V.octOptionsHTML()).toBe(W.octOptions());
  });
});

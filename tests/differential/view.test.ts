// The new screen's HTML against the prototype's own rendering code (cut out of the HTML
// and run against fake page elements), on the edge cases, every exercise and generated
// songs: note glyphs, the diary sheet, line pickers, the checker panel, the taal's name, the
// song picker, layer chips and the editor palette. (The now-singing panel, its chips and the
// taal strip were compared too until the Practice view was redone, 2026-10-15.)
import { describe, expect, it } from 'vitest';
import * as V from '../../src/app/view';
import { REFERENCE_EXERCISES as EXERCISES } from '../reference-exercises';
import { parseSong } from '../../src/core/notation/parse';
import type { ParsedSong } from '../../src/core/notation/types';
import { normalize, type Song } from '../../src/core/song/model';
import { LAYERS } from '../../src/core/taal/rhythm';
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
/** The deliberate differences in a note's glyph (Rinat, 2026-10-15): a note two octaves away
 * has two dots (classes lo2, hi2), where the prototype drew one for either octave; and in
 * Bengali two or more octaves up is two dots over the note (up2), where the prototype drew a
 * রেফ for each. Both sides are brought to one form before they are compared. */
const oneDot = (html: string) => html.replace(/ (?:lo2|hi2)(?=[ "])/g, '').replace(/<span class="u">(?:র্){2,}/g, '<span class="u up2">');

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
          oneDot(V.beatNoteHTML(b, script)) === oneDot(W.beatNoteHTML(q)) &&
          V.lyricHTML(b) === W.lyricHTML(q) &&
          V.plainBeat(b, script) === W.plainBeat(q) &&
          b.units.every((u, i) => oneDot(V.unitHTML(u, script)) === oneDot(W.unitHTML(q.units[i], script)))
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
        return oneDot(V.sheetHTML(P, taalInfo(id), startOn - 1, example, script)) === oneDot(el.innerHTML);
      }),
    ).toEqual(NONE);
  });

  // The prototype's taal strip of bols is gone from the Practice view (Rinat, 2026-10-15); its
  // name and structure stay, on the printed sheet and over the lines.
  it('the taal name and structure for every taal', () => {
    expect(
      differences(TAAL_IDS, (id) => {
        W.set(state({ taal: W.taalInfo(id) }));
        W.renderTaal();
        const T = taalInfo(id);
        return V.taalName(T) === W.el('#taalName').textContent && V.taalSub(T) === W.el('#taalSub').textContent;
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
        return oneDot(v.html) === oneDot(W.el('#issues').innerHTML) && canon(v.list) === canon(W.issues());
      }),
    ).toEqual(NONE);
    // The generated songs exercise every kind of row.
    const html = cases.map(({ t, id, startOn, script }) => V.issuesHTML(parsed.get(t)![0], taalInfo(id), startOn - 1, script).html).join('');
    for (const bit of ['data-act="fix"', 'data-act="show"', 'should probably have', 'ends partway', 'is not a note', 'lyrics need', 'more. Fix these first', 'Checked: every bar']) expect(html).toContain(bit);
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

  // The palette's row of twelve became the note pad (Rinat, 2026-10-15): tests/unit/pad.test.ts.
  it('the taal and start-beat pickers, and the key and octave pickers', () => {
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

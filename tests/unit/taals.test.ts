// The taals added after the prototype (2026-10-10): Tagore's own six, then Khemta,
// Deepchandi, Dhamar and Jhumra. The prototype's six are compared with its own code in
// tests/differential/rhythm.test.ts; the checks here run over all sixteen.
import { describe, expect, it } from 'vitest';
import { taalOptionsHTML, startOnOptionsHTML } from '../../src/app/view';
import { bolStrokes } from '../../src/audio/instruments/percussion';
import { checkNotation } from '../../src/core/notation/check';
import { parseSong } from '../../src/core/notation/parse';
import { normalize } from '../../src/core/song/model';
import { beatLabel, GROOVES, LAYERS, layerHits, rhythmTable, type LayerId } from '../../src/core/taal/rhythm';
import { REST, TAAL_GROUPS, TAAL_IDS, TAALS, taalInfo, type TaalId } from '../../src/core/taal/taals';

const TAGORE: TaalId[] = ['jhampak', 'shashthi', 'rupakra', 'nabatal', 'ekadashi', 'nabapanchatal'];
const NEW: TaalId[] = [...TAGORE, 'khemta', 'deepchandi', 'dhamar', 'jhumra', 'teora', 'kawali', 'garba'];
const STYLES = ['tabla', 'dholak', 'kit', 'click'];
const LAYER_IDS = Object.keys(LAYERS) as LayerId[];
const fits = (id: LayerId, style: string) => (LAYERS[id].styles as readonly string[]).includes(style);

/** A theka as written in the books: vibhags between bars, joined bols run together. */
function theka(id: TaalId): string {
  const T = taalInfo(id);
  return T.vib
    .map((v, i) => T.bols.slice(T.starts[i], T.starts[i]! + v).map((b) => (typeof b === 'string' ? b : b.join(''))).join(' '))
    .join(' | ');
}

describe('the new taals', () => {
  it('have the thekas the sources give, vibhag by vibhag', () => {
    expect(Object.fromEntries(NEW.map((id) => [id, theka(id)]))).toEqual({
      jhampak: 'Dhin Dhin Na | Dhin Na',
      shashthi: 'Dha Tet | DhaGe TeTe Dhin Na',
      rupakra: 'Dhin Dhin DhaGe | Tin TaGe | Dhin Dhin TeTe',
      nabatal: 'Dha Den Ta | TeTe KaTa | GaDi GheNe | DhaGe TeTe',
      ekadashi: 'Dha Den Ta | TeTe KaTa | GaDi GheNe | DhaGe TeTe TaGe TeTe',
      nabapanchatal: 'Dha Ge | Dha Ge Den Ta | Kat TaGe Den Ta | TeTe Dha Den Ta | TeTe KaTa GaDi GheNe',
      khemta: 'Dha Ti Te | Na Dhi Na | Ta Ti Te | Dha Dhi Na',
      deepchandi: 'Dha Dhin - | Dha Dha Tin - | Ta Tin - | Dha Dha Dhin -',
      dhamar: 'Ka Dhi Ta | Dhi Ta | Dha - | Ga Di Na | Di Na Ta -',
      jhumra: 'Dhin -Dha TiRaKiTa | Dhin Dhin DhaGe TiRaKiTa | Tin -Ta TiRaKiTa | Dhin Dhin DhaGe TiRaKiTa',
      teora: 'Dha Dhi Na | Dhi Na | Dhi Na',
      kawali: 'Dha Dhin DhaDha Dhin | Dha Tin DhaDha Dhin',
      garba: 'Dhin DhaTi Dha | Tin TaTi Ta',
    });
  });

  it('have their claps and waves: Tagore’s taals only talis, the others a khali', () => {
    const marks = Object.fromEntries(NEW.map((id) => [id, taalInfo(id).starts.map((s, i) => s + 1 + ':' + TAALS[id].marks[i]).join(' ')]));
    expect(marks).toEqual({
      jhampak: '1:X 4:2',
      shashthi: '1:X 3:2',
      rupakra: '1:X 4:2 6:3',
      nabatal: '1:X 4:2 6:3 8:4',
      ekadashi: '1:X 4:2 6:3 8:4',
      nabapanchatal: '1:X 3:2 7:3 11:4 15:5',
      khemta: '1:X 4:2 7:0 10:3',
      deepchandi: '1:X 4:2 8:0 11:3',
      dhamar: '1:X 4:0 6:2 8:0 11:3',
      jhumra: '1:X 4:2 8:0 11:3',
      teora: '1:X 4:2 6:3',
      kawali: '1:X 5:0',
      garba: '1:X 4:0',
    });
    for (const id of TAGORE) expect(TAALS[id].marks).not.toContain('0');
  });

  it('are whole: vibhags add up to the cycle, one mark each, names in both scripts', () => {
    for (const id of TAAL_IDS) {
      const t = TAALS[id];
      const T = taalInfo(id);
      expect(t.vib.reduce((a, b) => a + b, 0), id).toBe(t.bols.length);
      expect(t.marks.length, id).toBe(t.vib.length);
      expect(T.cycle, id).toBe(t.bols.length);
      expect(t.name, id).toMatch(/^[A-Z][a-z]+$/);
      expect(t.bn, id).toMatch(/^[ঀ-৿]+$/);
    }
    expect(TAAL_IDS.map((id) => TAALS[id].bols.length)).toEqual([6, 8, 7, 10, 12, 16, 5, 6, 8, 9, 11, 18, 12, 14, 14, 14, 7, 8, 6]);
  });

  it('play every bol with strokes of its own (an unknown bol would sound as Na)', () => {
    const unknown = TAAL_IDS.flatMap((id) => TAALS[id].bols.flat().filter((b) => b !== REST && !bolStrokes(b)).map((b) => id + ' ' + b));
    expect(unknown).toEqual([]);
    expect([bolStrokes('Den'), bolStrokes('Di'), bolStrokes('Tet'), bolStrokes('Ga'), bolStrokes('Ghe'), bolStrokes('Ne')]).toEqual([
      ['tin', 'ge'], ['tin'], ['te'], ['ge'], ['ge'], ['na'],
    ]);
  });

  it('leave rests silent, so Deepchandi and Dhamar breathe and Jhumra’s Dha comes off the beat', () => {
    const bolsAt = (id: TaalId, p: number) => rhythmTable('tabla', id, 1, []).slots[p]!.filter((h) => h.lane === 'bol').map((h) => h.bol + '@' + h.frac);
    expect([2, 6, 9, 13].map((p) => bolsAt('deepchandi', p))).toEqual([[], [], [], []]);
    expect([6, 13].map((p) => bolsAt('dhamar', p))).toEqual([[], []]);
    expect([bolsAt('jhumra', 1), bolsAt('jhumra', 8)]).toEqual([['Dha@0.5'], ['Ta@0.5']]);
    expect(bolsAt('deepchandi', 0)).toEqual(['Dha@0']);
  });

  it('label the taal strip: a dash before a bol that comes after the beat, a dot for silence', () => {
    expect(['jhumra', 'deepchandi', 'shashthi', 'nabapanchatal'].map((id) => [0, 1, 2].map((p) => beatLabel('tabla', id, 1, p)))).toEqual([
      ['Dhin', '–Dha', 'TiRaKiTa'],
      ['Dha', 'Dhin', '·'],
      ['Dha', 'Tet', 'DhaGe'],
      ['Dha', 'Ge', 'Dha'],
    ]);
    expect(beatLabel('tabla', 'deepchandi', 2, 1)).toBe('–Dha'); // the rest, then Dha, in one beat
    expect([beatLabel('kit', 'dhamar', 1, 0), beatLabel('kit', 'dhamar', 1, 3), beatLabel('dholak', 'khemta', 1, 6)]).toEqual(['Kick', 'Snare', 'Ka']);
  });

  it('keep every groove, layer and fill inside the cycle, at every speed and with every layer', () => {
    const bad: string[] = [];
    for (const id of TAAL_IDS) {
      const T = taalInfo(id);
      for (const style of ['kit', 'dholak'] as const) {
        for (const [lane, list] of Object.entries(GROOVES[style][id])) {
          if (list === 'all') continue;
          for (const [x] of list) if (!(x >= 1 && x < T.cycle + 1)) bad.push([id, style, lane, x].join(' '));
        }
      }
      for (const st of STYLES) {
        for (const sp of [0.5, 1, 2]) {
          const R = rhythmTable(st, id, sp, LAYER_IDS.filter((l) => fits(l, st)));
          if (!R.slots.flat().every((h) => h.frac >= 0 && h.frac < 1)) bad.push([id, st, sp, 'slots'].join(' '));
          if (R.fill && !R.fill.flat().every((h) => h.frac >= 0 && h.frac < 1)) bad.push([id, st, sp, 'fill'].join(' '));
        }
      }
      for (const l of LAYER_IDS) {
        const hits = layerHits(l, T);
        if (!hits.length || !hits.every((h) => h.pos >= 0 && h.pos < T.cycle)) bad.push([id, l].join(' '));
      }
      expect(rhythmTable('tabla', id, 1, []).fillFrom, id).toBe(T.starts[T.starts.length - 1]);
      expect(rhythmTable('tabla', id, 1, []).fill![T.cycle - 1]!.map((h) => h.bol), id).toEqual(['Dha', 'Ge']);
    }
    expect(bad).toEqual([]);
  });

  it('are offered in three groups, every taal once, with its matras', () => {
    expect(TAAL_GROUPS.flatMap((g) => g.ids).sort()).toEqual([...TAAL_IDS].sort());
    const html = taalOptionsHTML();
    expect(html.match(/<optgroup label="([^"]+)">/g)).toEqual(['<optgroup label="Common taals">', '<optgroup label="Tagore\'s own taals">', '<optgroup label="More taals">']);
    expect(html.match(/<option /g)).toHaveLength(19);
    expect(html).toContain('<option value="kawali">Kawali · কাওয়ালি (8)</option>');
    expect(html).toContain('<option value="nabapanchatal">Nabapanchatal · নবপঞ্চতাল (18)</option>');
    expect(html).toContain('<option value="jhampak">Jhampak · ঝম্পক (5)</option>');
    expect(startOnOptionsHTML(taalInfo('dhamar'))).toContain('<option value="4">4 · khali (0)</option>');
  });

  it('stay with a song: songs keep them (the prototype read any taal it did not know as Dadra)', () => {
    for (const id of NEW) expect(normalize({ id: 'x', taal: id }).taal).toBe(id);
  });

  it('let the checker accept bars on the vibhag lines, and Dhamar written either way', () => {
    const line = (groups: number[]) => groups.map((n) => Array(n).fill('সা').join(' ')).join(' | ');
    for (const id of NEW) {
      const P = parseSong(line(TAALS[id].vib.concat(TAALS[id].vib)));
      expect(checkNotation(P, taalInfo(id), 0), id).toEqual([]);
    }
    // Swarabitan's Dhamar (3|2|2|3|4) and the classical one (5|2|3|4) both end each bar on a vibhag line.
    expect(checkNotation(parseSong(line([5, 2, 3, 4])), taalInfo('dhamar'), 0)).toEqual([]);
    // Bars off the vibhag lines are still reported.
    expect(checkNotation(parseSong(line([4, 3, 3, 4])), taalInfo('dhamar'), 0).map((i) => i.kind)).toContain('bar');
  });
});

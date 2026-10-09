// The port against the prototype's taal data and rhythm tables, for every style, taal,
// speed and many layer combinations. Numbers must match to the last bit.
import { describe, expect, it } from 'vitest';
import { beatLabel, GROOVES, LAYERS, rhythmTable, SPEEDS, type LayerId } from '../../src/core/taal/rhythm';
import { TAALS, taalInfo } from '../../src/core/taal/taals';
import { canon, seeded } from '../helpers';
import { protoBeatLabel, protoRhythm } from './prototype';

const TAAL_IDS = ['dadra', 'keherwa', 'rupak', 'jhaptal', 'ektal', 'teentaal'];
const STYLES = ['tabla', 'dholak', 'kit', 'click', 'off'];
const LAYER_IDS = Object.keys(LAYERS) as LayerId[];
const fits = (id: LayerId, style: string) => (LAYERS[id].styles as readonly string[]).includes(style);

describe('taal and rhythm match the prototype', () => {
  it('taal, groove, layer and speed data', () => {
    expect(canon(TAALS)).toBe(canon(protoRhythm.TAALS));
    expect(canon(GROOVES)).toBe(canon(protoRhythm.GROOVES));
    expect(canon(LAYERS)).toBe(canon(protoRhythm.LAYERS));
    expect(canon(SPEEDS)).toBe(canon(protoRhythm.SPEEDS));
  });

  it('taalInfo for every taal, and an unknown id', () => {
    for (const id of [...TAAL_IDS, 'nonexistent']) expect(canon(taalInfo(id))).toBe(canon(protoRhythm.taalInfo(id)));
  });

  it('rhythmTable for every style, taal and speed with many layer sets', () => {
    const rand = seeded(11);
    const sets: string[][] = [[], LAYER_IDS, ...LAYER_IDS.map((id) => [id])];
    for (let i = 0; i < 8; i++) sets.push(LAYER_IDS.filter(() => rand() < 0.4));
    const bad: string[] = [];
    let compared = 0;
    for (const st of STYLES) {
      for (const id of [...TAAL_IDS, 'nonexistent']) {
        for (const sp of [0.5, 1, 2]) {
          for (const ls of [...sets, LAYER_IDS.filter((l) => fits(l, st))]) {
            compared++;
            if (canon(rhythmTable(st, id, sp, ls)) !== canon(protoRhythm.rhythmTable(st, id, sp, ls))) bad.push([st, id, sp, ls.join('+')].join(' '));
          }
        }
      }
    }
    expect({ compared, bad }).toEqual({ compared: STYLES.length * 7 * 3 * (sets.length + 1), bad: [] });
  });

  it('beatLabel for every style, taal, speed and beat', () => {
    const bad: string[] = [];
    for (const st of STYLES) {
      for (const id of TAAL_IDS) {
        for (const sp of ['half', 'normal', 'double'] as const) {
          for (let p = 0; p < taalInfo(id).cycle + 2; p++) {
            if (beatLabel(st, id, SPEEDS[sp], p) !== protoBeatLabel(st, id, sp, p)) bad.push([st, id, sp, p].join(' '));
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

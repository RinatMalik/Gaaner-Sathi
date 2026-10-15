// The note pad in Edit notation (src/app/view.ts → padHTML; Rinat, 2026-10-15).
import { describe, expect, it } from 'vitest';
import { PAD_OCTAVES, padHTML } from '../../src/app/view';

const semis = (html: string) => Array.from(html.matchAll(/<div class="pkrow[^"]*">(.*?)<\/div>/g), (m) => Array.from(m[1]!.matchAll(/data-semi="(\d+)"/g), (x) => +x[1]!));
const extras = (html: string) => Array.from(html.matchAll(/data-ins="(\w+)"/g), (m) => m[1]);

describe('the note pad', () => {
  it('lays out Sa Re Ga Ma; Pa Dha Ni; komal Re, Ga, tivra Ma, komal Dha, Ni; then the rest', () => {
    const html = padHTML(0, 'bn', false);
    expect(semis(html)).toEqual([[0, 2, 4, 5], [7, 9, 11], [1, 3, 6, 8, 10], []]);
    expect(html).toContain('<div class="pkrow pkvar">');
    expect(html).toContain('<span class="pkn"><span class="u">সা</span></span>');
    expect(html).toContain('aria-label="komal Re, middle octave"><span class="pkn"><span class="u">ঋা</span></span><span class="pkc">komal</span>');
    expect(html).toContain('aria-label="tivra Ma, middle octave"');
    expect(extras(html)).toEqual(['hold', 'rest', 'nl', 'head']);
    expect(html).toContain('<button type="button" class="pk px" data-ins="head"><span class="pks" aria-hidden="true">#</span><span>Heading</span></button>');
  });

  it('shows the notes in the octave chosen, in either script', () => {
    expect(padHTML(-1, 'bn', false)).toContain('<span class="u lo">সা</span>');
    expect(padHTML(-1, 'bn', false)).toContain('aria-label="Sa, lower octave"');
    expect(padHTML(1, 'bn', false)).toContain('<span class="u">র্সা</span>');
    expect(padHTML(1, 'lat', false)).toContain('<span class="u hi">Sa</span>');
    expect(padHTML(0, 'lat', false)).toContain('<span class="u komal">Re</span>');
    expect(PAD_OCTAVES[-1]).toBe('Lower octave · মন্দ্র');
    expect(PAD_OCTAVES[0]).toBe('Middle octave · মধ্য');
    expect(PAD_OCTAVES[1]).toBe('Upper octave · তার');
  });

  it('adds a bar and a line of lyrics in free text', () => {
    expect(extras(padHTML(0, 'bn', true))).toEqual(['hold', 'rest', 'nl', 'head', 'bar', 'ly']);
  });
});

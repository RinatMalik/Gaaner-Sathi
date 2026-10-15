// The note pad in Edit notation (src/app/view.ts → padHTML; Rinat, 2026-10-15).
import { describe, expect, it } from 'vitest';
import { PAD_HIGHEST, PAD_LOWEST, PAD_OCTAVES, padHTML, padOctaveWord } from '../../src/app/view';
import { shiftOctaves, splitBeats } from '../../src/core/notation/edit';

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

  it('goes two octaves either side, as far as the notation does, with two dots for the second', () => {
    expect([PAD_LOWEST, PAD_HIGHEST]).toEqual([-2, 2]);
    expect(PAD_OCTAVES[-2]).toBe('Lowest octave · অতিমন্দ্র');
    expect(PAD_OCTAVES[2]).toBe('Highest octave · অতিতার');
    expect([-2, -1, 0, 1, 2].map(padOctaveWord)).toEqual(['Lowest', 'Lower', 'Middle', 'Upper', 'Highest']);
    expect(padHTML(-2, 'bn', false)).toContain('aria-label="Sa, lowest octave"><span class="pkn"><span class="u lo lo2">সা</span>');
    expect(padHTML(-2, 'lat', false)).toContain('<span class="u lo lo2">Sa</span>');
    // Bengali two octaves up: two dots over the note, not two রেফs (which fonts draw badly).
    expect(padHTML(2, 'bn', false)).toContain('aria-label="Sa, highest octave"><span class="pkn"><span class="u up2">সা</span>');
    expect(padHTML(1, 'bn', false)).not.toContain('up2');
    expect(padHTML(2, 'lat', false)).toContain('<span class="u tivra hi hi2">Ma</span>');
    // One octave away keeps one dot.
    expect(padHTML(-1, 'lat', false)).not.toContain('lo2');
    expect(padHTML(1, 'lat', false)).not.toContain('hi2');
  });

  it('writes Bengali two octaves up with two marks after the note, wherever it writes octaves', () => {
    const up = (t: string) => shiftOctaves(t, 0, t.length, 1).text;
    const down = (t: string) => shiftOctaves(t, 0, t.length, -1).text;
    expect(up('র্সা র্হ্মা')).toBe("সা'' হ্মা''");
    expect(up('র্সারা')).toBe("সা''র্রা");
    expect(down("সা'' হ্মা''")).toBe('র্সা র্হ্মা');
    // Read in every spelling: two রেফs, a রেফ and a mark, or two marks.
    expect(down('র্র্সা')).toBe('র্সা');
    expect(down("র্সা'")).toBe('র্সা');
    expect(shiftOctaves("সা''", 0, 4, 1).capped).toBe(1);
    // A note's marks after it stay before the next note's (the prototype swapped them: N র্' হ্ম).
    expect(up('Nহ্মা')).toBe("N'র্হ্মা");
    const split = splitBeats("সা''রা", 0, 6);
    expect(split.ok && split.text).toBe("সা'' রা");
  });

  it('adds a bar and a line of lyrics in free text', () => {
    expect(extras(padHTML(0, 'bn', true))).toEqual(['hold', 'rest', 'nl', 'head', 'bar', 'ly']);
  });
});

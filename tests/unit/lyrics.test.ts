import { describe, expect, it } from 'vitest';
import { fillWords, syllables, wordSyllables } from '../../src/core/notation/lyrics';
import { parseSong } from '../../src/core/notation/parse';

describe('words in sung syllables', () => {
  it('split Bengali words as they are sung', () => {
    const cases: [string, string][] = [
      ['আমার', 'আ মার'], ['সোনার', 'সো নার'], ['বাংলা', 'বাং লা'], ['তোমায়', 'তো মায়'], ['ভালোবাসি', 'ভা লো বা সি'],
      ['চিরদিন', 'চি র দিন'], ['আকাশ', 'আ কাশ'], ['মন', 'মন'], ['গান', 'গান'], ['প্রাণ', 'প্রাণ'], ['চাঁদ', 'চাঁদ'],
      // ৎ and হসন্ত join the syllable before; inside a word a conjunct's first consonant does
      // too, and what is left keeps its vowel.
      ['জগৎ', 'জ গৎ'], ['সংসার', 'সং সার'], ['স্বপ্ন', 'স্বপ্ ন'], ['আনন্দ', 'আ নন্ দ'], ['কন্যা', 'কন্ যা'],
      ['বন্ধু', 'বন্ ধু'], ['সূর্য', 'সূর্ য'], ['রবীন্দ্রনাথ', 'র বীন্ দ্র নাথ'], ['প্রাণ', 'প্রাণ'], ['ক্ষণ', 'ক্ষণ'],
      // A final ই উ এ ও after a vowel is one syllable with it.
      ['যাও', 'যাও'], ['এই', 'এই'], ['কেউ', 'কেউ'], ['হই', 'হই'], ['আমি', 'আ মি'],
      // য় written as য + nukta reads the same; an apostrophe stays with its syllable.
      ['তোমায়', 'তো মায়'], ["ক'রে", "ক' রে"],
      // Other scripts are kept whole.
      ['amar', 'amar'], ['A', 'A'],
    ];
    for (const [w, s] of cases) expect([w, wordSyllables(w).join(' ')]).toEqual([w, s]);
  });

  it('read a pasted line: punctuation and bar lines dropped, a lone - kept as a held vowel', () => {
    expect(syllables('আমার সোনার বাংলা, আমি তোমায় ভালোবাসি।').join(' ')).toBe('আ মার সো নার বাং লা আ মি তো মায় ভা লো বা সি');
    expect(syllables('  আ - মার | সো ০ নার  ')).toEqual(['আ', '-', 'মার', 'সো', '-', 'নার']);
    expect(syllables('“মেঘ-বরণ” কন্যা!').join(' ')).toBe('মেঘ ব রণ কন্ যা');
    expect(syllables('')).toEqual([]);
  });
});

describe('words laid under the notes', () => {
  const T = '# স্থায়ী\nসা রা গা | মা -া পা\nধা না সা | x রা -া\n';

  it('one syllable to each beat where a note starts, - over held and silent beats, on into the next line', () => {
    const r = fillWords(T, 0, 0, 0, syllables('আমার সোনার বাংলা আমি'));
    expect(r.text).toBe('# স্থায়ী\nসা রা গা | মা -া পা\n> আ মার সো | নার - বাং\nধা না সা | x রা -া\n> লা আ মি\n');
    expect([r.placed, r.next]).toEqual([8, { n: 1, j: 3 }]);
    const P = parseSong(r.text);
    expect(P.noteLines[0]!.beats.map((b) => b.lyrics?.[0])).toEqual(['আ', 'মার', 'সো', 'নার', '-', 'বাং']);
  });

  it('start in the box chosen (even a held beat), keep the words after them, and take a lone - as a beat', () => {
    const t = 'সা রা গা | মা -া পা\n> ১ ২ ৩ | ৪ ৫ ৬';
    expect(fillWords(t, 0, 0, 4, ['এ', 'ই']).text).toBe('সা রা গা | মা -া পা\n> ১ ২ ৩ | ৪ এ ই');
    expect(fillWords(t, 0, 0, 0, ['আ', '-', 'মার']).text).toBe('সা রা গা | মা -া পা\n> আ - মার | ৪ ৫ ৬');
    // A second verse.
    expect(fillWords(t, 0, 1, 0, ['তু', 'মি']).text).toBe('সা রা গা | মা -া পা\n> ১ ২ ৩ | ৪ ৫ ৬\n> তু মি');
    // Past the last line, the rest is left out.
    const r = fillWords('সা রা', 0, 0, 0, ['এ', 'ক', 'দুই']);
    expect([r.text, r.placed, r.next]).toEqual(['সা রা\n> এ ক', 2, { n: 0, j: 1 }]);
  });
});

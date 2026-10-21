/**
 * The names of the files Progress and Practice save (Rinat, 2026-10-21: "YYYY.MM.DD_HH.mm.SS -
 * Title - Data.json"): when, the title, and what it is, as in
 * "2026.10.20_19.35.49 - Nisha lagilo re - Data.json". A folder then lists them in time order,
 * a session's report, data and recording together; a day's files have its date alone, so they
 * come just before its sessions'. Pure, so it is tested in Node.
 */

/** A title's most characters in a file name: the longest first lines of songs fit, and with the
 * rest of the name (about 40) a file stays well inside Windows' 260 for a whole path, even in a
 * deep folder (Rinat asked for 90 and left it to Claude). */
export const TITLE_MAX = 60;

const p2 = (n: number) => String(n).padStart(2, '0');

/** "2026.10.20_19.35.49", or the date alone. */
export function stamp(at: number, time = true): string {
  const d = new Date(at);
  return d.getFullYear() + '.' + p2(d.getMonth() + 1) + '.' + p2(d.getDate()) + (time ? '_' + p2(d.getHours()) + '.' + p2(d.getMinutes()) + '.' + p2(d.getSeconds()) : '');
}

/** The letters as a reader sees them (a Bengali consonant with its vowel sign is one). */
function letters(s: string): string[] {
  const S = (Intl as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  return S ? Array.from(new S(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment) : Array.from(s);
}

/** A title in a file name: no characters a computer refuses, at most `TITLE_MAX` letters, cut
 * at a space where one is near the end. */
export function fileTitle(title: string): string {
  const t = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim();
  const ls = letters(t);
  if (ls.length <= TITLE_MAX) return t || 'Untitled';
  const cut = ls.slice(0, TITLE_MAX);
  const sp = cut.lastIndexOf(' ');
  return (sp >= TITLE_MAX * 0.6 ? cut.slice(0, sp) : cut).join('').replace(/[\s.-]+$/, '') + '…';
}

const EXT = { Data: '.json', Report: '.html', Recording: '.wav' } as const;

/** "<when> - <title>[ <extra>] - <kind><ext>". */
export const exportName = (when: string, title: string, kind: keyof typeof EXT, extra = ''): string =>
  when + ' - ' + fileTitle(title) + (extra ? ' ' + extra : '') + ' - ' + kind + EXT[kind];

/** A day's title: "Whole day (7 sessions)". */
export const dayTitle = (n: number): string => 'Whole day (' + n + (n === 1 ? ' session)' : ' sessions)');

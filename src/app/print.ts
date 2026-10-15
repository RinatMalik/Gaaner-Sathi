/**
 * Print or save as PDF (docs/ROADMAP.md → Phase 1): a clean swaralipi sheet, black on
 * white, through the browser's own print dialog, whose "Save as PDF" makes the file. The
 * sheet is built into a print-only element just before printing, also when the print comes
 * from the browser's menu or Ctrl+P. Any song can be printed from the Music library (Rinat,
 * 2026-10-15), not only the one open. The HTML builder is pure and tested in Node.
 */
import { parseSong } from '../core/notation/parse';
import { asTaals, taalMap, type Taals } from '../core/notation/taalmap';
import type { ParsedSong } from '../core/notation/types';
import type { Song } from '../core/song/model';
import type { TaalInfo } from '../core/taal/taals';
import { esc, KEYS, OCTS, sheetHTML, taalName, taalSub, type Script } from './view';

/** The whole printed page: title, the song's details, the sheet, and its notes. `taals`: the
 * song's taal map, or its one taal. */
export function printSheetHTML(song: Song, P: ParsedSong, taals: TaalInfo | Taals, script: Script): string {
  const M = asTaals(taals, song.startOn - 1);
  const T = M.runs[0]!.T;
  const key = KEYS[song.saKey];
  const oct = OCTS.find((o) => o[0] === song.saOct)?.[1] ?? '';
  const details = [
    taalName(T) + ', ' + taalSub(T) + (song.startOn > 1 ? ', starting on beat ' + song.startOn : '') +
      (M.changes ? ', changing taal by section: ' + M.runs.map((r) => r.T.name).join(', then ') : ''),
    'Sa ' + (key ? key[0] + ' (' + key[1] + ')' : '?') + ', ' + oct.toLowerCase() + ' octave',
    song.tempo + ' matras a minute',
  ];
  return '<header class="prhead"><h1>' + esc(song.title) + '</h1><p>' + details.map(esc).join(' · ') + '</p>' +
    (song.tags && song.tags.length ? '<p class="prtags">' + song.tags.map(esc).join(' · ') + '</p>' : '') + '</header>' +
    '<div class="sheet prsheet">' + sheetHTML(P, M, 0, song.example, script) + '</div>' +
    (song.notes ? '<section class="prnotes"><h2>About this song</h2><p>' + esc(song.notes) + '</p></section>' : '') +
    '<footer class="prfoot">Gaaner Sathi · গানের সাথী</footer>';
}

export interface PrintHost {
  song(): Song;
  parsed(): ParsedSong;
  /** The song's taal map. */
  taals(): Taals;
  script(): Script;
}

/** Fill the print sheet whenever printing starts; the returned function prints the open song,
 * or the song it is given. */
export function initPrint(host: PrintHost): (song?: Song) => void {
  const box = document.querySelector('#printSheet') as HTMLElement;
  let title = '';
  /** A song printed from the Music library, until the print is over. */
  let other: Song | null = null;
  const fill = () => {
    const song = other ?? host.song();
    if (other) {
      const P = parseSong(other.text);
      box.innerHTML = printSheetHTML(other, P, taalMap(other.text, P, other.taal, other.startOn), host.script());
    } else box.innerHTML = printSheetHTML(song, host.parsed(), host.taals(), host.script());
    // The PDF is named after the page's title.
    if (!title) title = document.title;
    document.title = song.title + ' · Gaaner Sathi';
  };
  window.addEventListener('beforeprint', fill);
  window.addEventListener('afterprint', () => {
    if (title) document.title = title;
    title = '';
    other = null;
  });
  return (song) => {
    other = song && song.id !== host.song().id ? song : null;
    fill();
    window.print();
  };
}

/**
 * Print or save as PDF (docs/ROADMAP.md → Phase 1): a clean swaralipi sheet, black on
 * white, through the browser's own print dialog, whose "Save as PDF" makes the file. The
 * sheet is built into a print-only element just before printing, also when the print comes
 * from the browser's menu or Ctrl+P. The HTML builder is pure and tested in Node.
 */
import type { ParsedSong } from '../core/notation/types';
import type { Song } from '../core/song/model';
import type { TaalInfo } from '../core/taal/taals';
import { esc, KEYS, OCTS, sheetHTML, taalName, taalSub, type Script } from './view';

/** The whole printed page: title, the song's details, the sheet, and its notes. */
export function printSheetHTML(song: Song, P: ParsedSong, T: TaalInfo, script: Script): string {
  const key = KEYS[song.saKey];
  const oct = OCTS.find((o) => o[0] === song.saOct)?.[1] ?? '';
  const details = [
    taalName(T) + ', ' + taalSub(T) + (song.startOn > 1 ? ', starting on beat ' + song.startOn : ''),
    'Sa ' + (key ? key[0] + ' (' + key[1] + ')' : '?') + ', ' + oct.toLowerCase() + ' octave',
    song.tempo + ' matras a minute',
  ];
  return '<header class="prhead"><h1>' + esc(song.title) + '</h1><p>' + details.map(esc).join(' · ') + '</p>' +
    (song.tags && song.tags.length ? '<p class="prtags">' + song.tags.map(esc).join(' · ') + '</p>' : '') + '</header>' +
    '<div class="sheet prsheet">' + sheetHTML(P, T, song.startOn - 1, song.example, script) + '</div>' +
    (song.notes ? '<section class="prnotes"><h2>About this song</h2><p>' + esc(song.notes) + '</p></section>' : '') +
    '<footer class="prfoot">Gaaner Sathi · গানের সাথী</footer>';
}

export interface PrintHost {
  song(): Song;
  parsed(): ParsedSong;
  taal(): TaalInfo;
  script(): Script;
}

/** Fill the print sheet whenever printing starts; the returned function prints. */
export function initPrint(host: PrintHost): () => void {
  const box = document.querySelector('#printSheet') as HTMLElement;
  let title = '';
  const fill = () => {
    const song = host.song();
    box.innerHTML = printSheetHTML(song, host.parsed(), host.taal(), host.script());
    // The PDF is named after the page's title.
    if (!title) title = document.title;
    document.title = song.title + ' · Gaaner Sathi';
  };
  window.addEventListener('beforeprint', fill);
  window.addEventListener('afterprint', () => {
    if (title) document.title = title;
    title = '';
  });
  return () => {
    fill();
    window.print();
  };
}

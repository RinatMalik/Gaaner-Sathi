/**
 * The song library (docs/ROADMAP.md → Song library): search, filters and sorting over the
 * user's songs and the built-in exercises. Pure, so it is tested in Node.
 */
import { TAALS, type TaalId } from '../taal/taals';
import { foldText, type Song } from './model';

/** What the library needs from a song or an exercise. */
export type LibrarySong = Pick<Song, 'id' | 'title' | 'text' | 'tempo' | 'saKey'> & {
  taal: TaalId;
  example?: boolean;
  tags?: readonly string[];
  fav?: boolean;
  updatedAt?: number;
  notes?: string;
};

/** A song with its search text worked out once. */
export interface LibraryEntry {
  song: LibrarySong;
  /** The first lyric row, for display, with bars and held-vowel groups taken out. */
  lyric: string;
  /** Title, lyrics, tags, taal name and the song's notes, folded and spaced as written. */
  hay: string;
  /** The same with spaces, bars and hold marks taken out, so a word written across beats
   * ("সো নার") is found as typed ("সোনার"). */
  tight: string;
}

/** Which songs to show. */
export type LibraryFilter = { kind: 'all' } | { kind: 'fav' } | { kind: 'ex' } | { kind: 'tag'; tag: string };
export type LibrarySort = 'practised' | 'changed' | 'title';

const GROUP_SPLIT = /[\s|।॥‖]+/;
const HELD_GROUP = /^[০0\-–—~]+$/;
const TIGHT_DROP = /[\s|।॥‖০\-–—~]+/g;

/** The lyric rows of a song's text: lines starting with ">", without it. */
export function lyricRows(text: string): string[] {
  const rows: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t[0] === '>') rows.push(t.slice(1).trim());
  }
  return rows;
}

/** A lyric row as words to read: its groups without bars or held-vowel groups. */
export function lyricForDisplay(row: string): string {
  return row
    .split(GROUP_SPLIT)
    .filter((g) => g && !HELD_GROUP.test(g))
    .join(' ');
}

/** Entries already worked out, by song object, with what they were worked out from. */
const made = new WeakMap<LibrarySong, { key: string; entry: LibraryEntry }>();

/** A song's entry. The search text is worked out once per version of a song, so typing in
 * the search box only searches. */
export function entryFor(song: LibrarySong): LibraryEntry {
  const key = song.updatedAt + '\u0000' + song.title + '\u0000' + song.text.length + '\u0000' + song.taal + '\u0000' + (song.tags || []).join('\u0001') + '\u0000' + (song.notes || '');
  const hit = made.get(song);
  if (hit && hit.key === key && hit.entry.song.text === song.text) return hit.entry;
  const rows = lyricRows(song.text);
  const first = rows.map(lyricForDisplay).find((r) => r) ?? '';
  const taal = TAALS[song.taal];
  const parts = [song.title, ...(song.tags || []), taal ? taal.name + ' ' + taal.bn : '', ...rows, song.notes || ''];
  const hay = foldText(parts.join('\n'));
  const entry = { song, lyric: first, hay, tight: hay.replace(TIGHT_DROP, '') };
  made.set(song, { key, entry });
  return entry;
}

/** Every word of the query must appear somewhere: spaced as written, or run together. */
export function matchesQuery(e: LibraryEntry, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  return words.every((w) => e.hay.includes(w) || e.tight.includes(w.replace(TIGHT_DROP, '')));
}

export function matchesFilter(e: LibraryEntry, f: LibraryFilter): boolean {
  switch (f.kind) {
    case 'all':
      return true;
    case 'fav':
      return !!e.song.fav;
    case 'ex':
      return !!e.song.example;
    case 'tag': {
      const t = foldText(f.tag);
      return (e.song.tags || []).some((x) => foldText(x) === t);
    }
  }
}

/**
 * Sorted for the list: the most recently practised first (never practised after, newest
 * change first); or the most recently changed first; or by title. Exercises keep their
 * built-in order after the songs when nothing else tells them apart.
 */
export function sortEntries(list: readonly LibraryEntry[], by: LibrarySort, practisedAt: (id: string) => number = () => 0): LibraryEntry[] {
  const order = new Map(list.map((e, i) => [e.song.id, i]));
  const byTitle = (a: LibraryEntry, b: LibraryEntry) => a.song.title.localeCompare(b.song.title) || order.get(a.song.id)! - order.get(b.song.id)!;
  const byChange = (a: LibraryEntry, b: LibraryEntry) =>
    (b.song.updatedAt || 0) - (a.song.updatedAt || 0) || +!!a.song.example - +!!b.song.example || order.get(a.song.id)! - order.get(b.song.id)!;
  const cmp =
    by === 'title'
      ? byTitle
      : by === 'changed'
        ? byChange
        : (a: LibraryEntry, b: LibraryEntry) => practisedAt(b.song.id) - practisedAt(a.song.id) || byChange(a, b);
  return list.slice().sort(cmp);
}

/** The tags in use, most used first, each with how many songs carry it; spellings that
 * differ only in case count as one (the first one met is shown). */
export function tagCounts(songs: readonly { tags?: readonly string[] }[]): { tag: string; n: number }[] {
  const m = new Map<string, { tag: string; n: number }>();
  for (const s of songs) {
    for (const t of s.tags || []) {
      const k = foldText(t);
      const c = m.get(k);
      if (c) c.n++;
      else m.set(k, { tag: t, n: 1 });
    }
  }
  return Array.from(m.values()).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}

/** "today", "yesterday", "3 days ago", or a date such as "2 Oct" (with the year when it
 * is not this year). Days are the user's local calendar days. */
export function whenText(at: number, now: number): string {
  const d0 = new Date(now);
  const d1 = new Date(at);
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  const days = day(d0) - day(d1);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return d1.getDate() + ' ' + MONTHS[d1.getMonth()] + (d1.getFullYear() === d0.getFullYear() ? '' : ' ' + d1.getFullYear());
}

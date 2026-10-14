// Dismissing the checker's warnings (Rinat, 2026-10-14): a fingerprint per warning that
// holds while its line's notes do, kept with the song, and the panel's buttons.
import { describe, expect, it } from 'vitest';
import { bodyOf, SongStore, type KeyValueStore } from '../../src/app/store';
import { issuesHTML } from '../../src/app/view';
import { checkNotation, issueKey } from '../../src/core/notation/check';
import { parseSong } from '../../src/core/notation/parse';
import { songFileText, songsFromFile } from '../../src/core/song/file';
import { cleanDismissed, DISMISSED_MAX, normalize } from '../../src/core/song/model';
import { taalInfo } from '../../src/core/taal/taals';

const DADRA = taalInfo('dadra');
// Line 1: bar 2 has 2 beats (Dadra's should have 3). Line 2: an octave slip.
const SONG = 'S R G | M P\nN S\' R\' S N D';
const keys = (text: string) => {
  const P = parseSong(text);
  return checkNotation(P, DADRA, 0).map((it) => it.kind + ':' + issueKey(P, it));
};

class Memory implements KeyValueStore {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('a warning’s fingerprint', () => {
  it('is short, and the same however the line is spaced or written, or wherever it moves', () => {
    const k = keys(SONG);
    expect(k.map((x) => x.split(':')[0])).toEqual(['bar', 'octave']);
    for (const x of k) expect(x.split(':')[1]).toMatch(/^[0-9a-z]{1,7}$/);
    // In Bengali, spaced differently, and with a line put before it.
    expect(keys('সা   রা গা | মা পা\nনা র্সা র্রা সা না ধা')).toEqual(k);
    expect(keys('# স্থায়ী\nS R G | M P D\n' + SONG).slice(-2)).toEqual(k);
  });

  it('changes when the line’s notes change, so a dismissed warning comes back', () => {
    const [bar, oct] = keys(SONG);
    expect(keys('S R M | M P\nN S\' R\' S N D')[0]).not.toBe(bar);
    expect(keys('S R G | M P\nN S\' R\' S N P')[1]).not.toBe(oct);
    // Another line changing leaves it alone.
    expect(keys('S R G | M P\nN S\' R\' S N D')[0]).toBe(bar);
  });
});

describe('the checker panel with dismissing', () => {
  const P = parseSong(SONG);
  const [bar, oct] = checkNotation(P, DADRA, 0).map((it) => issueKey(P, it));

  it('offers Dismiss on each warning (not on reading errors), and nothing without the option', () => {
    const r = issuesHTML(P, DADRA, 0, 'lat', { dismissed: new Set(), showDismissed: false });
    expect(r.html).toContain('2 things to check');
    expect(r.html).toContain('data-act="dismiss" data-k="' + bar + '"');
    expect(r.html).toContain('data-act="dismiss" data-k="' + oct + '"');
    expect(r.html).not.toContain('dismissed');
    const plain = issuesHTML(P, DADRA, 0, 'lat');
    expect(plain.html).not.toContain('data-act="dismiss"');
    expect(issuesHTML(parseSong('S R Q'), DADRA, 0, 'lat', { dismissed: new Set(), showDismissed: false }).html).not.toContain('data-act="dismiss"');
  });

  it('counts the dismissed below the rest, lists them on request, each to bring back', () => {
    const one = issuesHTML(P, DADRA, 0, 'lat', { dismissed: new Set([bar!]), showDismissed: false }).html;
    expect(one).toContain('1 thing to check');
    expect(one).not.toContain('data-k="' + bar + '"');
    expect(one).toContain('1 dismissed · <button type="button" class="linkbtn" data-act="showdis" aria-expanded="false">Show them</button>');
    const shown = issuesHTML(P, DADRA, 0, 'lat', { dismissed: new Set([bar!]), showDismissed: true }).html;
    expect(shown).toContain('aria-expanded="true">Hide them</button>');
    expect(shown).toMatch(/<ul class="dislist"><li class="warn dis">[^]*?bar 2 has 2 beats[^]*?data-act="undismiss" data-k="[0-9a-z]+">Bring back<\/button><\/li><\/ul>/);
    // All dismissed: no all-clear claim, just what is left.
    const all = issuesHTML(P, DADRA, 0, 'lat', { dismissed: new Set([bar!, oct!]), showDismissed: false }).html;
    expect(all).toContain('Nothing to check apart from what you dismissed.');
    expect(all).not.toContain('Checked: every bar');
    expect(all).toContain('2 dismissed');
  });
});

describe('dismissed warnings kept with the song', () => {
  it('are cleaned: fingerprints only, each once, the newest 200, never on a built-in exercise', () => {
    expect(cleanDismissed(['abc', 'abc', 'ABC', 'a b', 7, '', 'x'.repeat(9), 'z9'])).toEqual(['abc', 'z9']);
    expect(cleanDismissed('abc')).toEqual([]);
    const many = Array.from({ length: 250 }, (_, i) => i.toString(36));
    expect(cleanDismissed(many)).toEqual(many.slice(-DISMISSED_MAX));
    expect(normalize({ id: 'x', title: 'x', dismissed: ['abc'] }).dismissed).toEqual(['abc']);
    expect(normalize({ id: 'x', title: 'x', dismissed: [] })).not.toHaveProperty('dismissed');
    expect(normalize({ id: 'x', title: 'x', example: true, dismissed: ['abc'] })).not.toHaveProperty('dismissed');
  });

  it('survive storage, a backup and an import', () => {
    const s = normalize({ id: 'song-d', title: 'd', text: SONG, updatedAt: 1, dismissed: ['abc', 'def'] });
    expect(bodyOf(s).dismissed).toEqual(['abc', 'def']);
    const S = new Memory();
    new SongStore(S).save([s]);
    expect(new SongStore(S).load().get('song-d')!.dismissed).toEqual(['abc', 'def']);
    const [back] = songsFromFile(songFileText([s], '2026-10-14'), 'b.json');
    expect(normalize({ ...back!, id: 'n' }).dismissed).toEqual(['abc', 'def']);
  });
});

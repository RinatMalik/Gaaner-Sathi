// Rewaz routines: the model, rounds in the transport, the views' HTML, storage.
import { describe, expect, it } from 'vitest';
import { entryDetail, progressHTML } from '../../src/app/progress';
import { dailyScores, periodSummary, songScores, weakLine } from '../../src/core/practice/log';
import { itemRowHTML, pickedButton, pickerHTML, routineHTML, type ItemSong } from '../../src/app/rewaz';
import { RoutineStore, STORE_KEYS, type KeyValueStore } from '../../src/app/store';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport, type BeatEntry, type EndEntry } from '../../src/audio/transport';
import { EXERCISES } from '../../src/core/exercises';
import { parseSong } from '../../src/core/notation/parse';
import type { LogEntry } from '../../src/core/practice/log';
import { cleanItem, cleanRoutine, itemLines, newRoutineId, routineSeconds, STARTER, type Routine } from '../../src/core/practice/routine';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

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

const shape = (id: string): ItemSong | null => {
  const s = EXERCISES.find((e) => e.id === id);
  if (!s) return null;
  const P = parseSong(s.text);
  return { tempo: s.tempo, lineBeats: P.noteLines.map((l) => l.beats.length), cycle: taalInfo(s.taal).cycle, labels: P.noteLines.map((l) => 'Line ' + (l.n + 1)), title: s.title };
};

describe('routines', () => {
  it('are checked when read: items cleaned, rounds and tempo clamped, junk dropped', () => {
    expect(cleanItem({ song: 'a', rounds: 99, tempo: 5, from: 3, to: 1, guide: 'alt' })).toEqual({ song: 'a', rounds: 20, tempo: 30, from: 3, to: 3, guide: 'alt' });
    expect(cleanItem({ song: 'a', rounds: 'x', guide: 'loud' })).toEqual({ song: 'a', rounds: 1 });
    expect(cleanItem({ rounds: 2 })).toBeNull();
    const r = cleanRoutine('r1', { name: '  ', items: [{ song: 'a', rounds: 2 }, null, { song: '' }], updatedAt: 'x' });
    expect(r).toEqual({ id: 'r1', name: 'My rewaz', items: [{ song: 'a', rounds: 2 }], updatedAt: 0 });
    expect(cleanRoutine('r', [])).toBeNull();
    expect(newRoutineId(1791544356355, () => 0.5)).toMatch(/^routine-[0-9a-z]+-[0-9a-z]{1,5}$/);
  });

  it('start from a warm-up of exercises that all exist', () => {
    for (const it of STARTER.items) expect(EXERCISES.some((e) => e.id === it.song)).toBe(true);
  });

  it('play the whole song, or the lines chosen, clamped to the song', () => {
    expect(itemLines({ song: 'a', rounds: 1 }, 7)).toEqual([0, 6]);
    expect(itemLines({ song: 'a', rounds: 1, from: 2, to: 4 }, 7)).toEqual([2, 4]);
    expect(itemLines({ song: 'a', rounds: 1, from: 9, to: 12 }, 7)).toEqual([6, 6]);
  });

  it('estimate their length from beats, rounds, tempo, count-in and the gaps', () => {
    const r: Routine = { id: 'r', name: 'R', updatedAt: 0, items: [{ song: 'ex-alankar-bn', rounds: 2, tempo: 60 }, { song: 'gone', rounds: 3 }, { song: 'ex-alankar-bn', rounds: 1, from: 0, to: 0 }] };
    // Exercise 3 has 8 lines of 6 beats, in Dadra (6): 96 beats at 1 s, then 6 at 110 a minute.
    const secs = routineSeconds(r, shape, false);
    // The gone item adds nothing, not even a gap.
    expect(secs).toBeCloseTo(96 + 4 + (6 * 60) / 110, 6);
    expect(routineSeconds(r, shape, true) - secs).toBeCloseTo(6 + (6 * 60) / 110, 6);
    // A break of the routine's own between items, or none.
    expect(routineSeconds({ ...r, gap: 30 }, shape, false)).toBeCloseTo(96 + 30 + (6 * 60) / 110, 6);
    expect(routineSeconds({ ...r, gap: 0 }, shape, false)).toBeCloseTo(96 + (6 * 60) / 110, 6);
  });

  it('keep the break between items they were given, 0 to 120 seconds', () => {
    const at = (gap: unknown) => cleanRoutine('r', { name: 'R', items: [], gap });
    expect(at(10)!.gap).toBe(10);
    expect(at(0)!.gap).toBe(0);
    expect(at(500)!.gap).toBe(120);
    expect(at(-3)!.gap).toBe(0);
    expect(at(7.6)!.gap).toBe(8);
    for (const v of [undefined, '10', null, NaN]) expect(at(v)).not.toHaveProperty('gap');
  });
});

describe('rounds in the transport', () => {
  function run(rounds: number | undefined, secs: number): { beats: BeatEntry[]; end: EndEntry | undefined; endAt: number } {
    const ex = EXERCISES[2]!;
    const P = parseSong(ex.text);
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
    const beats: BeatEntry[] = [];
    T.onBeat = (q) => beats.push(q);
    T.start({ parsed: P, taal: taalInfo(ex.taal), song: ex, sound: { ...structuredClone(DEFAULT_SOUND), countIn: false } }, { from: 1, to: 2, loop: true, rounds });
    for (let i = 1; i * 0.025 <= secs && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    return { beats, end: T.queue.find((q): q is EndEntry => 'end' in q), endAt: T.endAt };
  }

  it('stops a loop after its rounds, ending on the section start’s taal beat', () => {
    const r = run(3, 60);
    // Lines 2 and 3: 12 beats a round, three rounds.
    expect(r.beats.filter((b) => b.pass >= 0).map((b) => b.pass)).toEqual([...Array(12).fill(0), ...Array(12).fill(1), ...Array(12).fill(2)]);
    expect(r.end).toBeDefined();
    expect(r.end!.p).toBe(0);
    expect(r.endAt).toBeGreaterThan(0);
  });

  it('loops on without rounds, as before', () => {
    const r = run(undefined, 30);
    expect(r.end).toBeUndefined();
    expect(Math.max(...r.beats.map((b) => b.pass))).toBeGreaterThan(3);
  });
});

describe('the Rewaz view', () => {
  const own = [{ id: 's1', title: 'আমার <গান>' }];
  const ex = EXERCISES.map((e) => ({ id: e.id, title: e.title }));

  it('shows an item’s song, lines, rounds, tempo and guide', () => {
    const html = itemRowHTML({ song: 'ex-alankar-bn', rounds: 3, from: 1, to: 2, tempo: 90, guide: 'alt' }, 0, 2, shape('ex-alankar-bn'), own, ex);
    expect(html).toContain('<option value="ex-alankar-bn" selected>');
    expect(html).toContain('আমার &lt;গান&gt;');
    expect(html).toMatch(/data-k="from"><option value="">The whole song<\/option><option value="0">Line 1<\/option><option value="1" selected>/);
    expect(html).toContain('data-k="to">');
    expect(html).toContain('value="3" data-i="0" data-k="rounds"');
    expect(html).toContain('placeholder="110" value="90"');
    expect(html).toContain('<option value="alt" selected>Every other round</option>');
    expect(html).toContain('data-act="up" aria-label="Move up" title="Move up" disabled');
    expect(html).not.toContain('data-act="down" aria-label="Move down" title="Move down" disabled');
  });

  it('lays an item out like a line in the beat boxes: number, fields, then full-height icon buttons', () => {
    const html = itemRowHTML({ song: 'ex-scale', rounds: 1 }, 1, 3, shape('ex-scale'), own, ex);
    expect(html).toMatch(/^<li class="rwitem"><span class="rwn">2<\/span><div class="rwfields">/);
    expect(html).toMatch(/<\/div><span class="rwside"><button type="button" class="rwbtn" data-i="1" data-act="up"[^>]*><svg[^]*?<\/button><button type="button" class="rwbtn" data-i="1" data-act="down"[^>]*><svg[^]*?<\/button><button type="button" class="rwbtn rwdel" data-i="1" data-act="remove" aria-label="Remove from this routine"[^>]*><svg[^]*?<\/button><\/span><\/li>$/);
    // Icons only: no words on the buttons.
    expect(html).not.toMatch(/<\/svg>[^<]+<\/button>/);
  });

  it('plays the whole song unless lines are chosen, and says when a song is gone', () => {
    const whole = itemRowHTML({ song: 'ex-scale', rounds: 1 }, 1, 2, shape('ex-scale'), own, ex);
    expect(whole).toContain('<option value="" selected>The whole song</option>');
    expect(whole).not.toContain('data-k="to"');
    expect(whole).toContain('placeholder="96" value=""');
    expect(itemRowHTML({ song: 'gone', rounds: 1 }, 0, 1, null, own, ex)).toContain('This song has been deleted');
  });

  it('shows each routine as a row that folds away, with Start the row’s full height at its end', () => {
    const row = { saved: true, open: false, secs: 400, confirming: false, picking: null, openId: '', exFirst: false };
    const r: Routine = { id: 'routine-a', name: 'Morning <rewaz>', items: [{ song: 'ex-scale', rounds: 2 }, { song: 'ex-akar', rounds: 1 }], updatedAt: 1 };
    const folded = routineHTML(r, 3, row, shape, own, ex);
    expect(folded).toContain('<section class="rwr" data-r="routine-a">');
    expect(folded).toContain('<button type="button" class="rwfold" data-act="fold" aria-expanded="false" aria-controls="rwb-3">');
    expect(folded).toContain('<span class="rwname">Morning &lt;rewaz&gt;</span><span class="rwmeta">2 items · about 7 min</span>');
    expect(folded).toMatch(/<\/h3><button type="button" class="rwgo" data-act="start"><svg[^]*?<span>Start rewaz<\/span><\/button><\/div>/);
    expect(folded).toContain('<div class="rwbody" id="rwb-3" hidden>');
    // Unfolded: its name to change, its items, add the open song, delete.
    const open = routineHTML(r, 3, { ...row, open: true }, shape, own, ex);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('<div class="rwbody" id="rwb-3">');
    expect(open).toContain('data-act="name" value="Morning &lt;rewaz&gt;"');
    // The break between items: 4 seconds unless the routine says.
    expect(open).toContain('<span>Break between items, seconds</span><input type="number" min="0" max="120" step="1" inputmode="numeric" data-act="gap" value="4">');
    expect(routineHTML({ ...r, gap: 15 }, 3, { ...row, open: true }, shape, own, ex)).toContain('data-act="gap" value="15"');
    expect(open.match(/class="rwitem"/g)).toHaveLength(2);
    expect(open).toContain('data-act="pick">+ Add songs and exercises</button>');
    expect(open).toContain('data-act="del">Delete routine</button>');
    const asking = routineHTML(r, 3, { ...row, open: true, confirming: true }, shape, own, ex);
    expect(asking).toContain('Delete this routine? <button type="button" class="btn danger" data-act="delyes">Delete</button><button type="button" class="btn" data-act="delno">Keep</button>');
  });

  it('offers the ready-made warm-up unsaved, and a routine with no items cannot start', () => {
    const row = { saved: false, open: true, secs: 0, confirming: false, picking: null, openId: '', exFirst: false };
    const starter = routineHTML(STARTER, 0, row, shape, own, ex);
    expect(starter).toContain('<span class="rwmeta">4 items · about 1 min · ready-made</span>');
    expect(starter).not.toContain('Delete routine');
    const empty = routineHTML({ id: 'e', name: 'Empty', items: [], updatedAt: 1 }, 1, { ...row, saved: true }, shape, own, ex);
    expect(empty).toContain('<span class="rwmeta">No items yet</span>');
    expect(empty).toContain('data-act="start" disabled');
    expect(empty).toContain('<li class="rwempty">No items yet.');
  });

  it('chooses several songs and exercises at once, numbered in the order ticked', () => {
    const html = pickerHTML(own, ex, true, ['ex-scale', 's1'], 's1');
    // Exercises first, as in the Music library; then My songs.
    expect(html.indexOf('<h4>Exercises</h4>')).toBeLessThan(html.indexOf('<h4>My songs</h4>'));
    expect(pickerHTML(own, ex, false, [], '').indexOf('<h4>My songs</h4>')).toBeLessThan(pickerHTML(own, ex, false, [], '').indexOf('<h4>Exercises</h4>'));
    expect(html.match(/data-pick="/g)).toHaveLength(own.length + ex.length);
    expect(html).toContain('<input type="checkbox" data-pick="ex-scale" checked><span class="rwpicktitle">আরোহ-অবরোহ</span><span class="rwpickn">1</span>');
    expect(html).toContain('data-pick="s1" checked><span class="rwpicktitle">আমার &lt;গান&gt;</span><span class="rwpickopen">open now</span><span class="rwpickn">2</span>');
    expect(html).toContain('data-pick="ex-range"><span class="rwpicktitle">মন্দ্র থেকে তার সপ্তক</span><span class="rwpickn" hidden></span>');
    expect(html).toContain('data-act="addpicked">Add 2 to this routine</button>');
    expect(html).toContain('data-act="pickcancel">Cancel</button>');
    expect(html).toContain('data-act="pickq"');
    expect(pickedButton(0)).toBe('<button type="button" class="btn primary" data-act="addpicked" disabled>Add to this routine</button>');
    // No group without anything in it.
    expect(pickerHTML([], ex, true, [], '')).not.toContain('My songs');
  });

  it('shows the picker in place of “+ Add songs and exercises” while choosing', () => {
    const r: Routine = { id: 'routine-a', name: 'A', items: [{ song: 'ex-scale', rounds: 2 }], updatedAt: 1 };
    const row = { saved: true, open: true, secs: 100, confirming: false, picking: ['ex-range'], openId: 'ex-scale', exFirst: true };
    const html = routineHTML(r, 0, row, shape, own, ex);
    expect(html).toContain('<div class="rwpick">');
    expect(html).not.toContain('data-act="pick"');
    expect(html).toContain('Add 1 to this routine');
    expect(routineHTML(r, 0, { ...row, picking: null }, shape, own, ex)).not.toContain('<div class="rwpick">');
  });
});

describe('the Progress view', () => {
  const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  const e = (song: string, when: number, x: Partial<LogEntry> = {}): LogEntry =>
    ({ at: when, secs: 300, song, title: 'Old ' + song, from: 0, to: 1, loop: true, rounds: 3, tempo: 100, top: 100, ...x });

  const song = (id: string) => (id === 'a' ? { title: 'Song <A>', exercise: false } : id === 'x' ? { title: 'Ex', exercise: true } : null);

  it('invites practice when nothing is logged', () => {
    expect(progressHTML([], at(10), { song: () => null })).toContain('Nothing logged yet');
  });

  it('shows four sections that fold and move: the week, pitch over time, each song and the history', () => {
    const log = [e('a', at(8), { score: 72 }), e('b', at(9), { secs: 120, routine: 'Daily <warm-up>' }), e('a', at(10), { score: 90, top: 116 })];
    const html = progressHTML(log, at(10, 20), { song });
    expect(Array.from(html.matchAll(/<section class="lsec" data-sec="(\w+)">/g), (m) => m[1])).toEqual(['week', 'pitch', 'songs', 'history']);
    for (const id of ['week', 'pitch', 'songs', 'history']) expect(html).toContain('data-grip="' + id + '"');
    expect(html).toContain('<span class="pgtl">Days in a row</span><b>3</b>');
    expect(html).toContain('<span class="pgtl">Last 7 days</span><b>12 min</b><span class="pgts">3 sessions</span>');
    expect(html).toContain('<span class="pgtl">Pitch, last 7 days</span><b>81</b>');
    expect(html).toContain('Songs and exercises <span class="n">2</span>');
    expect(html).toContain('History <span class="n">3 days</span>');
    // Below the sections: the data, to download or start afresh.
    expect(html).toContain('<b>Your practice data:</b> 3 sessions since 8 Oct, kept only in this browser.');
    expect(html).toContain('data-act="export"');
    expect(html).toContain('data-act="wipe"');
    expect(html).not.toContain('data-act="wipe-yes"');
    // A song still there opens to practise; one deleted since shows its logged title.
    expect(html).toContain('<button type="button" class="lopen" data-open="a"><span class="ltitle">Song &lt;A&gt;</span>');
    expect(html).toContain('<span class="lopen"><span class="ltitle">Old b</span><span class="lmeta">1 time · 2 min in all · practised yesterday · deleted since</span>');
    expect(html).toContain('<span class="pgscore good" title="Pitch score">90</span>');
    expect(html).toContain('<svg class="pgspark"');
    // A song's scores open its pitch charts.
    expect(html).toContain('<button type="button" class="pgtrend" data-pitch="a"');
    expect(html).not.toContain('best 90');
    expect(html).toContain('<b>Today, Sat 10 Oct</b><span class="pgdaymeta">5 min · 1 session · pitch 90</span>');
    expect(html).toContain('Rewaz: Daily &lt;warm-up&gt;');
    expect(html).toContain('data-report="' + at(10) + '"');
    expect((html.match(/class="pgday( now)?"/g) || []).length).toBe(7);
    // Pitch: two days with a score draw the line, by date.
    expect(html).toContain('Pitch</button></h3>');
    expect(html).toContain('<div class="pgchart"><svg class="chart wide"');
    expect(html).toContain('<option value="" selected>All songs and exercises</option><optgroup label="Songs"><option value="a">Song &lt;A&gt;</option></optgroup>');
  });

  it('shows pitch for one song or all, over a time, and each note of the scale from the highest', () => {
    const notes: [number, number, number, number][] = [[-5, 8, 92, 3], [0, 20, 90, 0], [5, 12, 94, -4], [7, 10, 91, 2], [12, 6, 58, -24], [14, 2, 40, -30]];
    const log = [
      e('a', at(1), { score: 60 }),
      e('a', at(3), { score: 70, notes }),
      e('x', at(5), { score: 95, notes: [[0, 4, 96, 1]] }),
      e('a', at(10), { score: 80, notes }),
    ];
    const all = progressHTML(log, at(10, 20), { song });
    // All of it: both songs' notes; the session before notes were kept said.
    expect(all).toContain('1 session with a pitch score is not counted');
    expect(all).toContain('<b>Best:</b> Ma (94), lower Pa (92) and Sa (91). <b>Needs the most work:</b> upper Sa (58, usually flat).');
    const rows = Array.from(all.matchAll(/<span class="pgnw">([^<]+)<\/span>/g), (m) => m[1]);
    expect(rows).toEqual(['upper Re', 'upper Sa', 'Pa', 'Ma', 'Sa', 'lower Pa']);
    expect(all).toContain('<tr class="pgnoct"><th colspan="3" scope="rowgroup">Upper octave · তার</th></tr>');
    expect(all).toContain('<tr class="pgnrow few"');
    expect(all).toContain('<td class="pgnc far">24 flat</td>');
    expect(all).toContain('<span class="pgnbar"><span class="off" style="width:58%"></span></span><b>58</b>');
    // One exercise: its own day and notes only.
    const one = progressHTML(log, at(10, 20), { song, pitchSong: 'x' });
    expect(one).toContain('<optgroup label="Exercises"><option value="x" selected>Ex</option></optgroup>');
    expect(one).toContain('<option value="30" selected>The last 30 days</option>');
    expect(one).toContain('One day with a pitch score for ‘Ex’ over the last 30 days: 95 on 5 Oct.');
    expect(one).not.toContain('upper Sa');
    expect(one).toContain('Paler notes were sung fewer than 5 times');
    // One song over 90 days: the line from its first day to its last, by date.
    const song90 = progressHTML(log, at(10, 20), { song, pitchSong: 'a', pitchDays: 90 });
    expect(song90).toContain('up from 60 to 80.');
    expect(song90).toContain('aria-label="Pitch score by day: Thu 1 Oct 60, Sat 3 Oct 70, Sat 10 Oct 80"');
    expect(song90).toContain('<b>Needs the most work:</b> upper Sa (58, usually flat).');
    expect(song90).not.toContain('(96)');
    // A time not offered: the last 30 days.
    expect(progressHTML(log, at(10, 20), { song, pitchDays: 7 })).toContain('<option value="30" selected>');
    // A song no longer in the log: all of them.
    expect(progressHTML(log, at(10, 20), { song, pitchSong: 'gone' })).toContain('<option value="" selected>');
  });

  it('asks before starting afresh, saying what goes and what stays', () => {
    const html = progressHTML([e('a', at(10), { score: 80 })], at(10, 20), { song, wipe: true });
    expect(html).toContain('Delete all your practice history?');
    expect(html).toContain('Your one session, on 10 Oct, goes');
    expect(progressHTML([e('a', at(9)), e('a', at(10))], at(10, 20), { song, wipe: true })).toContain('All 2 sessions since 9 Oct go');
    expect(html).toContain('Your songs, exercises, rewaz routines, recordings and settings stay.');
    for (const a of ['export', 'wipe-yes', 'wipe-no']) expect(html).toContain('data-act="' + a + '"');
    expect(html).not.toContain('data-act="wipe"');
  });

  it('keeps the order and the folds asked for', () => {
    const log = [e('a', at(10), { score: 80 })];
    const html = progressHTML(log, at(10, 20), { song, order: ['history', 'songs', 'week', 'pitch'], folded: { songs: true } });
    expect(Array.from(html.matchAll(/data-sec="(\w+)"/g), (m) => m[1])).toEqual(['history', 'songs', 'week', 'pitch']);
    expect(html).toContain('data-fold="songs" aria-expanded="false"');
    expect(html).toContain('<div class="lsecbody" id="pgsec-songs" hidden>');
    expect(html).toContain('One day with a pitch score for your songs and exercises over the last 30 days: 80 on 10 Oct.');
  });

  it('describes one practice', () => {
    expect(entryDetail(e('a', 0, { top: 116, routine: 'R' }))).toBe('lines 1–2 × 3 rounds · 100→116 per min · 5 min');
    expect(entryDetail(e('a', 0, { from: 2, to: 2, loop: false, rounds: 1, secs: 45 }))).toBe('line 3 · 100 per min · 45 s');
  });

  it('sums up a week against the one before, each day’s pitch, a song’s trend and its weakest line', () => {
    const log = [
      e('a', at(1), { secs: 600, score: 60, lines: [[0, 50], [1, 70]] }),
      e('a', at(4), { secs: 300, score: 70, lines: [[0, 60], [1, 80], [2, 75]] }),
      e('b', at(9), { secs: 120 }),
      e('a', at(10), { secs: 300, score: 80, lines: [[0, 70], [1, 90]] }),
      e('a', at(10, 12), { secs: 100, score: 100 }),
    ];
    expect(periodSummary(log, at(10, 20), 7)).toEqual({ secs: 820, sessions: 4, score: Math.round((70 * 300 + 80 * 300 + 100 * 100) / 700) });
    expect(periodSummary(log, at(10, 20), 7, 7)).toEqual({ secs: 600, sessions: 1, score: 60 });
    expect(dailyScores(log, at(10, 20), 30).map((d) => d.score)).toEqual([60, 70, 85]);
    expect(songScores(log, 'a', 3)).toEqual([70, 80, 100]);
    expect(weakLine(log, 'a')).toEqual({ line: 0, score: 60 });
    expect(weakLine(log, 'b')).toBeNull();
  });
});

describe('routines in storage', () => {
  it('save one at a time over what is stored, so another tab’s routines survive', () => {
    const S = new Memory();
    const a = new RoutineStore(S);
    const b = new RoutineStore(S);
    a.save({ id: 'r1', name: 'Morning', items: [{ song: 'x', rounds: 2 }], updatedAt: 1 });
    b.save({ id: 'r2', name: 'Evening', items: [], updatedAt: 2 });
    a.save({ id: 'r1', name: 'Morning 2', items: [], updatedAt: 3, gap: 12 });
    expect(Array.from(b.load().values()).map((r) => r.name).sort()).toEqual(['Evening', 'Morning 2']);
    // The break is kept only when given.
    expect(b.load().get('r1')!.gap).toBe(12);
    expect(b.load().get('r2')).not.toHaveProperty('gap');
    a.remove('r2');
    expect(Array.from(a.load().keys())).toEqual(['r1']);
    S.setItem(STORE_KEYS.routines, '{"bad": 5, "__proto__": {"name": "x"}}');
    expect(Array.from(a.load().keys())).toEqual(['__proto__']);
    expect(RoutineStore.isRoutineKey(STORE_KEYS.routines) && !RoutineStore.isRoutineKey(STORE_KEYS.songs)).toBe(true);
  });
});

// Rewaz routines: the model, rounds in the transport, the views' HTML, storage.
import { describe, expect, it } from 'vitest';
import { entryDetail, progressHTML } from '../../src/app/progress';
import { itemRowHTML, routineHTML, type ItemSong } from '../../src/app/rewaz';
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
    const row = { saved: true, open: false, secs: 400, confirming: false, openTitle: 'আমার <গান>' };
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
    expect(open.match(/class="rwitem"/g)).toHaveLength(2);
    expect(open).toContain('+ Add the open song: <b>আমার &lt;গান&gt;</b>');
    expect(open).toContain('data-act="del">Delete routine</button>');
    const asking = routineHTML(r, 3, { ...row, open: true, confirming: true }, shape, own, ex);
    expect(asking).toContain('Delete this routine? <button type="button" class="btn danger" data-act="delyes">Delete</button><button type="button" class="btn" data-act="delno">Keep</button>');
  });

  it('offers the ready-made warm-up unsaved, and a routine with no items cannot start', () => {
    const row = { saved: false, open: true, secs: 0, confirming: false, openTitle: 'x' };
    const starter = routineHTML(STARTER, 0, row, shape, own, ex);
    expect(starter).toContain('<span class="rwmeta">4 items · about 1 min · ready-made</span>');
    expect(starter).not.toContain('Delete routine');
    const empty = routineHTML({ id: 'e', name: 'Empty', items: [], updatedAt: 1 }, 1, { ...row, saved: true }, shape, own, ex);
    expect(empty).toContain('<span class="rwmeta">No items yet</span>');
    expect(empty).toContain('data-act="start" disabled');
    expect(empty).toContain('<li class="rwempty">No items yet.');
  });
});

describe('the Progress view', () => {
  const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  const e = (song: string, when: number, x: Partial<LogEntry> = {}): LogEntry =>
    ({ at: when, secs: 300, song, title: 'Old ' + song, from: 0, to: 1, loop: true, rounds: 3, tempo: 100, top: 100, ...x });

  it('invites practice when nothing is logged', () => {
    expect(progressHTML([], at(10), () => null)).toContain('Nothing logged yet');
  });

  it('shows the run of days, the week, each song and the history', () => {
    const log = [e('a', at(8), { score: 72 }), e('b', at(9), { secs: 120, routine: 'Daily <warm-up>' }), e('a', at(10), { score: 90, top: 116 })];
    const html = progressHTML(log, at(10, 20), (id) => (id === 'a' ? 'Song <A>' : null));
    expect(html).toContain('<b>3</b><span>days in a row</span>');
    expect(html).toContain('<b>12 min</b><span>in the last 7 days</span>');
    expect(html).toContain('Song &lt;A&gt;');
    expect(html).toContain('Old b');
    expect(html).toContain('<span class="pgscore good">90</span>');
    expect(html).not.toContain('best 90');
    expect(html).toContain('Today, Sat 10 Oct');
    expect(html).toContain('Daily &lt;warm-up&gt;');
    expect((html.match(/class="pgday"/g) || []).length).toBe(7);
  });

  it('describes one practice', () => {
    expect(entryDetail(e('a', 0, { top: 116, routine: 'R' }))).toBe('lines 1–2 × 3 rounds · 100→116 per min · 5 min · R');
    expect(entryDetail(e('a', 0, { from: 2, to: 2, loop: false, rounds: 1, secs: 45 }))).toBe('line 3 · 100 per min · 45 s');
  });
});

describe('routines in storage', () => {
  it('save one at a time over what is stored, so another tab’s routines survive', () => {
    const S = new Memory();
    const a = new RoutineStore(S);
    const b = new RoutineStore(S);
    a.save({ id: 'r1', name: 'Morning', items: [{ song: 'x', rounds: 2 }], updatedAt: 1 });
    b.save({ id: 'r2', name: 'Evening', items: [], updatedAt: 2 });
    a.save({ id: 'r1', name: 'Morning 2', items: [], updatedAt: 3 });
    expect(Array.from(b.load().values()).map((r) => r.name).sort()).toEqual(['Evening', 'Morning 2']);
    a.remove('r2');
    expect(Array.from(a.load().keys())).toEqual(['r1']);
    S.setItem(STORE_KEYS.routines, '{"bad": 5, "__proto__": {"name": "x"}}');
    expect(Array.from(a.load().keys())).toEqual(['__proto__']);
    expect(RoutineStore.isRoutineKey(STORE_KEYS.routines) && !RoutineStore.isRoutineKey(STORE_KEYS.songs)).toBe(true);
  });
});

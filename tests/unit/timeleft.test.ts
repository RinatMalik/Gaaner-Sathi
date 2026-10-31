// Round forty-five (Rinat, 2026-10-31): the time left beside the title while a song plays and in
// the rewaz bar, worked out from the transport's own beats, rounds, breaks and tempos; the open
// song's practice under its takes; the Music library's tab before Practice.
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND, type SoundSettings } from '../../src/audio/sound';
import { Transport, type DisplayEntry } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import type { LogEntry } from '../../src/core/practice/log';
import { routineSeconds, type Routine } from '../../src/core/practice/routine';
import { taalInfo } from '../../src/core/taal/taals';
import { songProgressHTML, SONG_RECENT } from '../../src/app/progress';
import { rewazLeft } from '../../src/app/rewaz';
import { TABS } from '../../src/app/store';
import { leftText } from '../../src/app/view';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const SONG = 'S R G M | P D N S\n';
const TWO = 'S R G M | P D N S\nS N D P | M G R S\n';

/** Play a song (Keherwa, 120 a minute: half a second a beat) as asked, to its end or for
 * `secs` seconds; the transport and every display entry. */
function run(text: string, opts: { from: number; to: number; loop: boolean; rounds?: number; gap?: number; upTo?: boolean }, sound: Partial<SoundSettings> = {}, tempoAt?: (s: number) => number, secs = 120) {
  const rec = new RecordingContext();
  const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(3)), () => {});
  const shown: DisplayEntry[] = [];
  T.start({ parsed: parseSong(text), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound: { ...structuredClone(DEFAULT_SOUND), countIn: true, ...sound }, tempoAt }, opts);
  for (let i = 1; i * 0.025 <= secs && !T.endAt; i++) {
    rec.currentTime = i * 0.025;
    T.tick();
    shown.push(...T.queue.splice(0));
  }
  return { T, shown };
}

/** For each beat and break shown, when it starts plus the time it says is left: the end, if right. */
function ends(T: Transport, shown: DisplayEntry[]): { end: number; at: number[] } {
  let brk = 0;
  const at: number[] = [];
  let end = NaN;
  for (const q of shown) {
    if ('end' in q) end = q.time;
    else if ('brk' in q) {
      brk = q.pass;
      at.push(q.until + T.secondsLeft(T.secStart, q.pass, true));
    } else at.push(q.time + T.secondsLeft(q.s, q.pass >= 0 ? q.pass : brk));
  }
  return { end, at };
}

describe('the time left', () => {
  it('counts the rounds still to come, their breaks and count-ins', () => {
    const { T, shown } = run(SONG, { from: 0, to: 0, loop: true, rounds: 3, gap: 2 });
    const { end, at } = ends(T, shown);
    // The count-in, 3 rounds of 4 s and 2 breaks of 2 s each with the count-in again: 28 s.
    expect(end).toBeCloseTo(28.12, 6);
    expect(at.length).toBeGreaterThan(40);
    for (const t of at) expect(t).toBeCloseTo(end, 6);
    // From the first beat of the count-in: all of it.
    expect(T.secondsLeft(-8, 0)).toBeCloseTo(28, 6);
  });

  it('follows the tempo trainer and a section’s own tempo', () => {
    const ramp = run(SONG, { from: 0, to: 0, loop: true, rounds: 4 }, { ramp: true, rampStep: 20, rampMax: 200 });
    const r = ends(ramp.T, ramp.shown);
    for (const t of r.at) expect(t).toBeCloseTo(r.end, 6);
    // Line 2 at half the speed.
    const slow = run(TWO, { from: 0, to: 1, loop: false }, {}, (s) => (s < 8 ? 120 : 60));
    const s = ends(slow.T, slow.shown);
    expect(s.end).toBeCloseTo(0.12 + 4 + 4 + 8, 6);
    for (const t of s.at) expect(t).toBeCloseTo(s.end, 6);
  });

  it('goes to the end of the song, or of the lines to practise, when not looping', () => {
    const whole = run(TWO, { from: 0, to: 0, loop: false });
    expect(whole.T.secondsLeft(0, 0)).toBeCloseTo(8, 6);
    const upTo = run(TWO, { from: 0, to: 0, loop: false, upTo: true });
    expect(upTo.T.secondsLeft(0, 0)).toBeCloseTo(4, 6);
    for (const x of [whole, upTo]) {
      const e = ends(x.T, x.shown);
      for (const t of e.at) expect(t).toBeCloseTo(e.end, 6);
    }
  });

  it('is this round’s in a loop with no end', () => {
    const { T } = run(SONG, { from: 0, to: 0, loop: true }, {}, undefined, 3);
    expect(T.secondsLeft(-8, 0)).toBeCloseTo(8, 6);
    expect(T.secondsLeft(0, 5)).toBeCloseTo(4, 6);
    expect(T.secondsLeft(6, 5)).toBeCloseTo(1, 6);
  });

  it('is said to the second, reaching 0:00 at the end', () => {
    expect(leftText(125)).toBe('2:05 left');
    expect(leftText(124.2)).toBe('2:05 left');
    expect(leftText(0.2)).toBe('0:01 left');
    expect(leftText(0)).toBe('0:00 left');
    expect(leftText(-3)).toBe('0:00 left');
  });

  it('in a rewaz, adds the items after this one and the breaks between them', () => {
    const shape = () => ({ tempo: 120, lineBeats: [8], cycle: 8 });
    // a: a count-in and 3 rounds, 16 s; the break between items, 4 s; b: a count-in and 1 round, 8 s.
    const r: Routine = { id: 'r', name: 'R', updatedAt: 0, items: [{ song: 'a', rounds: 3 }, { song: 'b', rounds: 1 }] };
    expect(routineSeconds(r, shape, true, 1)).toBe(8);
    expect(rewazLeft(r, 0, null, shape, true)).toBe(28);
    expect(rewazLeft(r, 0, 10, shape, true)).toBe(22);
    expect(rewazLeft(r, 1, null, shape, true)).toBe(8);
    expect(rewazLeft(r, 1, 3, shape, true)).toBe(3);
    expect(rewazLeft({ ...r, gap: 0 }, 0, 10, shape, true)).toBe(18);
  });
});

describe('the open song’s practice, under its takes', () => {
  const DAY = 86_400_000;
  const now = new Date(2026, 9, 31, 18, 0).getTime();
  const entry = (daysAgo: number, score?: number, o: Partial<LogEntry> = {}): LogEntry => ({
    at: now - daysAgo * DAY - 3_600_000, secs: 120, song: 's', title: 'Gaan', from: 0, to: 1, loop: true, rounds: 2, tempo: 80, top: 80,
    ...(score == null ? {} : { score, lines: [[0, score], [1, score - 10]] }), ...o,
  });
  const o = { song: 's', title: 'Gaan', exercise: false, script: 'bn' as const };

  it('asks for some practice first', () => {
    expect(songProgressHTML([], now, o)).toContain('Practise this song for 10 seconds or more');
    expect(songProgressHTML([], now, { ...o, exercise: true })).toContain('Practise this exercise');
  });

  it('shows its tiles, where it stands, its scores and its latest sessions', () => {
    const log = [entry(9, 60), entry(6, 64), entry(5), entry(3, 70), entry(2, 78), entry(1, 84, { routine: 'Daily' }), entry(0, 80)];
    const html = songProgressHTML(log, now, o);
    expect(html).toContain('<span class="pgtl">Sessions</span><b>7</b><span class="pgts">on 7 days</span>');
    expect(html).toContain('<b>14 min</b><span class="pgts">about 2 min a session</span>');
    expect(html).toContain('<span class="pgtl">Latest score</span><b>80</b><span class="pgts">best 84</span>');
    expect(html).toContain('<span class="pgtl">Last practised</span><b>Today</b>');
    expect(html).toContain('Getting better: from about 65 to about 81.');
    expect(html).toContain('Line 2 needs the most work');
    // A line of its scores, and the latest five sessions, newest first, each with Report and For AI.
    expect(html.match(/class="chart /g)).toHaveLength(2);
    const rows = html.match(/<li class="pgsrow">/g) ?? [];
    expect(rows).toHaveLength(SONG_RECENT);
    expect(html).toContain('The latest 5 sessions');
    expect(html.indexOf('data-report="' + log[6]!.at + '"')).toBeLessThan(html.indexOf('data-report="' + log[5]!.at + '"'));
    expect(html).not.toContain('data-report="' + log[1]!.at + '"');
    expect(html).toContain('Rewaz: Daily');
    expect(html).toContain('data-sreport="s"');
    expect(html).toContain('data-sai="s"');
    expect(html).toContain('data-progress="1"');
  });

  it('has no line without two scores, and says so without the pitch check', () => {
    const html = songProgressHTML([entry(1)], now, o);
    expect(html).not.toContain('class="chart ');
    expect(html).toContain('<b>–</b><span class="pgts">no pitch check yet</span>');
    expect(html).toContain('The session');
    expect(html).toContain('Sing it with Check my pitch on');
  });
});

describe('the tabs', () => {
  it('put the Music library first, then Practice (Rinat, 2026-10-31)', () => {
    const order = Array.from(page.matchAll(/role="tab" id="(\w+)"/g), (m) => m[1]);
    expect(order).toEqual(['tabSongs', 'tabPractice', 'tabEdit', 'tabRewaz', 'tabVoice', 'tabProgress']);
    expect(TABS.slice(0, 2)).toEqual(['songs', 'practice']);
  });
});

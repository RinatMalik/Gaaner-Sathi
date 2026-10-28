// A session's detail, what it shows, its report and its file for AI (src/core/practice/session.ts,
// insights.ts; src/app/report.ts, aifile.ts), and how long a song plays.
import { describe, expect, it } from 'vitest';
import { aiFile, aiFileName, aiFileText, AI_BRIEF, DAY_BRIEF, dayFileName, dayFileParts, practiceFileParts, PRACTICE_BRIEF, type SessionFileInput } from '../../src/app/aifile';
import { progressHTML } from '../../src/app/progress';
import { noteKeysHTML, noteKeysLegend } from '../../src/app/notekeys';
import { reportHTML } from '../../src/app/report';
import { dayFindings, dayReportHTML, dayReportName, daySummary } from '../../src/app/dayreport';
import { dayTitle, exportName, fileTitle, stamp, TITLE_MAX } from '../../src/app/filenames';
import { songFileName, songFindings, songReportHTML, songSummary, type SongReportInput } from '../../src/app/songreport';
import { songRowHTML } from '../../src/app/songs';
import { parseSong } from '../../src/core/notation/parse';
import { playSeconds, sectionTempoAt, songSections } from '../../src/core/notation/sections';
import { analyse, noteWords } from '../../src/core/practice/insights';
import { dayNumber, lengthText, meanScore, noteTally, type LogEntry } from '../../src/core/practice/log';
import { cleanSession, type NoteRow, type SessionDetail } from '../../src/core/practice/session';
import { PitchTracker, type ExpectedNote } from '../../src/core/pitch/track';
import { entryFor, type LibrarySong } from '../../src/core/song/library';

const SA = 261.63;
// Two lines at 60 matras a minute (a second a beat): steps, then leaps.
const TEXT = 'সা রা গা মা | গা রা গা সা\n> আ মার সো নার | বাং লা আ মি\nসা পা সা পা | র্সা সা র্সা সা';
const T0 = new Date(2026, 9, 20, 18, 5).getTime();

/** A singer singing the text: `late` seconds behind the notes, `cents` off each, with the device's
 * delay `lag`; scored by the real tracker, kept as the app keeps it. */
function sing(o: { late?: number; cents?: (n: ExpectedNote) => number; lag?: number; pitch?: boolean } = {}): SessionDetail {
  const late = o.late ?? 0;
  const lag = o.lag ?? 0.05;
  const P = parseSong(TEXT);
  const notes: ExpectedNote[] = P.events.map((e, i) => ({ t0: e.start, t1: e.start + e.dur, semi: e.semi, oct: e.oct, g: e.g, line: P.lineOfBeat[e.g] ?? 0, pass: 0, key: i + ':0', judged: true }));
  const tr = new PitchTracker({ lag, anyOctave: true, saHz: SA });
  tr.addNotes(notes);
  const readings: number[] = [];
  const end = notes[notes.length - 1]!.t1;
  for (let u = 0.01; u < end + 0.3; u += 0.0213) {
    const n = notes.find((x) => u - late >= x.t0 && u - late < x.t1);
    // A little natural wobble.
    const hz = n ? SA * 2 ** ((100 * n.semi + 1200 * n.oct + (o.cents?.(n) ?? 0) + 3 * Math.sin(u * 30)) / 1200) : 0;
    tr.addReading({ t: u + lag, hz });
    readings.push(Math.round((u + lag) * 1000) / 1000, Math.round(hz * 10) / 10);
  }
  tr.settle(true);
  const r3 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);
  const d: SessionDetail = {
    at: T0, song: 's1',
    played: { title: 'আমার সোনার বাংলা', taal: 'keherwa', tempo: 60, text: TEXT, saHz: SA, sa: 'C (White 1), middle octave' },
    settings: { guide: 'full', guideLoop: 'all', countIn: true, ramp: false, rampStep: 4, rampMax: 160 },
  };
  if (o.pitch !== false) {
    d.pitch = {
      lag, measured: true, anyOctave: true, octave: tr.octave,
      notes: tr.results.map((x): NoteRow => ({ t0: x.note.t0, t1: x.note.t1, semi: x.note.semi, oct: x.note.oct, g: x.note.g, line: x.note.line, pass: x.note.pass, status: x.status, score: Number.isFinite(x.score) ? x.score : null, cents: Number.isFinite(x.cents) ? x.cents : null, arrive: r3(x.arrive), wobble: Number.isFinite(x.wobble) ? x.wobble : null })),
      lines: tr.lines.map((l) => [l.line, l.pass, Number.isFinite(l.score) ? l.score : null, l.sung] as [number, number, number | null, number]),
      readings,
      beats: Array.from({ length: P.total }, (_, i) => [i, i, 0, 1] as [number, number, number, number]),
    };
  }
  return d;
}
const entry = (extra: Partial<LogEntry> = {}): LogEntry => ({ at: T0, secs: 17, song: 's1', title: 'আমার সোনার বাংলা', from: 0, to: 1, loop: false, rounds: 1, tempo: 60, top: 60, ...extra });
const input = (d: SessionDetail | null, log: LogEntry[] = [entry()]): SessionFileInput => {
  const e = log[log.length - 1]!;
  return { e, detail: d, ins: analyse(e, d, log), songNow: null, earlier: log.slice(0, -1), made: T0 + 60_000 };
};

describe('how long a song plays', () => {
  it('adds each beat at its own tempo, its section’s or the song’s, from a line to the end or to a line', () => {
    const text = '# স্থায়ী\nসা রা গা | মা পা ধা\n# অন্তরা · tempo 60\nপা ধা না | র্সা না ধা';
    const P = parseSong(text);
    const at = sectionTempoAt(P, songSections(text, P), 120);
    expect(playSeconds(P, at)).toBeCloseTo(6 * 0.5 + 6 * 1, 9);
    expect(playSeconds(P, at, 1)).toBeCloseTo(6, 9);
    expect(playSeconds(P, at, 0, 0)).toBeCloseTo(3, 9);
    expect(playSeconds(parseSong(''), at)).toBe(0);
  });

  it('is said to the second', () => {
    expect([lengthText(45), lengthText(200), lengthText(180), lengthText(3725)]).toEqual(['45 s', '3 min 20 s', '3 min', '1 h 2 min']);
  });

  it('shows in the Music library', () => {
    const s: LibrarySong = { id: 'x', title: 'Song', text: 'সা', taal: 'dadra', tempo: 90, saKey: 0, saOct: 4, startOn: 1, example: false, changed: 0 } as unknown as LibrarySong;
    const html = songRowHTML(entryFor(s), { query: '', filter: { kind: 'all', tag: '' }, sort: 'title', currentId: '', practisedAt: () => 0, now: T0, lengthOf: () => 200 } as never);
    expect(html).toContain('90 per min · 3 min 20 s · Sa C4 · ');
  });
});

describe('a session’s detail', () => {
  it('is checked when read: readings come back from a typed array, damaged notes are dropped', () => {
    expect(cleanSession(null)).toBeNull();
    expect(cleanSession({ song: 'a' })).toBeNull();
    const d = cleanSession({ at: 5, song: 'a', played: { title: 'T', tempo: 'x' }, pitch: { lag: 0.1, readings: Float32Array.from([1, 220, 2]), notes: [{ t0: 0, t1: 1, semi: 0, oct: 0, line: 0, pass: 0, status: 'sung', score: 90, cents: 3, arrive: 0.1, wobble: 4 }, { t0: 'x' }], lines: [[0, 0, 90, 1], ['x']], beats: [[0, 0, 0, 1], [1]] } })!;
    expect(d.played.tempo).toBe(100);
    expect(d.pitch!.readings).toEqual([1, 220]);
    expect(d.pitch!.notes).toHaveLength(1);
    expect(d.pitch!.lines).toEqual([[0, 0, 90, 1]]);
    expect(d.pitch!.beats).toEqual([[0, 0, 0, 1]]);
    expect(cleanSession({ at: 5, song: 'a' })!.pitch).toBeUndefined();
  });
});

describe('what a session shows', () => {
  it('says when the notes were held well but came in late', () => {
    const ins = analyse(entry(), sing({ late: 0.2 }), [entry()]);
    expect(ins.timing!.behind).toBeGreaterThan(0.17);
    expect(ins.timing!.behind).toBeLessThan(0.23);
    expect(ins.pitch!.medianAbs).toBeLessThan(6);
    expect(ins.headline).toBe('You kept to the notes well, but came in late.');
    expect(ins.good.join(' ')).toContain('You keep to the notes well');
    expect(ins.work.join(' ')).toMatch(/You come in late: about (190|200|210) ms behind the music/);
    // Late, not slow to settle: no second complaint.
    expect(ins.work.join(' ')).not.toContain('settle');
  });

  it('says when singing is in tune and in time, and that jumps are reached as quickly as steps', () => {
    const ins = analyse(entry(), sing(), [entry()]);
    expect(ins.headline).toBe('You kept to the notes well and kept time with the music.');
    expect(ins.good).toContain('You keep time with the music.');
    expect(ins.timing!.leap).not.toBeNull();
    expect(ins.timing!.step).not.toBeNull();
    expect(ins.good).toContain('You reach big jumps as quickly as nearby notes.');
    expect(ins.work).toEqual([]);
  });

  it('finds a note of the scale sung flat, and a tendency', () => {
    const ins = analyse(entry(), sing({ cents: (n) => (n.semi === 4 ? -30 : 0) }), [entry()]);
    const ga = ins.swaras.find((s) => s.semi === 4)!;
    expect(ga.cents).toBeGreaterThanOrEqual(-32);
    expect(ga.cents).toBeLessThanOrEqual(-28);
    expect(ins.work.join(' ')).toMatch(/Ga is usually flat: −(2[89]|3[012]) cents \(3 times\)/);
    expect(noteWords(4, 0)).toBe('Ga');
    expect(noteWords(0, 1)).toBe('upper Sa');
  });

  it('compares with the song’s earlier sessions', () => {
    const before = entry({ at: T0 - 86_400_000, score: 50 });
    const ins = analyse(entry({ score: 90 }), sing(), [before, entry({ score: 90 })]);
    expect(ins.history).toEqual([{ at: before.at, score: 50 }]);
    expect(ins.good).toContain('Your best score for this song so far.');
  });

  it('knows a session from before details were kept, and one without the pitch check', () => {
    const old = analyse(entry({ score: 70, lines: [[0, 60], [1, 80]] }), null, []);
    expect(old.notes[0]).toContain('before the app kept');
    expect(old.lines.map((l) => [l.line, l.score])).toEqual([[0, 60], [1, 80]]);
    expect(old.good).toContain('Your best line: line 2 (80).');
    expect(old.work).toContain('Line 1 needs the most practice (60).');
    expect(analyse(entry(), sing({ pitch: false }), []).notes[0]).toContain('Check my pitch was off');
  });

  it('leaves a round hardly sung out of the rounds compared (Rinat, 2026-10-21: the loop went on after the singing)', () => {
    const d = sing();
    const one = d.pitch!.notes;
    const round = (k: number, f: (i: number) => Partial<NoteRow> = () => ({})) => one.map((r, i) => ({ ...r, t0: r.t0 + 16 * k, t1: r.t1 + 16 * k, pass: k, ...f(i) }));
    d.pitch!.notes = [...one, ...round(1), ...round(2, (i) => (i ? { status: 'unsung', score: null, cents: null, arrive: null, wobble: null } : { score: 30, cents: -45 }))];
    const ins = analyse(entry({ loop: true, rounds: 3 }), d, [entry()]);
    expect(ins.rounds.map((r) => r.round)).toEqual([0, 1]);
    expect(ins.work.join(' ')).not.toContain('fell in later rounds');
    expect(ins.notes.join(' ')).toContain('Round 3 was hardly sung (6% of its notes)');
  });

  it('says when the pitch check heard no singing, not that it was off', () => {
    const d = sing();
    d.pitch!.notes = d.pitch!.notes.map((r) => ({ ...r, status: 'unsung', score: null, cents: null, arrive: null, wobble: null }));
    const ins = analyse(entry(), d, [entry()]);
    expect(ins.headline).toBe('No singing was heard this time.');
    expect(ins.notes[0]).toContain('check the microphone');
    expect(analyse(entry(), sing({ pitch: false }), []).headline).toBe('No pitch check this time.');
  });

  it('says a voice an octave below counted with the guide’s bass reed, and keeps that in the detail and the file (Rinat, 2026-10-28)', () => {
    const d = sing();
    d.pitch = { ...d.pitch!, anyOctave: false, below: true, octave: -1, readings: d.pitch!.readings.map((v, i) => (i % 2 ? v / 2 : v)) };
    const ins = analyse(entry(), d, [entry()]);
    expect(ins.notes.join(' ')).toContain('You sang an octave below the notes, with the guide’s bass reed, which counts as right.');
    // The timing is still found from the readings an octave down.
    expect(ins.behind).not.toBeNull();
    expect(cleanSession(JSON.parse(JSON.stringify(d)))!.pitch).toMatchObject({ anyOctave: false, below: true, octave: -1 });
    expect(cleanSession({ ...d, pitch: { ...d.pitch, below: undefined } })!.pitch!.below).toBeUndefined();
    expect((aiFile(input(d)) as Record<string, any>).equipment).toEqual({ device_delay_s: 0.05, delay_measured: true, any_octave_counts: false, octave_below_counts: true, octave_sung_against_the_notes: -1 });
  });
});

describe('the file for AI', () => {
  it('starts with the brief, keeps every note and reading (when sung), and reads back as the same JSON', () => {
    const o = input(sing({ late: 0.2, lag: 0.08 }));
    const f = aiFile(o) as Record<string, any>;
    expect(Object.keys(f)[0]).toBe('about_this_file');
    expect(f.about_this_file).toBe(AI_BRIEF);
    expect(JSON.parse(aiFileText(o))).toEqual(JSON.parse(JSON.stringify(f)));
    expect(f.notes.rows.length).toBe(o.detail!.pitch!.notes.length);
    expect(f.notes.rows.every((r: unknown[]) => r.length === f.notes.columns.length)).toBe(true);
    expect(f.notes.rows[0].slice(0, 7)).toEqual([1, 1, 1, 'Sa', 'সা', 0, 0]);
    // Readings when sung: the device's delay taken off, so the voice starts 0.2 s in.
    const first = f.pitch_readings.rows.find((r: (number | null)[]) => r[1] != null);
    expect(first[0]).toBeGreaterThanOrEqual(0.19);
    expect(first[0]).toBeLessThanOrEqual(0.23);
    expect(f.song.lines[0]).toEqual({ line: 1, notes: 'সা রা গা মা গা রা গা সা', words: 'আ মার সো নার বাং লা আ মি' });
    expect(f.findings_by_the_app.headline).toBe('You kept to the notes well, but came in late.');
    expect(f.equipment).toEqual({ device_delay_s: 0.08, delay_measured: true, any_octave_counts: true, octave_sung_against_the_notes: 0 });
    expect(aiFileName(o.e)).toBe('2026.10.20_18.05.00 - আমার সোনার বাংলা - Data.json');
  });

  it('keeps the long tables last, the readings to 10 ms and the cent (Rinat, 2026-10-21)', () => {
    const f = aiFile(input(sing())) as Record<string, any>;
    expect(Object.keys(f).slice(-4)).toEqual(['earlier_sessions_of_this_song', 'notes', 'beats', 'pitch_readings']);
    const voiced = f.pitch_readings.rows.filter((r: (number | null)[]) => r[1] != null);
    expect(voiced.every(([t, c]: number[]) => Number.isInteger(c) && Math.abs(t * 100 - Math.round(t * 100)) < 1e-6)).toBe(true);
    expect(AI_BRIEF.the_parts_of_this_file).toContain('for checking with a program');
  });

  it('still says what the log knows for a session without detail', () => {
    const f = aiFile(input(null, [entry({ score: 70, lines: [[0, 70]] })])) as Record<string, any>;
    expect(f.session.detail_kept).toBe(false);
    expect(f.notes).toBeNull();
    expect(f.lines).toEqual([{ line: 1, score: 70, rounds: null, share_sung: 1, behind_the_music_ms: null, notes: null, words: null }]);
  });
});

describe('all practice as one file', () => {
  it('has the brief, every session oldest first with its notes of the scale, and the detail kept, each song as played once', () => {
    const d1 = sing({ late: 0.2 });
    const d2 = { ...sing(), at: T0 + 60_000 };
    const log = [
      entry({ at: T0 - 86_400_000, score: 55, lines: [[0, 55]] }),
      entry({ score: 80, notes: noteTally(d1.pitch!.notes) }),
      entry({ at: T0 + 60_000, score: 90, routine: 'Morning' }),
    ];
    const f = JSON.parse(practiceFileParts(log, [d1, d2], '2026-10-20', T0 + 120_000).join(''));
    expect(JSON.parse(practiceFileParts(log, [d1], '2026-10-20', T0, 'Amar').join('')).file.kind).toContain('one song, “Amar”');
    expect(Object.keys(f)).toEqual(['format', 'version', 'exported', 'about_this_file', 'file', 'songs_as_played', 'sessions']);
    expect(f).toMatchObject({ format: 'gaaner-sathi-log', version: 2, exported: '2026-10-20' });
    expect(f.about_this_file).toEqual(JSON.parse(JSON.stringify(PRACTICE_BRIEF)));
    expect(f.file).toMatchObject({ sessions: 3, sessions_with_detail: 2 });
    // Both sessions played the same song the same way: one version.
    expect(f.songs_as_played).toHaveLength(1);
    expect(f.songs_as_played[0]).toMatchObject({ song_as_played: 'v1', song_id: 's1', sa_hz: 261.63, notation: TEXT });
    const [old, s1, s2] = f.sessions;
    expect(old).toMatchObject({ score: 55, line_scores: [{ line: 1, score: 55 }], notes_of_the_scale: null, detail: null });
    expect(s1.detail.song_as_played).toBe('v1');
    expect(s1.detail.notes.rows).toHaveLength(d1.pitch!.notes.length);
    expect(s1.detail.pitch_readings.rows).toHaveLength(d1.pitch!.readings.length / 2);
    // The notes of the scale as the log keeps them, and as the session's own file says.
    const fileOfOne = aiFile(input(d1, [log[1]!])) as Record<string, any>;
    expect(s1.notes_of_the_scale).toEqual(fileOfOne.notes_of_the_scale);
    expect(s2).toMatchObject({ rewaz_routine: 'Morning', notes_of_the_scale: null });
    expect(s2.detail.equipment).toEqual({ device_delay_s: 0.05, delay_measured: true, any_octave_counts: true, octave_sung_against_the_notes: 0 });
  });
});

describe('a day as one file (Rinat, 2026-10-21)', () => {
  it('has the brief once, every session’s summary in order, each song once, then the long tables', () => {
    const before = entry({ at: T0 - 86_400_000, score: 55 });
    const e1 = entry({ score: 80 });
    const e2 = entry({ at: T0 + 60_000, score: 90 });
    const e3 = entry({ at: T0 + 120_000, song: 's2', title: 'Old' });
    const log = [before, e1, e2, e3];
    const d1 = sing({ late: 0.2 });
    const d2 = { ...sing(), at: e2.at };
    const of = (e: LogEntry, d: SessionDetail | null): SessionFileInput => ({ e, detail: d, ins: analyse(e, d, log), songNow: d ? null : { title: 'Old', taal: 'dadra', tempo: 90, text: 'সা রা গা', saHz: SA, sa: 'C' }, earlier: log.filter((x) => x.song === e.song && x.at < e.at), made: T0 });
    const inputs = [of(e1, d1), of(e2, d2), of(e3, null)];
    const f = JSON.parse(dayFileParts(inputs, '2026-10-20', T0 + 200_000).join(''));
    expect(Object.keys(f)).toEqual(['about_this_file', 'file', 'day', 'sessions', 'songs_as_played', 'earlier_sessions_of_each_song', 'notes', 'for_programs']);
    expect(f.about_this_file).toEqual(JSON.parse(JSON.stringify(DAY_BRIEF)));
    expect(f.file).toMatchObject({ day: '2026-10-20', sessions: 3, sessions_with_detail: 2 });
    expect(f.day).toMatchObject({ sessions: 3, seconds_practised: 51, songs: ['আমার সোনার বাংলা', 'Old'] });
    // Each session as its own file has it, before the long tables, numbered and pointing at its song.
    expect(f.sessions.map((s: any) => [s.session_number, s.song_as_played])).toEqual([[1, 'v1'], [2, 'v1'], [3, 'v2']]);
    const own = aiFile(inputs[0]!) as Record<string, any>;
    expect(f.sessions[0].findings_by_the_app).toEqual(JSON.parse(JSON.stringify(own.findings_by_the_app)));
    expect(f.sessions[0].lines).toEqual(JSON.parse(JSON.stringify(own.lines)));
    expect(f.songs_as_played.map((s: any) => [s.title, s.as_played])).toEqual([['আমার সোনার বাংলা', true], ['Old', false]]);
    // Earlier sessions: before the day only, once for each song.
    expect(f.earlier_sessions_of_each_song).toEqual([{ song_title: 'আমার সোনার বাংলা', sessions: [expect.objectContaining({ score: 55 })] }, { song_title: 'Old', sessions: [] }]);
    // The long tables for the sessions with the pitch check, by number.
    expect(f.notes.map((n: any) => [n.session_number, n.rows.length])).toEqual([[1, d1.pitch!.notes.length], [2, d2.pitch!.notes.length]]);
    expect(f.for_programs[1].pitch_readings.rows).toHaveLength(d2.pitch!.readings.length / 2);
    expect(dayFileName(T0, 3)).toBe('2026.10.20 - Whole day (3 sessions) - Data.json');
  });
});

describe('a day’s report (Rinat, 2026-10-21)', () => {
  const day = () => {
    const log = [entry({ at: T0, score: 70, notes: noteTally(sing({ late: 0.2 }).pitch!.notes) }), entry({ at: T0 + 600_000, score: 85 }), entry({ at: T0 + 1_200_000, song: 's2', title: 'Old', score: 40 }), entry({ at: T0 + 1_800_000, song: 's3', title: 'Plain' })];
    const ds = [sing({ late: 0.2 }), { ...sing(), at: T0 + 600_000 }, null, null];
    return log.map((e, i): SessionFileInput => ({ e, detail: ds[i] ?? null, ins: analyse(e, ds[i] ?? null, log), songNow: null, earlier: [], made: T0 }));
  };

  it('sums up the day: its average, best and weakest, a song sung again, the timing', () => {
    const o = { inputs: day(), now: T0 + 3_600_000, script: 'bn' as const };
    const s = daySummary(o);
    expect([s.average, s.best?.score, s.weakest?.score]).toEqual([meanScore(o.inputs.map((x) => x.e)), 85, 40]);
    expect(s.again).toEqual([{ title: 'আমার সোনার বাংলা', from: 70, to: 85 }]);
    expect(s.behind).not.toBeNull();
    const f = dayFindings(o, s);
    expect(f.good).toContain('Your best: ‘আমার সোনার বাংলা’ at 18:15 (85).');
    expect(f.good).toContain('‘আমার সোনার বাংলা’ went from 70 to 85 through the day.');
    expect(f.work).toContain('‘Old’ at 18:25 needs the most work (40).');
  });

  it('is a whole page: the day, findings, through the day, note by note, each session', () => {
    const o = { inputs: day(), now: T0 + 3_600_000, script: 'bn' as const };
    const html = dayReportHTML(o);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Tuesday 20 October 2026</h1>');
    for (const h of ['What went well', 'What to work on', 'Through the day', 'Note by note', 'Each session', 'Bear in mind']) expect(html).toContain('<h2>' + h + '</h2>');
    expect(html.match(/class="sess"/g)).toHaveLength(4);
    expect(html).toContain('no pitch check');
    expect(html).toContain('"2026.10.20 - Whole day (4 sessions) - Report.html"');
    expect(dayReportName(o.inputs)).toBe('2026.10.20 - Whole day (4 sessions) - Report.html');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('note by note on the keys', () => {
  it('draws the keys from the lowest note sung to the highest, komal and tivra black, each sung one coloured by its score', () => {
    const html = noteKeysHTML([
      { semi: 11, oct: -1, n: 6, score: 70, cents: 20 },
      { semi: 3, oct: 0, n: 9, score: 50, cents: -18 },
      { semi: 6, oct: 0, n: 2, score: 90, cents: 0 },
      { semi: 0, oct: 1, n: 12, score: 88, cents: -4 },
    ], 'lat', false);
    // White keys lower Ni to upper Sa; the black ones between.
    expect(Array.from(html.matchAll(/class="nk w[^"]*"/g)).length).toBe(9);
    expect(Array.from(html.matchAll(/class="nk b[^"]*"/g)).length).toBe(5);
    expect(html).toContain('<span role="img" class="nk b off" style="left:');
    expect(html).toContain('aria-label="Komal Ga: sung 9 times, average score 50, usually 18 cents flat."');
    expect(html).toContain('class="nk b good few"');
    expect(html).toContain('class="nk w ok" data-k="-1"');
    expect(html).toContain('70<i>▲</i>');
    expect(html).toContain('class="nk w none"');
    expect(html).toContain('grid-template-columns:1fr 7fr 1fr');
    expect(noteKeysLegend([{ semi: 0, oct: 0, n: 2, score: 90, cents: 0 }])).toContain('Sung under 5 times');
    expect(noteKeysHTML([], 'lat')).toBe('');
  });
});

describe('a song’s report', () => {
  const day = 86_400_000;
  const notes: [number, number, number, number][] = [[0, 10, 92, 2], [5, 8, 94, 0], [7, 9, 90, 1], [12, 7, 60, -25]];
  const input = (extra: Partial<SongReportInput> = {}): SongReportInput => {
    const entries = [50, 55, 62, 70, 78, 84].map((s, i) => entry({ at: T0 - (10 - i) * day, score: s, lines: [[0, s - 10], [1, s + (i > 3 ? 10 : 0)]], notes: i > 2 ? notes : undefined }));
    return { song: 's1', title: 'আমার সোনার বাংলা', exercise: false, songNow: { taal: 'keherwa', tempo: 60, text: TEXT }, entries, details: new Map([[T0 - 5 * day, { ...sing({ late: 0.2 }), at: T0 - 5 * day }]]), now: T0, script: 'bn', ...extra };
  };

  it('sums up the trend, each line and the timing', () => {
    const o = input();
    const s = songSummary(o);
    expect(s.trend).toEqual({ from: 56, to: 77 });
    expect(s.lines.get(0)!.map((x) => x.score)).toEqual([40, 45, 52, 60, 68, 74]);
    expect(s.improved).toEqual({ line: 1, from: 53, to: 91 });
    expect(s.lately).toBeGreaterThan(0.15);
    const f = songFindings(o, s);
    expect(f.good).toContain('Your score has risen from about 56 to about 77.');
    expect(f.good).toContain('Line 2 has improved most: from 53 to 91.');
    expect(f.good.join(' ')).toContain('Your surest notes: Ma (94)');
    expect(f.work.join(' ')).toContain('Line 1 needs the most work');
    expect(f.work.join(' ')).toContain('upper Sa (60, usually flat)');
    expect(f.work.join(' ')).toMatch(/come in about (1[5-9]0|2[0-9]0) ms behind the music/);
  });

  it('is a whole page: where it stands, findings, over time, line by line, note by note, every session', () => {
    const html = songReportHTML(input());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>আমার সোনার বাংলা</h1>');
    expect(html).toContain('Getting better: from about 56 to about 77.');
    for (const h of ['Going well', 'To work on', 'Over time', 'Line by line', 'Note by note', 'Every session', 'Bear in mind']) expect(html).toContain('<h2>' + h + '</h2>');
    expect(html).toContain('<table class="heat">');
    expect(html).toContain('<td class="c lately ok">');
    expect(html).toContain('class="nk w ok" data-k="12"');
    expect(html).toContain('Note by note counts 3 of the 6 sessions');
    expect((html.match(/<tr><td class="nw">/g) || []).length).toBe(6);
    expect(html).toContain('id="save"');
  });

  it('works for a song deleted since, never sung with the pitch check', () => {
    const o = input({ songNow: null, entries: [entry({ score: undefined })], details: new Map() });
    const html = songReportHTML(o);
    expect(html).toContain('Not yet sung with the pitch check');
    expect(html).toContain('deleted since');
    expect(html).not.toContain('<h2>Line by line</h2>');
  });
});

describe('the report', () => {
  it('is a whole page: the score, findings, timing, pitch, note by note and each line drawn', () => {
    const o = input(sing({ late: 0.2 }), [entry({ at: T0 - 1, score: 60, title: 'A <b> & C' }), entry({ score: 75, title: 'A <b> & C' })]);
    const html = reportHTML({ ...o, script: 'bn' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>A &lt;b&gt; &amp; C</h1>');
    for (const t of ['What went well', 'What to work on', 'Coming in on time', 'How close to the notes', 'Note by note', 'Line by line', 'This song over time', 'Bear in mind', 'Save this report', 'Print or save as PDF', 'You kept to the notes well, but came in late.']) expect(html).toContain(t);
    expect(html.match(/<svg class="strip"/g)).toHaveLength(2);
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('works for a session from before details were kept', () => {
    const html = reportHTML({ ...input(null, [entry({ score: 70, lines: [[0, 70], [1, 50]] })]), script: 'lat' });
    expect(html).toContain('before the app kept');
    expect(html).toContain('Line by line');
    expect(html).not.toContain('<svg class="strip"');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });
});

describe('Progress', () => {
  it('has a Report and a For AI button for each session', () => {
    const html = progressHTML([entry({ score: 80 })], T0 + 60_000, { song: () => null });
    expect(html).toContain('data-report="' + T0 + '"');
    expect(html).toContain('data-ai="' + T0 + '"');
  });

  it('has a session’s three buttons on each day’s row, for the whole day, asking in its row before deleting (Rinat, 2026-10-21)', () => {
    const log = [entry({ at: T0 - 86_400_000 }), entry(), entry({ at: T0 + 60_000 })];
    const html = progressHTML(log, T0 + 120_000, { song: () => null });
    for (const k of ['dayreport', 'dayai', 'daydel']) expect(html.match(new RegExp('data-' + k + '="', 'g'))).toHaveLength(2);
    expect(html).toContain('data-dayai="' + dayNumber(T0) + '"');
    // The date folds the day; the latest days open.
    expect(html).toContain('data-dayfold="' + dayNumber(T0) + '" aria-expanded="true" aria-controls="pgday-' + dayNumber(T0) + '"');
    const sure = progressHTML(log, T0 + 120_000, { song: () => null, confirmDay: dayNumber(T0) });
    expect(sure).toContain('<span class="lsuret">Delete all 2 sessions of this day?</span><button type="button" class="lact ldelyes" data-daydelyes="' + dayNumber(T0) + '">Delete</button>');
    expect(sure).not.toContain('data-daydel="' + dayNumber(T0) + '"');
    expect(progressHTML(log, T0 + 120_000, { song: () => null, confirmDay: dayNumber(T0 - 86_400_000) })).toContain('Delete this day’s session?');
  });
});

describe('the names of the files saved (Rinat, 2026-10-21)', () => {
  it('say when, the title and what it is, so a folder lists them in time order', () => {
    const at = new Date(2026, 9, 20, 19, 35, 49).getTime();
    expect(exportName(stamp(at), 'nisha lagilo re', 'Data')).toBe('2026.10.20_19.35.49 - nisha lagilo re - Data.json');
    expect(exportName(stamp(at), 'বড়ো আশা ক\'রে এসেছি গো', 'Report')).toBe('2026.10.20_19.35.49 - বড়ো আশা ক\'রে এসেছি গো - Report.html');
    expect(exportName(stamp(at, false), dayTitle(7), 'Data')).toBe('2026.10.20 - Whole day (7 sessions) - Data.json');
    expect(songFileName(at, 'Amar', 'Report')).toBe('2026.10.20_19.35.49 - Amar (all sessions) - Report.html');
    // A day's files come before its sessions'.
    expect(['2026.10.20_19.35.49 - a - Data.json', '2026.10.20 - Whole day (7 sessions) - Data.json'].sort()[0]).toContain('Whole day');
  });

  it('keep titles to 60 letters, cut at a space, with no characters a computer refuses', () => {
    expect(fileTitle('a/b: c?')).toBe('a-b- c-');
    expect(fileTitle('   ')).toBe('Untitled');
    const long = Array.from({ length: 12 }, () => 'আমার সোনার').join(' ');
    const t = fileTitle(long);
    expect(t.endsWith('সোনার…') || t.endsWith('আমার…')).toBe(true);
    expect(Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)).length).toBeLessThanOrEqual(TITLE_MAX + 1);
    // No space to cut at: cut between letters, never inside one (a consonant and its vowel sign).
    const word = fileTitle('কা'.repeat(70));
    expect(word).toBe('কা'.repeat(TITLE_MAX) + '…');
  });
});

// A session's detail, what it shows, its report and its file for AI (src/core/practice/session.ts,
// insights.ts; src/app/report.ts, aifile.ts), and how long a song plays.
import { describe, expect, it } from 'vitest';
import { aiFile, aiFileName, aiFileText, AI_BRIEF, type SessionFileInput } from '../../src/app/aifile';
import { progressHTML } from '../../src/app/progress';
import { reportHTML } from '../../src/app/report';
import { songRowHTML } from '../../src/app/songs';
import { parseSong } from '../../src/core/notation/parse';
import { playSeconds, sectionTempoAt, songSections } from '../../src/core/notation/sections';
import { analyse, noteWords } from '../../src/core/practice/insights';
import { lengthText, type LogEntry } from '../../src/core/practice/log';
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
    expect(html).toContain('90 per min · 3 min 20 s · Sa C');
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
    expect(aiFileName(o.e)).toBe('আমার সোনার বাংলা session 2026-10-20 18-05 for AI.json');
  });

  it('still says what the log knows for a session without detail', () => {
    const f = aiFile(input(null, [entry({ score: 70, lines: [[0, 70]] })])) as Record<string, any>;
    expect(f.session.detail_kept).toBe(false);
    expect(f.notes).toBeNull();
    expect(f.lines).toEqual([{ line: 1, score: 70, rounds: null, share_sung: 1, behind_the_music_ms: null, notes: null, words: null }]);
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
    const html = progressHTML([entry({ score: 80 })], T0 + 60_000, () => null);
    expect(html).toContain('data-report="' + T0 + '"');
    expect(html).toContain('data-ai="' + T0 + '"');
  });
});

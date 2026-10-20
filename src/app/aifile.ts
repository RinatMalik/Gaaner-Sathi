/**
 * A practice session as a file for AI (Rinat, 2026-10-20: "This export will have all the
 * session information but no need for it to be human friendly. it should be AI friendly so any
 * llm can read and analyse them better ... a brief of how it all works should be included"):
 * JSON, the brief first, then the session, the song, the app's own findings, and every note,
 * line, beat and pitch reading, with what each field means. Pure, so it is tested in Node.
 */
import { parseSong } from '../core/notation/parse';
import { noteWords, type Insights } from '../core/practice/insights';
import { LOG_FILE_FORMAT, type LogEntry } from '../core/practice/log';
import type { PitchDetail, SessionDetail } from '../core/practice/session';
import { centsFromSa } from '../core/pitch/track';
import { taalInfo } from '../core/taal/taals';
import { AKAR, BN_LETTER, REPH } from '../core/notation/symbols';
import { plainBeat } from './view';

export const AI_FILE_KIND = 'Gaaner Sathi practice session, for AI analysis';
export const AI_FILE_VERSION = 1;

/** What an AI reading the file needs to know first: it may know nothing of the app. */
export const AI_BRIEF = {
  read_this_first:
    'This file is one practice session exported from Gaaner Sathi (গানের সাথী, "singing companion"), a web app for practising Bengali songs ' +
    '(Rabindrasangeet and others) from swaralipi, the Bengali akarmatrik notation. The singer sang along with the app while it listened ' +
    'through the microphone. Read this brief first: it explains the app, the notation, how the app judged the singing, and every field. ' +
    'Then help the singer: what went well, what needs work (pitch, timing, particular notes, lines, jumps), and how to practise. ' +
    'The singer is not technical: write in plain words, name lines by number ("line 3") and notes by name ("komal Ga"), and give cents ' +
    'and milliseconds only with what they mean ("about a fifth of a second late").',
  the_app:
    'The singer types a song\'s notation once. The app plays its melody on a harmonium as a guide, with a rhythm (tabla, dholak or ' +
    'drums) and a drone (tanpura or harmonium), all on one clock, and shows the song line by line with the beat being sung. With ' +
    '"Check my pitch" on, the microphone listens while the song plays: a pitch detector reads the voice\'s pitch about 47 times a ' +
    'second (each reading covers about 43 ms of sound). Each reading is compared with the note the guide plays at that moment, and ' +
    'each note is scored. No sound is recorded or kept: only the pitch readings. Singers often loop a few lines ("rounds"), slow the ' +
    'tempo, or turn the guide down to sing alone.',
  notation:
    'Notes are named relative to the tonic Sa (the singer\'s key; its frequency is song.sa_hz). The twelve notes, 0 to 11 semitones ' +
    'above Sa: Sa, komal (flat) Re, Re, komal Ga, Ga, Ma, tivra (sharp) Ma, Pa, komal Dha, Dha, komal Ni, Ni; in Bengali সা ঋা রা ' +
    'জ্ঞা গা মা হ্মা পা দা ধা ণা না. Octave 0 is the middle (madhya), −1 the lower (mandra), 1 the upper (tar, written with র্ in ' +
    'Bengali, as র্সা). A note\'s pitch in cents above Sa is 100 × semitones + 1200 × octave (100 cents is a semitone). The taal is ' +
    'the rhythmic cycle (Dadra 6 beats, Keherwa 8, Teentaal 16, ...); a beat is a matra; the tempo is matras a minute. In ' +
    'song.notation, a notes line has its beats separated by spaces or bars (| । ॥); several notes written together in one beat share ' +
    'it equally (পধা is two half-beats); a hold (- – — ~ ০, often written -া) carries the note before on; x × _ is a rest; a . before ' +
    'a note puts it an octave lower and র্ an octave higher; a line starting with > under a notes line holds its lyrics, one group per ' +
    'beat; a line starting with # is a heading (the song’s sections) that may give its section its own tempo or taal. Lines in this ' +
    'file are the notes lines, numbered from 1; song.lines gives each one’s notes and words as text.',
  time:
    'All times are seconds from the session\'s first beat (after any count-in). A note row\'s start_s to end_s is when the guide ' +
    'sounded the note, as the singer heard it. A reading\'s time_s is when the singer sang it: the device\'s delay (sound going out to ' +
    'the headphones or speakers and coming back in through the microphone, equipment.device_delay_s) has already been taken off. ' +
    'If equipment.delay_measured is false, that delay is the device\'s own figure and can be wrong by tens of milliseconds, so part of ' +
    'any lateness may be the equipment. Rounds are numbered from 1. Rounds the guide plays for the singer only to listen (call and ' +
    'response) are not judged and are not in the notes.',
  scoring:
    'Each pitch reading with voice while a note plays (leaving out 25 ms at each end) scores 100 within 10 cents of the note, 2 points ' +
    'less for each cent beyond, and 0 from 60 cents off. Readings with no voice (breaths, pauses, consonants without a tune) are left ' +
    'out, and so are readings sliding into the note (a meend: moving towards it by 10 cents or more a reading, not yet within 15 cents). ' +
    'A note\'s score is the average of its scored readings, so a voice still on the note before, or leaving early, lowers it. A note ' +
    'with voice for under half of it is "unsung": left out of the scores, but counted in the share sung. Line, round and session ' +
    'scores are the averages of their sung notes, weighted by length. Grades: 85 and over in tune (shown green), 60 to 84 close ' +
    '(amber), under 60 off (red). cents_off is the median distance from the note once the voice first came within 50 cents of it (+ ' +
    'sharp, − flat), so coming in late does not count as singing off pitch. reached_after_s is how long after the note started the ' +
    'voice first came within 50 cents of it; null means never. If equipment.any_octave_counts is true, the right note in another ' +
    'octave counts as right (distances are taken to the nearest octave of the note). The app never moves the singing in time to make ' +
    'it fit: singing late scores lower.',
  behind_the_music:
    'behind_the_music_ms is how far behind the guide the voice came: the shift, from −200 to +600 ms, at which most readings with ' +
    'voice land within 50 cents of the note playing (positive: after the guide; negative: ahead). It is the singer\'s own lateness, ' +
    'the device\'s delay already taken off. Per line it is worked out from that line\'s readings only.',
  the_parts_of_this_file:
    'session: when, how long, which lines, rounds, tempo, the score. song: the song as it was played, its notation and Sa. ' +
    'settings: how it was played. equipment: the device\'s delay and octave settings. findings_by_the_app: what the app itself ' +
    'concluded, by fixed rules, from the same data (check them, and say where you disagree). lines, rounds, notes_of_the_scale: ' +
    'summaries. notes: every note the singer was asked to sing, one row each (columns named in notes.columns). beats: every beat ' +
    'played. pitch_readings: every reading. earlier_sessions_of_this_song: the song\'s earlier sessions, for progress.',
  how_to_analyse: [
    'Start from findings_by_the_app, then check them against the numbers.',
    'Tell pitch from timing: a note can score low because it was reached late (reached_after_s) or because it was held off the note (cents_off).',
    'Look for patterns: notes of the scale always sharp or flat; big jumps (5 semitones or more) reached late; the start of lines (coming in after a breath) against their middle; high or low notes; later rounds better or worse (learning, or tiredness).',
    'Compare with earlier_sessions_of_this_song for progress.',
    'Suggest three to five things to practise, concretely: for example a slower tempo, looping one line, the guide on Soft, practising one jump on its own, holding Sa or Pa with the tanpura, measuring the device\'s delay.',
    'Do not over-read small numbers: with under about 10 sung notes the findings are rough, and a few red notes at the end of a line often only mean the singer stopped to breathe.',
  ],
  caveats: [
    'The pitch detector can mistake a note for one an octave away, or catch a consonant; readings that jump away and straight back are already taken as no voice.',
    'Without headphones the microphone also hears the harmonium, which can make the readings follow the guide and look better than the singing was.',
    'A song whose notation was changed after the session is shown here as it was played.',
  ],
};

const r = (v: number | null | undefined, d: number) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const bengali = (semi: number, oct: number) => (oct > 0 ? REPH : '') + BN_LETTER[semi] + AKAR + (oct < 0 ? ' (lower)' : oct > 1 ? ' (highest)' : '');
const iso = (at: number) => {
  const d = new Date(at);
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + (off >= 0 ? '+' : '-') + p(Math.floor(Math.abs(off) / 60)) + ':' + p(Math.abs(off) % 60);
};

/** Each notes line's notes and words as text. */
export function lineTexts(text: string): { notes: string; words: string }[] {
  const P = parseSong(text);
  return P.noteLines.map((l) => ({
    notes: l.beats.map((b) => plainBeat(b, 'bn')).join(' '),
    words: l.beats.map((b) => (b as { lyrics?: string[] }).lyrics?.[0] ?? '').join(' ').replace(/\s+/g, ' ').trim(),
  }));
}

export interface SessionFileInput {
  e: LogEntry;
  detail: SessionDetail | null;
  ins: Insights;
  /** The song as it is now, for a session without detail (null: deleted since). */
  songNow: { title: string; taal: string; tempo: number; text: string; saHz: number; sa: string } | null;
  /** The song's earlier sessions, oldest first. */
  earlier: readonly LogEntry[];
  made: number;
}

/** The file's contents. */
export function aiFile(o: SessionFileInput): Record<string, unknown> {
  const { e, detail, ins } = o;
  const song = detail?.played ?? o.songNow;
  const p = detail?.pitch ?? null;
  const T = song ? taalInfo(song.taal) : null;
  const texts = song ? lineTexts(song.text) : [];
  const out: Record<string, unknown> = {
    about_this_file: AI_BRIEF,
    file: { kind: AI_FILE_KIND, version: AI_FILE_VERSION, made: iso(o.made) },
    session: {
      started: iso(e.at),
      seconds_practised: e.secs,
      song_title: e.title,
      lines_practised: e.from === e.to ? String(e.from + 1) : e.from + 1 + '–' + (e.to + 1),
      looped: e.loop,
      rounds: e.rounds,
      tempo: e.tempo,
      tempo_reached: e.top,
      rewaz_routine: e.routine ?? null,
      pitch_check: !!p,
      score: ins.score,
      share_of_notes_sung: r(ins.sung, 3),
      detail_kept: !!detail,
    },
    song: song
      ? {
          title: song.title,
          taal: T ? T.name + ' (' + T.bn + '), ' + T.cycle + ' beats a cycle, divided ' + T.vib.join(' + ') : song.taal,
          tempo: song.tempo,
          sa: song.sa,
          sa_hz: r(song.saHz, 2),
          as_played: !!detail,
          notation: song.text,
          lines: texts.map((t, i) => ({ line: i + 1, notes: t.notes, words: t.words })),
        }
      : null,
    settings: detail
      ? {
          guide: detail.settings.guide,
          guide_when_looping: detail.settings.guideLoop,
          count_in: detail.settings.countIn,
          speed_up_each_round: detail.settings.ramp ? { by: detail.settings.rampStep, up_to: detail.settings.rampMax } : false,
        }
      : null,
    equipment: p
      ? { device_delay_s: r(p.lag, 3), delay_measured: p.measured, any_octave_counts: p.anyOctave, octave_sung_against_the_notes: p.octave }
      : null,
    findings_by_the_app: {
      headline: ins.headline,
      went_well: ins.good,
      to_work_on: ins.work,
      bear_in_mind: ins.notes,
      numbers: {
        notes_judged: ins.counts.judged,
        notes_sung: ins.counts.sung,
        notes_in_tune_85_plus: ins.counts.good,
        notes_close_60_to_84: ins.counts.ok,
        notes_off_under_60: ins.counts.off,
        median_cents_off: r(ins.pitch?.median, 1),
        median_distance_from_note_cents: r(ins.pitch?.medianAbs, 1),
        share_within_15_cents: r(ins.pitch?.inTune, 3),
        median_wobble_cents: r(ins.pitch?.wobble, 1),
        behind_the_music_ms: ins.timing?.behind != null ? Math.round(ins.timing.behind * 1000) : null,
        new_notes: ins.timing?.n ?? null,
        new_note_median_reached_after_ms: ins.timing?.arrive != null ? Math.round(ins.timing.arrive * 1000) : null,
        new_notes_reached_under_100_ms: r(ins.timing?.onTime, 3),
        new_notes_reached_100_to_250_ms: r(ins.timing?.littleLate, 3),
        new_notes_reached_after_250_ms: r(ins.timing?.late, 3),
        new_notes_never_reached: r(ins.timing?.never, 3),
        leaps_median_reached_after_ms: ins.timing?.leap != null ? Math.round(ins.timing.leap * 1000) : null,
        steps_median_reached_after_ms: ins.timing?.step != null ? Math.round(ins.timing.step * 1000) : null,
      },
    },
    lines: ins.lines.map((l) => ({
      line: l.line + 1, score: l.score, rounds: l.rounds || null, share_sung: r(l.sung, 3),
      behind_the_music_ms: l.behind != null ? Math.round(l.behind * 1000) : null,
      notes: texts[l.line]?.notes ?? null, words: texts[l.line]?.words ?? null,
    })),
    rounds: ins.rounds.map((x) => ({ round: x.round + 1, score: x.score })),
    notes_of_the_scale: ins.swaras.map((s) => ({ note: noteWords(s.semi, s.oct), bengali: bengali(s.semi, s.oct), times_sung: s.n, average_score: s.score, median_cents_off: s.cents })),
    notes: p ? notesTable(p) : null,
    beats: p ? beatsTable(p) : null,
    pitch_readings: p && song ? readingsTable(p, song.saHz) : null,
    earlier_sessions_of_this_song: o.earlier.map((x) => ({ started: iso(x.at), seconds_practised: x.secs, lines_practised: x.from === x.to ? String(x.from + 1) : x.from + 1 + '–' + (x.to + 1), rounds: x.rounds, tempo: x.tempo, score: x.score ?? null })),
  };
  return out;
}

const notesTable = (p: PitchDetail) => ({
  columns: ['line', 'round', 'song_beat', 'note', 'bengali', 'octave', 'cents_above_sa', 'start_s', 'end_s', 'status', 'score', 'cents_off', 'reached_after_s', 'wobble_cents'],
  rows: p.notes.map((n) => [n.line + 1, n.pass + 1, n.g + 1, noteWords(n.semi, 0), bengali(n.semi, n.oct), n.oct, 100 * n.semi + 1200 * n.oct, r(n.t0, 3), r(n.t1, 3), n.status, n.score, r(n.cents, 1), r(n.arrive, 3), r(n.wobble, 1)]),
});
const beatsTable = (p: PitchDetail) => ({ columns: ['start_s', 'song_beat', 'round', 'seconds_a_beat'], rows: p.beats.map((b) => [r(b[0], 3), b[1] + 1, b[2] + 1, r(b[3], 4)]) });
const readingsTable = (p: PitchDetail, saHz: number) => ({
  columns: ['time_s', 'cents_above_sa'],
  about: 'Every reading, when it was sung. cents_above_sa is null where there was no voice; Hz = sa_hz × 2^(cents/1200).',
  rows: readingRows(p.readings, p.lag, saHz),
});

function readingRows(readings: readonly number[], lag: number, saHz: number): (number | null)[][] {
  const out: (number | null)[][] = [];
  for (let i = 0; i + 1 < readings.length; i += 2) {
    const hz = readings[i + 1]!;
    out.push([r(readings[i]! - lag, 3), hz > 0 ? r(centsFromSa(hz, saHz), 1) : null]);
  }
  return out;
}

/** Two-space JSON, but each row of a table on one line, so a file stays readable and small. */
const tableJSON = (data: unknown): string =>
  JSON.stringify(data, null, 2).replace(/\[\n\s+([^[\]{}]*?)\n\s+\]/g, (_, body: string) => '[' + body.replace(/\n\s+/g, ' ') + ']');

/** The file's text: the brief and summaries readable, the long tables one row to a line. */
export function aiFileText(o: SessionFileInput): string {
  return tableJSON(aiFile(o));
}

// ── All practice, as one file (Progress → Download all practice data) ─────────

export const PRACTICE_FILE_VERSION = 2;

/** What an AI reading the whole practice history needs to know first. */
export const PRACTICE_BRIEF = {
  read_this_first:
    'This file is a singer\'s whole practice history from Gaaner Sathi (গানের সাথী, "singing companion"), a web app for practising ' +
    'Bengali songs from swaralipi, the Bengali akarmatrik notation, exported from the browser that kept it. Read this brief first: it ' +
    'explains the app, the notation, how the app judged the singing, and every part of the file. Then help the singer see how they are ' +
    'getting on: which songs and which notes are improving, what keeps going wrong, how their practice is spread, and what to practise ' +
    'next. The singer is not technical: write in plain words, name songs by title, lines by number ("line 3") and notes by name ("upper ' +
    'Sa"), and give cents and milliseconds only with what they mean.',
  the_app: AI_BRIEF.the_app,
  notation: AI_BRIEF.notation,
  time: AI_BRIEF.time,
  scoring: AI_BRIEF.scoring,
  the_parts_of_this_file:
    'sessions: every practice session, oldest first, one for each time a song or exercise was practised for 10 seconds or more (count-in ' +
    'excluded): when, how long, which lines (numbered from 1), the rounds, the tempo, and, with the pitch check on, the score, each ' +
    'line\'s score and each note of the scale\'s (notes_of_the_scale: times sung, average score, median cents off). From 20 October 2026 ' +
    'the newest 1,000 sessions also have detail: the settings, the equipment, every note the singer was asked to sing (notes), every ' +
    'beat (beats) and every pitch reading (pitch_readings), laid out as in the app\'s file for AI of one session, with the song as ' +
    'played named by song_as_played. Older sessions have only their summary. songs_as_played: each song as it was played (its ' +
    'notation, Sa, taal and tempo), once for each version the sessions used.',
  how_to_analyse: [
    'Look at progress over time: each song\'s scores session by session, and how often and how long the singer practised.',
    'Compare the notes of the scale across sessions: notes steadily flat, sharp or low-scoring (for example the upper octave, or komal notes).',
    'Within a session with detail, tell pitch from timing: a note can score low because it was reached late (reached_after_s) or because it was held off the note (cents_off).',
    'Suggest three to five things to practise next, concretely: a song or line to loop, a slower tempo, the guide on Soft, a note to hold with the tanpura.',
    'Do not over-read small numbers: a song sung once or twice, or a note sung a few times, says little.',
  ],
  caveats: AI_BRIEF.caveats,
};

const linesText = (e: LogEntry) => (e.from === e.to ? String(e.from + 1) : e.from + 1 + '–' + (e.to + 1));

/** The text of the whole practice history, in pieces to join (a long history is tens of
 * megabytes, so it is never one string or one pass of a regular expression). */
export function practiceFileParts(log: readonly LogEntry[], sessions: readonly SessionDetail[], exported: string, made: number): string[] {
  const byAt = new Map(sessions.map((d) => [d.at, d]));
  // Each song as played, once for each version the sessions used.
  const versions = new Map<string, Record<string, unknown>>();
  const versionOf = new Map<number, string>();
  for (const e of log) {
    const d = byAt.get(e.at);
    if (!d) continue;
    const s = d.played;
    const key = [d.song, s.title, s.taal, s.tempo, s.saHz, s.sa, s.text].join('\u0001');
    let v = versions.get(key);
    if (!v) {
      const T = taalInfo(s.taal);
      v = {
        song_as_played: 'v' + (versions.size + 1),
        song_id: d.song,
        title: s.title,
        taal: T ? T.name + ' (' + T.bn + '), ' + T.cycle + ' beats a cycle, divided ' + T.vib.join(' + ') : s.taal,
        tempo: s.tempo,
        sa: s.sa,
        sa_hz: r(s.saHz, 2),
        notation: s.text,
        lines: lineTexts(s.text).map((t, i) => ({ line: i + 1, notes: t.notes, words: t.words })),
      };
      versions.set(key, v);
    }
    versionOf.set(e.at, v.song_as_played as string);
  }
  const head = tableJSON({
    format: LOG_FILE_FORMAT,
    version: PRACTICE_FILE_VERSION,
    exported,
    about_this_file: PRACTICE_BRIEF,
    file: { kind: 'Gaaner Sathi practice history, to keep and for AI analysis', made: iso(made), sessions: log.length, sessions_with_detail: versionOf.size },
    songs_as_played: Array.from(versions.values()),
  });
  const parts = [head.slice(0, head.lastIndexOf('}')).trimEnd() + ',\n  "sessions": ['];
  log.forEach((e, i) => {
    const d = byAt.get(e.at);
    const p = d?.pitch ?? null;
    const one = {
      started: iso(e.at),
      seconds_practised: e.secs,
      song_id: e.song,
      song_title: e.title,
      lines_practised: linesText(e),
      looped: e.loop,
      rounds: e.rounds,
      tempo: e.tempo,
      tempo_reached: e.top,
      rewaz_routine: e.routine ?? null,
      score: e.score ?? null,
      line_scores: e.lines ? e.lines.map(([l, s]) => ({ line: l + 1, score: s })) : null,
      notes_of_the_scale: e.notes ? e.notes.map(([k, n, s, c]) => ({ note: noteWords(((k % 12) + 12) % 12, Math.floor(k / 12)), bengali: bengali(((k % 12) + 12) % 12, Math.floor(k / 12)), times_sung: n, average_score: s, median_cents_off: c })) : null,
      detail: d
        ? {
            song_as_played: versionOf.get(e.at) ?? null,
            settings: { guide: d.settings.guide, guide_when_looping: d.settings.guideLoop, count_in: d.settings.countIn, speed_up_each_round: d.settings.ramp ? { by: d.settings.rampStep, up_to: d.settings.rampMax } : false },
            equipment: p ? { device_delay_s: r(p.lag, 3), delay_measured: p.measured, any_octave_counts: p.anyOctave, octave_sung_against_the_notes: p.octave } : null,
            notes: p ? notesTable(p) : null,
            beats: p ? beatsTable(p) : null,
            pitch_readings: p ? readingsTable(p, d.played.saHz) : null,
          }
        : null,
    };
    parts.push((i ? ',' : '') + '\n' + tableJSON(one).replace(/^/gm, '    '));
  });
  parts.push('\n  ]\n}\n');
  return parts;
}

/** The file's name: the song, the date and time. */
export function aiFileName(e: LogEntry): string {
  const d = new Date(e.at);
  const p = (n: number) => String(n).padStart(2, '0');
  const base = (e.title || 'session').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60);
  return base + ' session ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + '-' + p(d.getMinutes()) + ' for AI.json';
}

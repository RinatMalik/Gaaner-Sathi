/**
 * A practice session's detail (docs/DATA.md → Session detail), kept beside its practice log
 * entry from 2026-10-20 so that each session can be reported on afterwards (Rinat: "Have two
 * buttons for each session"): the song as it was played and, when "Check my pitch" was on,
 * every note's result, each line's score and what the microphone heard (the pitch only, never
 * the sound). The log keeps only the summary. Pure, so it is tested in Node.
 */

/** The song as it was played. */
export interface PlayedSong {
  title: string;
  taal: string;
  /** The song's tempo, matras a minute (sections may have their own, in their headings). */
  tempo: number;
  /** The notation, as typed. */
  text: string;
  /** Sa: its frequency, and its key and octave in words ("C♯ (Black 1), middle octave"). */
  saHz: number;
  sa: string;
}

/** How the session was played. */
export interface PlayedSettings {
  /** The guide: 'full', 'soft' or 'off'; when looping, on 'all' rounds, the 'first' or every other ('alt'). */
  guide: string;
  guideLoop: string;
  countIn: boolean;
  /** The tempo trainer: faster by `rampStep` each round, up to `rampMax`. */
  ramp: boolean;
  rampStep: number;
  rampMax: number;
}

/** One note the singer was asked to sing, and how it went. Times are seconds from the first
 * beat. NaN is stored as null. */
export interface NoteRow {
  t0: number;
  t1: number;
  /** Semitones above Sa (0–11) and octave (0 middle, −1 lower, 1 upper). */
  semi: number;
  oct: number;
  /** Song beat, notes line (0-based) and loop round (0-based). */
  g: number;
  line: number;
  pass: number;
  /** sung; unsung (voice for under half of it: left out of the scores); short (too short to judge). */
  status: 'sung' | 'unsung' | 'short';
  score: number | null;
  /** The median distance from the note once reached, cents (+ sharp, − flat). */
  cents: number | null;
  /** Seconds from the note's start to the voice first within 50 cents of it; null if never. */
  arrive: number | null;
  /** How much the pitch moved on the note (standard deviation, cents). */
  wobble: number | null;
}

/** What the pitch check saw. */
export interface PitchDetail {
  /** The device's delay (sound out and back in), seconds, and whether it was measured with
   * clicks (else the device's own figure). A reading taken at t was sung at t − lag. */
  lag: number;
  measured: boolean;
  /** Any octave counted as the right note; the octave the voice sang in against the notes. */
  anyOctave: boolean;
  octave: number;
  notes: NoteRow[];
  /** Each line as it finished: [line, round, score (null: none sung), share of it sung 0–1]. */
  lines: [number, number, number | null, number][];
  /** What the microphone heard, in pairs: [t, Hz (0: no voice)], t when it was taken, seconds
   * from the first beat. */
  readings: number[];
  /** The beats: [t, song beat, round, seconds a beat]. */
  beats: [number, number, number, number][];
}

export interface SessionDetail {
  /** The practice log entry it belongs to (its `at`), and the song's id. */
  at: number;
  song: string;
  played: PlayedSong;
  settings: PlayedSettings;
  pitch?: PitchDetail;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (num(v) ? v : null);
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanNote(v: unknown): NoteRow | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!num(o.t0) || !num(o.t1) || !num(o.semi) || !num(o.oct) || !num(o.line) || !num(o.pass)) return null;
  const status = o.status === 'sung' || o.status === 'unsung' || o.status === 'short' ? o.status : null;
  if (!status) return null;
  return {
    t0: o.t0, t1: o.t1, semi: o.semi, oct: o.oct, g: num(o.g) ? o.g : 0, line: o.line, pass: o.pass, status,
    score: numOrNull(o.score), cents: numOrNull(o.cents), arrive: numOrNull(o.arrive), wobble: numOrNull(o.wobble),
  };
}

/** A stored session, checked: null when it is damaged beyond use. Readings may come back as a
 * typed array (as stored). */
export function cleanSession(v: unknown): SessionDetail | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const p = (o.played ?? {}) as Record<string, unknown>;
  const s = (o.settings ?? {}) as Record<string, unknown>;
  if (!num(o.at) || typeof o.song !== 'string') return null;
  const out: SessionDetail = {
    at: o.at,
    song: o.song,
    played: { title: str(p.title), taal: str(p.taal, 40), tempo: num(p.tempo) ? p.tempo : 100, text: str(p.text, 200_000), saHz: num(p.saHz) ? p.saHz : 261.63, sa: str(p.sa, 80) },
    settings: {
      guide: str(s.guide, 10) || 'full', guideLoop: str(s.guideLoop, 10) || 'all', countIn: s.countIn !== false,
      ramp: s.ramp === true, rampStep: num(s.rampStep) ? s.rampStep : 4, rampMax: num(s.rampMax) ? s.rampMax : 160,
    },
  };
  const q = o.pitch as Record<string, unknown> | undefined;
  if (q && typeof q === 'object') {
    const rd = q.readings;
    const readings = Array.isArray(rd) ? rd.filter(num) : ArrayBuffer.isView(rd) ? Array.from(rd as Float32Array) : [];
    out.pitch = {
      lag: num(q.lag) ? q.lag : 0,
      measured: q.measured === true,
      anyOctave: q.anyOctave !== false,
      octave: num(q.octave) ? q.octave : 0,
      notes: Array.isArray(q.notes) ? q.notes.map(cleanNote).filter((n): n is NoteRow => !!n) : [],
      lines: Array.isArray(q.lines)
        ? q.lines.filter((l): l is [number, number, number | null, number] => Array.isArray(l) && num(l[0]) && num(l[1]) && (l[2] === null || num(l[2])) && num(l[3]))
        : [],
      readings: readings.length % 2 ? readings.slice(0, -1) : readings,
      beats: Array.isArray(q.beats) ? q.beats.filter((b): b is [number, number, number, number] => Array.isArray(b) && b.length === 4 && b.every(num)) : [],
    };
  }
  return out;
}

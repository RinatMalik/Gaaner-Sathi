/**
 * Takes (docs/DATA.md → Takes): a recording of the singer during one play, kept with what is
 * needed to play it back against the guide in step: the lines, rounds, tempo, count-in and
 * tempo trainer as they were, and the delay from a beat to the voice reaching the app. Pure,
 * so it is tested in Node; the samples themselves are kept beside it (src/app/takes.ts).
 */

export interface Take {
  id: string;
  song: string;
  /** The song's title at the time (songs get renamed or deleted). */
  title: string;
  /** When it was recorded (ms since epoch), how long it is, and its sample rate. */
  at: number;
  secs: number;
  rate: number;
  /** Lines played (0-based, inclusive), whether they looped, and how many rounds began. */
  from: number;
  to: number;
  loop: boolean;
  rounds: number;
  /** The song's tempo then; and a rewaz item's, which every beat took, if one played. */
  tempo: number;
  flat?: number;
  countIn: boolean;
  ramp: boolean;
  rampStep: number;
  rampMax: number;
  /** Seconds of break before each round after the first, then the count-in again (absent: none). */
  gap?: number;
  /** Seconds from a beat to the singer's voice reaching the app (sound out, singer, sound in):
   * the take starts at the first beat, so the voice is that much late in it. */
  lag: number;
  /** A fingerprint of the notation then, to tell when it has changed since. */
  sig: string;
}

/** A take shorter than this is not kept (a play stopped straight away). */
export const MIN_TAKE_SECS = 3;

/** FNV-1a over the text, in base 36: enough to tell two versions of a song apart. */
export function textSig(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36) + ':' + text.length.toString(36);
}

export function newTakeId(now: number = Date.now(), rand: () => number = Math.random): string {
  return 'take-' + now.toString(36) + '-' + rand().toString(36).slice(2, 7);
}

const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);

/** A stored take, checked: null when it is damaged beyond use. */
export function cleanTake(v: unknown): Take | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const at = num(o.at, 0, 8.64e15);
  const secs = num(o.secs, 0, 86_400);
  const rate = typeof o.rate === 'number' && o.rate >= 3000 && o.rate <= 192_000 ? o.rate : null;
  if (typeof o.id !== 'string' || !o.id || typeof o.song !== 'string' || !o.song || at == null || secs == null || rate == null) return null;
  const from = Math.round(num(o.from, 0, 10_000) ?? 0);
  const t: Take = {
    id: o.id, song: o.song, title: typeof o.title === 'string' ? o.title.slice(0, 200) : '', at, secs, rate,
    from, to: Math.max(from, Math.round(num(o.to, 0, 10_000) ?? from)), loop: o.loop === true, rounds: Math.round(num(o.rounds, 1, 10_000) ?? 1),
    tempo: Math.round(num(o.tempo, 30, 240) ?? 100), countIn: o.countIn !== false, ramp: o.ramp === true,
    rampStep: Math.round(num(o.rampStep, 1, 240) ?? 4), rampMax: Math.round(num(o.rampMax, 30, 240) ?? 160),
    lag: num(o.lag, 0, 0.6) ?? 0, sig: typeof o.sig === 'string' ? o.sig : '',
  };
  const flat = num(o.flat, 30, 240);
  if (flat != null) t.flat = Math.round(flat);
  const gap = num(o.gap, 0, 120);
  if (gap) t.gap = gap;
  return t;
}

/** "1:05", or "0:42". */
export const clockText = (secs: number): string => Math.floor(secs / 60) + ':' + String(Math.floor(secs % 60)).padStart(2, '0');

/** What a take was: its lines and rounds, tempo and length. */
export function takeDetail(t: Take): string {
  const lines = t.from === t.to ? 'line ' + (t.from + 1) : 'lines ' + (t.from + 1) + '–' + (t.to + 1);
  return [lines + (t.loop && t.rounds > 1 ? ' × ' + t.rounds + ' rounds' + (t.gap ? ', ' + t.gap + ' s breaks' : '') : ''), (t.flat ?? t.tempo) + ' per min', clockText(t.secs)].join(' · ');
}

/**
 * Pitch feedback on the Practice view (docs/ROADMAP.md → Pitch feedback): the microphone
 * button, the voice drawn on each line's pitch strip against the notes (lines.ts), a mark on
 * each beat sung, a score for each line, the run's average as it goes (Rinat, 2026-10-15), and
 * a line of text saying how close the voice is.
 * Readings, expected notes and scores come from src/core/pitch/track.ts; the microphone from
 * src/audio/mic.ts. "Check my pitch" switches it on; the microphone then listens only while a
 * song plays (Rinat, 2026-10-12): it comes on when playing starts or goes on after a pause, and
 * goes off when it stops or pauses.
 */
import { Mic, MicError, micProblemText, type MicReading } from '../audio/mic';
import type { BeatEntry } from '../audio/transport';
import type { ParsedSong } from '../core/notation/types';
import { beatNotes, centsFromSa, eventsByBeat, nearestNote, PitchTracker, type LineResult, type NoteResult, type Section } from '../core/pitch/track';
import { ragColour, type LinesUI } from './lines';
import { beatNoteHTML, type Script } from './view';

export interface PitchHost {
  /** The app's AudioContext, made and resumed on demand (call from a tap). */
  audio(): AudioContext | null;
  saHz(): number;
  script(): Script;
  parsed(): ParsedSong;
  /** The elements showing a song beat, marked with how it was sung. */
  beatEls(g: number): readonly HTMLElement[];
  /** The section playing, or null; `listen`: rounds with the guide are for listening
   * (call and response), so they are not scored. */
  section(): (Section & { listen: boolean }) | null;
  /** Whether the octave must match, and the delay found last time (seconds). */
  octave: { get(): boolean; set(v: boolean): void };
  lag: { get(): number | undefined; set(v: number): void };
  /** The Practice view's lines: the voice is drawn on their strips, each line's score beside it. */
  lines: Pick<LinesUI, 'voice' | 'voiceOff' | 'lineScore' | 'clearRun'>;
}

export interface PitchUI {
  /** "Check my pitch" is on. */
  readonly on: boolean;
  /** Playing started (or pitch checking was switched on while playing): the microphone
   * comes on, and scoring starts from here. */
  startRun(): void;
  /** Playing paused at AudioContext time t: the microphone goes off; the scores so far stay. */
  pause(t: number): void;
  /** Playing went on after a pause: the microphone comes on again. */
  resume(): void;
  /** A beat has been scheduled. */
  beat(q: BeatEntry, spb: number): void;
  /** Playing stopped (the microphone goes off): the scores, for the practice log (null
   * without enough singing). */
  endRun(): { score: number; lines: [number, number][] } | null;
}

/** A score's colour class: in tune, close, or off; and a note not sung. */
const grade = (score: number) => (score >= 85 ? 'good' : score >= 60 ? 'ok' : 'off');
const RANK: Record<string, number> = { good: 0, ok: 1, off: 2, miss: 3 };
/** How close a reading is to the note expected: in tune within 15 cents, close within 35. */
const closeness = (cents: number) => (Math.abs(cents) <= 15 ? 'good' : Math.abs(cents) <= 35 ? 'ok' : 'off');

export function initPitch(host: PitchHost): PitchUI {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const btn = $('#micBtn');
  const box = $('#pitchBox');
  const noteEl = $('#pNote');
  const msgEl = $('#pMsg');
  const scoresEl = $('#pScores');
  const octBox = $<HTMLInputElement>('#pOct');
  const lagEl = $('#pLag');

  /** "Check my pitch" is on; the microphone is wanted now (playing); it is open; opening. */
  let armed = false;
  let wanted = false;
  let mic: Mic | null = null;
  let starting = false;
  let tracker: PitchTracker | null = null;
  let byBeat: number[][] = [];
  let parsedAt: ParsedSong | null = null;
  let raf = 0;
  /** Recent readings, for the text and the voice drawn. */
  let recent: MicReading[] = [];
  /** The worst mark on each beat in the current round. */
  const marks = new Map<number, { pass: number; rank: number }>();
  /** The beats scheduled this run, in time order, to place each reading on its beat; and the
   * time of the last reading drawn. */
  let sched: { time: number; s: number; pass: number; spb: number }[] = [];
  let drawnT = -Infinity;

  function setButton(on: boolean, label: string): void {
    btn.setAttribute('aria-pressed', String(on));
    $('#micLab').textContent = label;
  }
  // Drawn every frame, so the text is only touched when it changes.
  function message(text: string, cls = ''): void {
    if (msgEl.textContent !== text) msgEl.textContent = text;
    const c = 'pmsg' + (cls ? ' ' + cls : '');
    if (msgEl.className !== c) msgEl.className = c;
  }
  let noteShown = '';
  function sungNote(html: string): void {
    if (noteShown === html) return;
    noteShown = html;
    noteEl.innerHTML = html;
  }

  const WAITING = 'The microphone listens while the song plays. Press play and sing.';

  /** "Check my pitch" switched on: ready for the next play (or listening now, if playing). */
  function turnOn(): void {
    armed = true;
    box.hidden = false;
    setButton(true, 'Pitch check on');
    message(WAITING);
    sungNote('');
    if (host.section()) startRun();
  }

  function turnOff(): void {
    quiet();
    armed = false;
    setButton(false, 'Check my pitch');
    box.hidden = true;
  }

  /** Open the microphone (playing has started, or gone on). */
  async function listen(): Promise<void> {
    wanted = true;
    if (mic || starting) return;
    starting = true;
    setButton(true, 'Starting…');
    try {
      const ctx = host.audio();
      if (!ctx) throw new MicError('unsupported', 'no audio');
      const m = await Mic.open(ctx, onReading);
      // Playing may have stopped while the microphone was starting.
      if (!wanted || !armed) {
        m.close();
        return;
      }
      mic = m;
      if (tracker && host.lag.get() == null) tracker.lag = m.latency();
      setButton(true, 'Listening');
      message('Sing…');
      raf = requestAnimationFrame(draw);
    } catch (e) {
      wanted = false;
      armed = false;
      setButton(false, 'Check my pitch');
      message(micProblemText(e instanceof MicError ? e.problem : 'other'));
    } finally {
      starting = false;
      if (!mic && armed) setButton(true, 'Pitch check on');
    }
  }

  /** Close the microphone (playing stopped or paused); pitch checking stays on. */
  function quiet(text = WAITING): void {
    wanted = false;
    mic?.close();
    mic = null;
    cancelAnimationFrame(raf);
    raf = 0;
    recent = [];
    host.lines.voiceOff();
    if (!armed) return;
    setButton(true, 'Pitch check on');
    sungNote('');
    message(text);
  }

  function onReading(r: MicReading): void {
    recent.push(r);
    if (recent.length > 400) recent = recent.slice(-300);
    tracker?.addReading({ t: r.t, hz: r.hz });
  }

  // ── Scores ─────────────────────────────────────────────────────────────────

  function clearMarks(): void {
    for (const el of document.querySelectorAll('.pg-good,.pg-ok,.pg-off,.pg-miss')) el.classList.remove('pg-good', 'pg-ok', 'pg-off', 'pg-miss');
    marks.clear();
  }

  function mark(r: NoteResult): void {
    if (!r.note.judged || r.status === 'short') return;
    const cls = r.status === 'unsung' ? 'miss' : grade(r.score);
    const g = r.note.g;
    const had = marks.get(g);
    if (had && had.pass === r.note.pass && had.rank >= RANK[cls]!) return;
    marks.set(g, { pass: r.note.pass, rank: RANK[cls]! });
    for (const el of host.beatEls(g)) {
      el.classList.remove('pg-good', 'pg-ok', 'pg-off', 'pg-miss');
      el.classList.add('pg-' + cls);
    }
  }

  function lineDone(l: LineResult): void {
    host.lines.lineScore(l.line, l.score);
  }

  function settle(final: boolean): void {
    if (!tracker) return;
    const r = tracker.settle(final);
    r.notes.forEach(mark);
    r.lines.forEach(lineDone);
    if (r.lines.length) showAverage(false);
  }

  /** The run's average so far, under the lines and tinted by it, updated as each line ends; at
   * the end, the run's (as the practice log keeps it). */
  function showAverage(final: boolean): void {
    const s = tracker?.summary();
    scoresEl.innerHTML = s
      ? '<span class="pavg" style="--lc:' + ragColour(s.score) + '"><b>' + s.score + '</b><span>' + (final ? 'Average for this run' : 'Average so far') + ' · ' + Math.round(s.sung * 100) + '% of the notes sung</span></span>'
      : '';
  }

  /** Scoring starts with the first beat scheduled, while the microphone is still starting:
   * notes it was not yet open for are left out of the scores. */
  function startRun(): void {
    if (!armed) return;
    if (tracker) settle(true);
    clearMarks();
    host.lines.clearRun();
    scoresEl.innerHTML = '';
    sched = [];
    drawnT = -Infinity;
    parsedAt = host.parsed();
    byBeat = eventsByBeat(parsedAt);
    tracker = new PitchTracker({ lag: host.lag.get() ?? mic?.latency() ?? 0.15, anyOctave: !host.octave.get(), saHz: host.saHz() });
    void listen();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  /** The median distance of the last ~200 ms of readings from a target, in cents: one
   * cycle of vibrato, so the text shows the pitch sung rather than its swing. */
  function steady(target: (r: MicReading) => number | null): number | null {
    const last = recent.slice(-9);
    if (!last.length || !last[last.length - 1]!.hz) return null;
    const v = last.filter((r) => r.hz).map(target).filter((c): c is number => c != null).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1]! : null;
  }

  function showMeter(cents: number | null, label: string, sungCents: number | null): void {
    if (cents == null) message(label);
    else {
      const n = Math.round(Math.abs(cents));
      message(Math.abs(cents) <= 15 ? 'In tune' : n + ' cents ' + (cents > 0 ? 'sharp' : 'flat'), closeness(cents));
    }
    if (sungCents == null) sungNote('');
    else {
      const nn = nearestNote(sungCents);
      sungNote('You: <b>' + beatNoteHTML({ units: [{ k: 'note', semi: nn.semi, oct: nn.oct }] }, host.script()) + '</b>');
    }
  }

  function draw(): void {
    if (!mic) return;
    raf = requestAnimationFrame(draw);
    settle(false);
    const sa = host.saHz();
    const latest = recent[recent.length - 1];
    const sungAbs = latest && latest.hz ? centsFromSa(latest.hz, sa) : null;
    if (tracker && host.section()) {
      const live = tracker.live();
      const note = live?.note ?? null;
      if (!note) showMeter(null, latest && latest.hz ? 'Rest' : 'Sing…', sungAbs);
      else {
        // Only this note's readings, past its first moments (as when scoring), so a note
        // change never shows the last note's pitch against the new one.
        const from = note.t0 + Math.min(0.08, 0.3 * (note.t1 - note.t0));
        const c = steady((r) => (r.t - tracker!.lag >= from && r.t - tracker!.lag < note.t1 ? tracker!.errorFor(r.hz, note) : null));
        if (c != null || !latest?.hz) showMeter(c, 'Sing…', sungAbs);
      }
      lagEl.textContent = 'Delay ' + Math.round(tracker.lag * 1000) + ' ms';
      drawVoice(sa);
    } else {
      const c = steady((r) => nearestNote(centsFromSa(r.hz, sa)).off);
      showMeter(c, 'Sing a note: the text shows how close it is to the nearest one.', sungAbs);
    }
  }

  /** The beat a moment of the song falls in, and how far through it, from the beats scheduled. */
  function placeOf(t: number): { s: number; pass: number; f: number } | null {
    let lo = 0;
    let hi = sched.length - 1;
    let k = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (sched[m]!.time <= t) {
        k = m;
        lo = m + 1;
      } else hi = m - 1;
    }
    if (k < 0) return null;
    const e = sched[k]!;
    const f = (t - e.time) / e.spb;
    return f <= 1 ? { s: e.s, pass: e.pass, f } : null;
  }

  /** The readings that came in since the last frame, onto the lines' strips: against the note
   * expected then (moved to its octave when any octave counts), coloured by how close. */
  function drawVoice(sa: number): void {
    if (!tracker) return;
    for (const r of recent) {
      if (r.t <= drawnT) continue;
      drawnT = r.t;
      const t = r.t - tracker.lag;
      const at = placeOf(t);
      if (!at) continue;
      if (!r.hz) {
        host.lines.voice(at.s, at.pass, at.f, null, false, '');
        continue;
      }
      const n = tracker.expectedAt(t);
      if (n) {
        const err = tracker.errorFor(r.hz, n);
        host.lines.voice(at.s, at.pass, at.f, tracker.anyOctave ? 100 * (n.semi + 12 * n.oct) + err : centsFromSa(r.hz, sa), false, closeness(err));
      } else host.lines.voice(at.s, at.pass, at.f, centsFromSa(r.hz, sa), true, 'free');
    }
  }

  // ── Wiring ─────────────────────────────────────────────────────────────────

  btn.addEventListener('click', () => {
    if (armed) turnOff();
    else turnOn();
  });
  octBox.checked = host.octave.get();
  octBox.addEventListener('change', () => {
    host.octave.set(octBox.checked);
    if (tracker) tracker.anyOctave = !octBox.checked;
  });

  return {
    get on() {
      return armed;
    },
    startRun,
    pause(t) {
      if (tracker) {
        tracker.cut(t);
        settle(false);
      }
      quiet('Paused: the microphone is off. Press play to go on.');
    },
    resume() {
      if (!armed) return;
      if (tracker) void listen();
      else startRun();
    },
    beat(q, spb) {
      const sec = host.section();
      if (!tracker || !sec || q.pass < 0 || !parsedAt) return;
      sched.push({ time: q.time, s: q.s, pass: q.pass, spb });
      if (sched.length > 600) sched = sched.slice(-400);
      tracker.addNotes(beatNotes(parsedAt, byBeat, { time: q.time, s: q.s, pass: q.pass, spb }, sec, !(sec.listen && q.guide)));
    },
    endRun() {
      quiet();
      if (!tracker) return null;
      settle(true);
      const s = tracker.summary();
      showAverage(true);
      host.lag.set(tracker.lag);
      tracker = null;
      return s ? { score: s.score, lines: s.lines } : null;

    },
  };
}

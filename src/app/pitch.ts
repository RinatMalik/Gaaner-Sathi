/**
 * Pitch feedback on the Practice view (docs/ROADMAP.md → Pitch feedback): the microphone
 * button, a meter and a trace of the voice against the notes, a mark on each beat sung,
 * and a score for each line. Readings, expected notes and scores come from
 * src/core/pitch/track.ts; the microphone from src/audio/mic.ts. When nothing is playing,
 * the meter shows how close the voice is to the nearest note (a tuner).
 */
import { Mic, MicError, micProblemText, type MicReading } from '../audio/mic';
import type { BeatEntry } from '../audio/transport';
import type { ParsedSong } from '../core/notation/types';
import { beatNotes, centsFromSa, eventsByBeat, foldOctave, nearestNote, PitchTracker, type LineResult, type NoteResult, type Section } from '../core/pitch/track';
import { beatNoteHTML, type Script } from './view';

export interface PitchHost {
  /** The app's AudioContext, made and resumed on demand (call from a tap). */
  audio(): AudioContext | null;
  saHz(): number;
  script(): Script;
  parsed(): ParsedSong;
  /** The beat elements on the sheets for a song beat. */
  beatEls(g: number): readonly HTMLElement[];
  /** The section playing, or null; `listen`: rounds with the guide are for listening
   * (call and response), so they are not scored. */
  section(): (Section & { listen: boolean }) | null;
  /** Whether the octave must match, and the delay found last time (seconds). */
  octave: { get(): boolean; set(v: boolean): void };
  lag: { get(): number | undefined; set(v: number): void };
}

export interface PitchUI {
  readonly on: boolean;
  /** Playing started, or the microphone came on while playing: score from here. */
  startRun(): void;
  /** A beat has been scheduled. */
  beat(q: BeatEntry, spb: number): void;
  /** Playing stopped: the scores, for the practice log (null without enough singing). */
  endRun(): { score: number; lines: [number, number][] } | null;
}

/** A score's colour class: in tune, close, or off; and a note not sung. */
const grade = (score: number) => (score >= 85 ? 'good' : score >= 60 ? 'ok' : 'off');
const RANK: Record<string, number> = { good: 0, ok: 1, off: 2, miss: 3 };
const TRACE_SECS = 6;

export function initPitch(host: PitchHost): PitchUI {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const btn = $('#micBtn');
  const box = $('#pitchBox');
  const needle = $('#pNeedle');
  const noteEl = $('#pNote');
  const msgEl = $('#pMsg');
  const canvas = $<HTMLCanvasElement>('#pTrace');
  const scoresEl = $('#pScores');
  const octBox = $<HTMLInputElement>('#pOct');
  const lagEl = $('#pLag');

  let mic: Mic | null = null;
  let starting = false;
  let tracker: PitchTracker | null = null;
  let byBeat: number[][] = [];
  let parsedAt: ParsedSong | null = null;
  let raf = 0;
  /** Recent readings, for the trace and the tuner. */
  let recent: MicReading[] = [];
  /** The worst mark on each beat in the current round. */
  const marks = new Map<number, { pass: number; rank: number }>();
  let chips: string[] = [];
  let centre = 0;

  function setButton(on: boolean, label: string): void {
    btn.setAttribute('aria-pressed', String(on));
    $('#micLab').textContent = label;
  }
  // Drawn every frame, so the text is only touched when it changes.
  function message(text: string): void {
    if (msgEl.textContent !== text) msgEl.textContent = text;
  }
  let noteShown = '';
  function sungNote(html: string): void {
    if (noteShown === html) return;
    noteShown = html;
    noteEl.innerHTML = html;
  }

  async function turnOn(): Promise<void> {
    if (mic || starting) return;
    starting = true;
    box.hidden = false;
    setButton(true, 'Starting…');
    message('Starting the microphone…');
    sungNote('');
    try {
      const ctx = host.audio();
      if (!ctx) throw new MicError('unsupported', 'no audio');
      mic = await Mic.open(ctx, onReading);
      setButton(true, 'Listening');
      message('Sing a note.');
      if (host.section()) startRun();
      raf = requestAnimationFrame(draw);
    } catch (e) {
      mic = null;
      setButton(false, 'Check my pitch');
      message(micProblemText(e instanceof MicError ? e.problem : 'other'));
    } finally {
      starting = false;
    }
  }

  function turnOff(): void {
    mic?.close();
    mic = null;
    cancelAnimationFrame(raf);
    raf = 0;
    recent = [];
    setButton(false, 'Check my pitch');
    box.hidden = true;
  }

  function onReading(r: MicReading): void {
    recent.push(r);
    if (recent.length > 400) recent = recent.slice(-300);
    tracker?.addReading({ t: r.t, hz: r.hz });
  }

  // ── Scores ─────────────────────────────────────────────────────────────────

  function clearMarks(): void {
    for (const el of document.querySelectorAll('.beat.pg-good,.beat.pg-ok,.beat.pg-off,.beat.pg-miss')) el.classList.remove('pg-good', 'pg-ok', 'pg-off', 'pg-miss');
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

  function lineChip(l: LineResult): void {
    const sung = Number.isFinite(l.score);
    chips.push('<span class="pchip ' + (sung ? grade(l.score) : 'miss') + '">Line ' + (l.line + 1) + (l.pass ? ', round ' + (l.pass + 1) : '') + ' · ' + (sung ? l.score : 'not sung') + '</span>');
    if (chips.length > 12) chips = chips.slice(-12);
    scoresEl.innerHTML = chips.join('');
  }

  function settle(final: boolean): void {
    if (!tracker) return;
    const r = tracker.settle(final);
    r.notes.forEach(mark);
    r.lines.forEach(lineChip);
  }

  function startRun(): void {
    if (!mic) return;
    if (tracker) settle(true);
    clearMarks();
    chips = [];
    scoresEl.innerHTML = '';
    parsedAt = host.parsed();
    byBeat = eventsByBeat(parsedAt);
    tracker = new PitchTracker({ lag: host.lag.get() ?? mic.latency(), anyOctave: !host.octave.get(), saHz: host.saHz() });
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  /** The median distance of the last ~200 ms of readings from a target, in cents: one
   * cycle of vibrato, so the meter shows the pitch sung rather than its swing. */
  function steady(target: (r: MicReading) => number | null): number | null {
    const last = recent.slice(-9);
    if (!last.length || !last[last.length - 1]!.hz) return null;
    const v = last.filter((r) => r.hz).map(target).filter((c): c is number => c != null).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1]! : null;
  }

  function showMeter(cents: number | null, label: string, sungCents: number | null): void {
    if (cents == null) {
      needle.hidden = true;
      message(label);
    } else {
      needle.hidden = false;
      const c = Math.max(-50, Math.min(50, cents));
      needle.style.left = 50 + c + '%';
      needle.className = 'pn ' + (Math.abs(cents) <= 15 ? 'good' : Math.abs(cents) <= 35 ? 'ok' : 'off');
      const n = Math.round(Math.abs(cents));
      message(Math.abs(cents) <= 15 ? 'In tune' : n + ' cents ' + (cents > 0 ? 'sharp' : 'flat'));
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
    const lag = tracker ? tracker.lag : 0;
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
    } else {
      const c = steady((r) => nearestNote(centsFromSa(r.hz, sa)).off);
      showMeter(c, 'Sing a note: the meter shows how close it is to the nearest one.', sungAbs);
    }
    drawTrace(sa, lag);
  }

  function drawTrace(sa: number, lag: number): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    if (!g) return;
    const css = getComputedStyle(document.documentElement);
    const col = (v: string) => css.getPropertyValue(v).trim() || '#888';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const latest = recent[recent.length - 1];
    if (!latest) return;
    const tEnd = latest.t - lag;
    const tStart = tEnd - TRACE_SECS;
    const notes = tracker ? tracker.notesBetween(tStart, tEnd + 2) : [];
    // The middle of the view follows the note expected now, or the voice when free singing.
    const now = tracker?.expectedAt(tEnd) ?? notes.find((n) => n.t0 >= tEnd) ?? null;
    if (now) centre = 100 * (now.semi + 12 * now.oct);
    else if (latest.hz) {
      const c = centsFromSa(latest.hz, sa);
      if (Math.abs(c - centre) > 500) centre = 100 * Math.round(c / 100);
    }
    const span = 1400;
    const x = (t: number) => ((t - tStart) / TRACE_SECS) * w;
    const y = (c: number) => h / 2 - ((c - centre) / span) * h;
    // Semitone lines, Sa lines stronger; the natural notes named at the left where they fit.
    g.font = '11px ' + (host.script() === 'bn' ? '"Tiro Bangla", serif' : 'system-ui, sans-serif');
    g.textBaseline = 'middle';
    let lastLabel = Infinity;
    for (let k = Math.ceil((centre - span / 2) / 100); k <= Math.floor((centre + span / 2) / 100); k++) {
      const yy = y(k * 100);
      const nn = nearestNote(k * 100);
      g.strokeStyle = col('--rule');
      g.globalAlpha = nn.semi === 0 ? 1 : 0.45;
      g.lineWidth = nn.semi === 0 ? 1.5 : 1;
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(w, yy);
      g.stroke();
      g.globalAlpha = 1;
      if ([0, 2, 4, 5, 7, 9, 11].includes(nn.semi) && lastLabel - yy >= 13) {
        g.fillStyle = col('--ink-2');
        g.fillText(noteName(nn.semi, nn.oct), 4, yy);
        lastLabel = yy;
      }
    }
    // The notes expected, as bars.
    g.fillStyle = col('--brass');
    for (const n of notes) {
      const c = 100 * (n.semi + 12 * n.oct);
      g.globalAlpha = n.judged ? 0.45 : 0.2;
      g.fillRect(x(n.t0), y(c) - 4, Math.max(1, x(n.t1) - x(n.t0) - 1), 8);
    }
    g.globalAlpha = 1;
    // The voice: each reading coloured by how close it is to the note expected then.
    for (const r of recent) {
      if (!r.hz) continue;
      const t = r.t - lag;
      if (t < tStart) continue;
      let c = centsFromSa(r.hz, sa);
      const n = tracker ? tracker.expectedAt(t) : null;
      let off: number;
      if (n) {
        const want = 100 * (n.semi + 12 * n.oct);
        const err = tracker!.errorFor(r.hz, n);
        if (tracker!.anyOctave) c = want + err;
        off = err;
      } else {
        c = centre + foldOctave(c - centre);
        off = nearestNote(c).off;
      }
      const a = Math.abs(off);
      g.fillStyle = col(a <= 15 ? '--good' : a <= 35 ? '--warn' : '--red-ink');
      g.beginPath();
      g.arc(x(t), Math.max(3, Math.min(h - 3, y(c))), 2.2, 0, 2 * Math.PI);
      g.fill();
    }
  }

  /** A note's name as plain text for the trace, octave marks written out as when typing. */
  const names = new Map<string, string>();
  function noteName(semi: number, oct: number): string {
    const script = host.script();
    const key = script + semi + ':' + oct;
    let s = names.get(key);
    if (s == null) {
      const el = document.createElement('span');
      el.innerHTML = beatNoteHTML({ units: [{ k: 'note', semi, oct }] }, script);
      s = (oct < 0 ? '.'.repeat(-oct) : '') + (el.textContent || '') + (script === 'lat' && oct > 0 ? "'".repeat(oct) : '');
      names.set(key, s);
    }
    return s;
  }

  // ── Wiring ─────────────────────────────────────────────────────────────────

  btn.addEventListener('click', () => {
    if (mic) turnOff();
    else void turnOn();
  });
  octBox.checked = host.octave.get();
  octBox.addEventListener('change', () => {
    host.octave.set(octBox.checked);
    if (tracker) tracker.anyOctave = !octBox.checked;
  });

  return {
    get on() {
      return !!mic;
    },
    startRun,
    beat(q, spb) {
      const sec = host.section();
      if (!tracker || !sec || q.pass < 0 || !parsedAt) return;
      tracker.addNotes(beatNotes(parsedAt, byBeat, { time: q.time, s: q.s, pass: q.pass, spb }, sec, !(sec.listen && q.guide)));
    },
    endRun() {
      if (!tracker) return null;
      settle(true);
      const s = tracker.summary();
      host.lag.set(tracker.lag);
      tracker = null;
      if (s) chips.push('<span class="pchip sum ' + grade(s.score) + '">This run · ' + s.score + ' · ' + Math.round(s.sung * 100) + '% of the notes sung</span>');
      scoresEl.innerHTML = chips.join('');
      return s ? { score: s.score, lines: s.lines } : null;
    },
  };
}

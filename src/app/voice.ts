/**
 * The Voice view (docs/ROADMAP.md → Phase 1): the range finder (sing your lowest and highest
 * notes; it suggests your Sa, and the best Sa for the open song) and the hold-a-note trainer
 * (the tanpura plays, the note is played first, then you hold it as long and as steadily as
 * you can). The sums are in src/core/pitch/voice.ts; the HTML builders here are pure and
 * tested in Node. The microphone is only on while listening, and nothing is recorded.
 */
import { Mic, MicError, micProblemText } from '../audio/mic';
import type { Engine } from '../audio/engine';
import { DEFAULT_SOUND, type SoundSettings } from '../audio/sound';
import { Transport } from '../audio/transport';
import { parseSong } from '../core/notation/parse';
import { LAT_LETTER } from '../core/notation/symbols';
import type { ParsedSong } from '../core/notation/types';
import { HoldTimer, noteName, RangeListener, songSpan, steadiness, suggestSa, TYPICAL_SPAN, type HoldResult, type SaSuggestion } from '../core/pitch/voice';
import { taalInfo } from '../core/taal/taals';
import { beatNoteHTML, esc, KEYS, OCTS, type Script } from './view';

/** The lowest and highest notes found, MIDI numbers; either may be missing yet. */
export interface VoiceRange {
  lo?: number;
  hi?: number;
}
export interface SaChoice {
  saKey: number;
  saOct: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** A Sa in words, as the deck names it: "E (White 3), low octave". */
export function saText(s: SaChoice): string {
  const k = KEYS[s.saKey];
  const o = OCTS.find((x) => x[0] === s.saOct)?.[1] ?? '';
  return (k ? k[0] + ' (' + k[1] + ')' : '?') + ', ' + o.toLowerCase() + ' octave';
}
/** A note given in semitones from Sa, drawn as on the sheet. */
const noteAt = (semis: number, script: Script) => '<b class="vnote">' + beatNoteHTML({ units: [{ k: 'note', semi: mod(semis, 12), oct: Math.floor(semis / 12) }] }, script) + '</b>';
const midiText = (m: number) => {
  const k = KEYS[mod(Math.round(m), 12)];
  return noteName(m) + (k ? ' · ' + k[1] : '');
};
const semitones = (n: number) => {
  const o = Math.floor(n / 12);
  const s = n % 12;
  return (o ? o + ' octave' + (o > 1 ? 's' : '') : '') + (o && s ? ' and ' : '') + (s || !o ? s + ' semitone' + (s === 1 ? '' : 's') : '');
};

/**
 * What the range finder found: the range, the Sa it suggests for any song (with a button to
 * make it "your Sa"), and for the open song when it is one of the user's own.
 */
export function rangeResultHTML(r: { lo: number; hi: number }, script: Script, my: SaChoice | undefined, song: { title: string; own: boolean; span: { lo: number; hi: number } | null; sa: SaChoice } | null): string {
  const s = suggestSa(r.lo, r.hi);
  const same = (a: SaChoice | undefined, b: SaSuggestion) => !!a && a.saKey === b.saKey && a.saOct === b.saOct;
  let html = '<p>Your range: <b>' + esc(midiText(r.lo)) + '</b> to <b>' + esc(midiText(r.hi)) + '</b>, ' + semitones(Math.round(r.hi - r.lo)) + '.</p>';
  html += '<div class="vsa"><p class="vbig">Your Sa: <b>' + esc(saText(s)) + '</b></p><p>With it your voice reaches from ' + noteAt(s.low, script) + ' to ' + noteAt(s.high, script) + '.' +
    (s.short > 0 ? ' Most songs go from ' + noteAt(TYPICAL_SPAN.lo, script) + ' to ' + noteAt(TYPICAL_SPAN.hi, script) + ', a little more than your range, so their lowest and highest notes may be a stretch.' : ' Most songs go from ' + noteAt(TYPICAL_SPAN.lo, script) + ' to ' + noteAt(TYPICAL_SPAN.hi, script) + ', so they fit.') +
    (s.clamped ? ' (That is as far as the app’s Sa goes.)' : '') + '</p>' +
    (same(my, s) ? '<p class="vok">Exercises and new songs use it.</p>' : '<button type="button" class="btn primary" data-act="mysa" data-key="' + s.saKey + '" data-oct="' + s.saOct + '">Use as my Sa</button> <span class="phint">for the exercises and new songs</span>') + '</div>';
  if (song && song.own && song.span) {
    const t = suggestSa(r.lo, r.hi, song.span);
    const fits = t.short === 0;
    html += '<div class="vsa"><p>For <b class="vtitle">' + esc(song.title) + '</b>: <b>' + esc(saText(t)) + '</b>. Its notes go from ' + noteAt(song.span.lo, script) + ' to ' + noteAt(song.span.hi, script) +
      (fits ? ', which fits your range.' : ', ' + t.short + ' semitone' + (t.short === 1 ? '' : 's') + ' more than your range.') + '</p>' +
      (t.saKey === song.sa.saKey && t.saOct === song.sa.saOct ? '<p class="vok">The song already uses it.</p>' : '<button type="button" class="btn" data-act="songsa" data-key="' + t.saKey + '" data-oct="' + t.saOct + '">Use for this song</button>') + '</div>';
  }
  return html;
}

/** A hold's result in a line. */
export function holdResultHTML(r: HoldResult, best: number | undefined): string {
  const c = Math.round(r.cents);
  const where = Math.abs(c) <= 10 ? 'in tune' : Math.abs(c) + ' cents ' + (c > 0 ? 'sharp' : 'flat');
  const isBest = best == null || r.secs > best + 1e-9;
  return '<p class="vbig">Held <b>' + r.secs.toFixed(1) + ' s</b></p><p>' + steadiness(r.wobble) + ' (it moved ±' + Math.round(r.wobble) + ' cents), ' + where +
    (r.onNote < 0.8 ? ', and off the note ' + Math.round((1 - r.onNote) * 100) + '% of the time' : '') + '.</p>' +
    '<p class="' + (isBest ? 'vok' : 'phint') + '">' + (isBest ? (best == null ? 'Your first hold of this note.' : 'Your longest yet (before: ' + best.toFixed(1) + ' s).') : 'Your longest: ' + best!.toFixed(1) + ' s.') + '</p>';
}

/** The notes the hold trainer offers, in cents from Sa (store.ts → HOLD_CENTS). */
export const HOLD_NOTES: readonly [number, string][] = [
  [-500, 'lower Pa'], [-300, 'lower Dha'], [-100, 'lower Ni'], [0, 'Sa'], [200, 'Re'], [400, 'Ga'], [500, 'Ma'], [700, 'Pa'], [900, 'Dha'], [1100, 'Ni'], [1200, 'upper Sa'],
];
/** The note's notation in Sa Re Ga letters, held for four beats: what the guide plays. */
export function holdText(cents: number): string {
  const s = Math.round(cents / 100);
  const oct = Math.floor(s / 12);
  return (oct < 0 ? '.'.repeat(-oct) : '') + LAT_LETTER[mod(s, 12)] + (oct > 0 ? "'".repeat(oct) : '') + ' - - -';
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export interface VoiceHost {
  /** The app's AudioContext and engine, made and resumed on demand (call from a tap). */
  audio(): { ctx: AudioContext; E: Engine } | null;
  /** Stop whatever the deck is playing. */
  stopMain(): void;
  /** The open song: its Sa as the deck shows it, title, whether it is the user's own, notes. */
  song(): { title: string; own: boolean; parsed: ParsedSong; sa: SaChoice };
  setSongSa(s: SaChoice): void;
  mySa: { get(): SaChoice | undefined; set(s: SaChoice): void };
  range: { get(): VoiceRange | undefined; set(r: VoiceRange): void };
  best: { get(note: number): number | undefined; set(note: number, secs: number): void };
  holdNote: { get(): number; set(c: number): void };
  sound(): SoundSettings;
  script(): Script;
}

export interface VoiceUI {
  render(): void;
  /** Stop listening and playing (another view, or the deck's Play). */
  stop(): void;
}

export function initVoice(host: VoiceHost): VoiceUI {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const view = $('#voice');
  const live = $('#vLive');
  const liveNote = $('#vLiveNote');
  const liveMsg = $('#vLiveMsg');
  const hBox = $('#hBox');
  const hTime = $('#hTime');
  const hMsg = $('#hMsg');
  const hNeedle = $('#hNeedle');
  const hStart = $<HTMLButtonElement>('#hStart');

  let mic: Mic | null = null;
  let raf = 0;
  /** Listening for the lowest or highest note. */
  let range: RangeListener | null = null;
  /** The hold trainer: its own transport (drone and guide), timer and state. */
  let hold: { tr: Transport; tick: number; timer: HoldTimer; from: number; ctx: AudioContext; note: number } | null = null;

  async function openMic(onReading: (r: { t: number; hz: number }) => void): Promise<AudioContext | null> {
    const a = host.audio();
    if (!a) {
      liveMsg.textContent = micProblemText('unsupported');
      return null;
    }
    try {
      mic = await Mic.open(a.ctx, onReading);
      return a.ctx;
    } catch (e) {
      mic = null;
      const msg = micProblemText(e instanceof MicError ? e.problem : 'other');
      liveMsg.textContent = msg;
      hMsg.textContent = msg;
      return null;
    }
  }
  function closeMic(): void {
    mic?.close();
    mic = null;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // ── Range ──────────────────────────────────────────────────────────────────

  async function listen(want: 'low' | 'high'): Promise<void> {
    if (range) return finishRange();
    stopHold();
    host.stopMain();
    range = new RangeListener(want);
    live.hidden = false;
    liveNote.textContent = '';
    liveMsg.textContent = 'Starting the microphone…';
    setRangeButtons();
    const ctx = await openMic((r) => range?.add(r));
    if (!ctx) {
      range = null;
      setRangeButtons();
      return;
    }
    liveMsg.textContent = want === 'low' ? 'Sing down to your lowest comfortable note and hold it for a moment.' : 'Sing up to your highest comfortable note and hold it for a moment.';
    const draw = () => {
      if (!range) return;
      raf = requestAnimationFrame(draw);
      const n = range.now;
      liveNote.textContent = n == null ? '…' : noteName(n);
      if (range.best != null) liveMsg.textContent = (want === 'low' ? 'Lowest' : 'Highest') + ' so far: ' + midiText(range.best) + '. Press Done when you have it.';
    };
    raf = requestAnimationFrame(draw);
  }

  function finishRange(): void {
    const r = range;
    range = null;
    closeMic();
    live.hidden = true;
    if (r && r.best != null) {
      const had = host.range.get() ?? {};
      host.range.set(r.want === 'low' ? { ...had, lo: r.best } : { ...had, hi: r.best });
    }
    setRangeButtons();
    render();
  }

  function setRangeButtons(): void {
    const low = $<HTMLButtonElement>('#vLowBtn');
    const high = $<HTMLButtonElement>('#vHighBtn');
    low.textContent = range?.want === 'low' ? 'Done' : 'Sing my lowest note';
    high.textContent = range?.want === 'high' ? 'Done' : 'Sing my highest note';
    low.classList.toggle('primary', range?.want === 'low');
    high.classList.toggle('primary', range?.want === 'high');
    low.disabled = range?.want === 'high';
    high.disabled = range?.want === 'low';
  }

  // ── Holding a note ─────────────────────────────────────────────────────────

  async function startHold(): Promise<void> {
    if (hold) return finishHold(true);
    if (range) finishRange();
    host.stopMain();
    const note = host.holdNote.get();
    const s = host.song();
    const saHz = 440 * Math.pow(2, (12 * (s.sa.saOct + 1) + s.sa.saKey - 69) / 12);
    hBox.hidden = false;
    $('#hResult').innerHTML = '';
    hMsg.textContent = 'Starting the microphone…';
    hTime.textContent = '0.0 s';
    hNeedle.hidden = true;
    const timer = new HoldTimer(note, saHz);
    let from = Infinity;
    const ctx = await openMic((r) => {
      if (!hold || r.t < hold.from) return;
      const res = hold.timer.add(r);
      if (res) void finishHold(false);
    });
    if (!ctx) return;
    const a = host.audio();
    if (!a) return;
    const user = host.sound();
    const sound: SoundSettings = {
      ...structuredClone(DEFAULT_SOUND),
      guide: 'full', guideLoop: 'first', reeds: user.reeds, beat: 'off', countIn: false, ramp: false,
      droneType: 'tanpura', droneVol: user.droneType === 'tanpura' ? Math.max(0.5, user.droneVol) : 0.5, tanTune: user.tanTune,
    };
    const tr = new Transport(a.E);
    tr.onBeat = (q) => {
      // The guide plays the note for the first four beats; listen from just after it.
      if (from === Infinity && q.raw === 0) {
        from = q.time + 4 + 0.35;
        if (hold) hold.from = from;
      }
    };
    const P = parseSong(holdText(note));
    tr.start({ parsed: P, taal: taalInfo('keherwa'), song: { ...s.sa, tempo: 60, startOn: 1 }, sound }, { from: 0, to: 0, loop: true });
    hold = { tr, tick: window.setInterval(() => tr.tick(), 25), timer, from, ctx, note };
    hStart.textContent = 'Stop';
    const draw = () => {
      if (!hold) return;
      raf = requestAnimationFrame(draw);
      const now = hold.ctx.currentTime;
      if (now < hold.from - 0.35) {
        hMsg.textContent = 'Listen to the note… ' + Math.ceil(hold.from - 0.35 - now);
        return;
      }
      if (now - hold.from > 90) void finishHold(true);
      const t = hold.timer;
      hTime.textContent = t.held().toFixed(1) + ' s';
      const c = t.latest;
      hNeedle.hidden = c == null;
      if (c != null) {
        hNeedle.style.left = 50 + Math.max(-50, Math.min(50, c)) + '%';
        hNeedle.className = 'pn ' + (Math.abs(c) <= 15 ? 'good' : Math.abs(c) <= 35 ? 'ok' : 'off');
      }
      hMsg.textContent = t.started ? (c == null ? 'Holding…' : Math.abs(c) <= 15 ? 'In tune' : Math.round(Math.abs(c)) + ' cents ' + (c > 0 ? 'sharp' : 'flat')) : 'Now breathe in, and sing the note as long as you can.';
    };
    raf = requestAnimationFrame(draw);
  }

  function stopHold(): void {
    if (!hold) return;
    const h = hold;
    hold = null;
    clearInterval(h.tick);
    h.tr.stop();
    closeMic();
    hStart.textContent = '▶ Start';
  }

  /** The hold has ended (or Stop was pressed): show how it went and keep the longest. */
  function finishHold(pressed: boolean): void {
    if (!hold) return;
    const h = hold;
    const res = pressed ? h.timer.finish() : h.timer.result;
    stopHold();
    if (!res) {
      hMsg.textContent = 'No note was heard. Press Start, listen, then sing.';
      return;
    }
    hMsg.textContent = '';
    hTime.textContent = res.secs.toFixed(1) + ' s';
    hNeedle.hidden = true;
    const best = host.best.get(h.note);
    $('#hResult').innerHTML = holdResultHTML(res, best);
    if (best == null || res.secs > best) host.best.set(h.note, Math.round(res.secs * 10) / 10);
    renderBest();
  }

  function renderBest(): void {
    const b = host.best.get(host.holdNote.get());
    $('#hBest').textContent = b != null ? 'Your longest on this note: ' + b.toFixed(1) + ' s' : '';
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  function render(): void {
    if (view.hidden) return;
    const r = host.range.get();
    $('#vLow').textContent = r?.lo != null ? midiText(r.lo) : '–';
    $('#vHigh').textContent = r?.hi != null ? midiText(r.hi) : '–';
    const s = host.song();
    $('#vResult').innerHTML = r?.lo != null && r.hi != null
      ? rangeResultHTML({ lo: r.lo, hi: r.hi }, host.script(), host.mySa.get(), { title: s.title, own: s.own, span: songSpan(s.parsed), sa: s.sa })
      : '<p class="phint">Sing both notes to see your Sa.</p>';
    $('#hSa').textContent = 'Sa is ' + saText(s.sa) + ', as on the deck above.';
    $<HTMLSelectElement>('#hNote').value = String(host.holdNote.get());
    renderBest();
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  $<HTMLSelectElement>('#hNote').innerHTML = HOLD_NOTES.map(([c, n]) => '<option value="' + c + '">' + n + '</option>').join('');
  $('#vLowBtn').addEventListener('click', () => void (range ? finishRange() : listen('low')));
  $('#vHighBtn').addEventListener('click', () => void (range ? finishRange() : listen('high')));
  $('#vDone').addEventListener('click', finishRange);
  hStart.addEventListener('click', () => void (hold ? finishHold(true) : startHold()));
  $('#hNote').addEventListener('change', (e) => {
    host.holdNote.set(+(e.target as HTMLSelectElement).value);
    renderBest();
  });
  $('#vResult').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-act]');
    if (!b) return;
    const sa = { saKey: +b.dataset.key!, saOct: +b.dataset.oct! };
    if (b.dataset.act === 'mysa') host.mySa.set(sa);
    else host.setSongSa(sa);
    render();
  });

  return {
    render,
    stop() {
      if (range) finishRange();
      stopHold();
    },
  };
}

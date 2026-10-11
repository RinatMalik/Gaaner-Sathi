/**
 * The keyboard (docs/ENGINE.md → MIDI keyboards): which key to press for
 * each note, drawn on the Practice view; and a MIDI keyboard, connected in the Sound settings,
 * whose keys type notes into the editor and which can play the guide in its own sound. The
 * HTML builders are pure and tested in Node.
 */
import { allOff, keyToNote, Midi, MidiError, midiProblemText, noteOff, noteOn, programChange, toPerformanceTime, type GuideSound } from '../audio/midi';
import type { GuideLevel } from '../audio/sound';
import type { Transport } from '../audio/transport';
import { noteToken } from '../core/notation/edit';
import type { Script } from './view';
import { esc, KEYS } from './view';

const BLACK = new Set([1, 3, 6, 8, 10]);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The keys to draw for notes from `lo` to `hi` (MIDI numbers): whole octaves, C to B. */
export function keyRange(lo: number, hi: number): [number, number] {
  const a = lo - mod(lo, 12);
  let b = hi + (11 - mod(hi, 12));
  if (b - a < 23) b = a + 23; // at least two octaves
  return [a, b];
}

/** A keyboard from `lo` to `hi` (MIDI numbers, lo a C and hi a B), with each Sa marked. */
export function keyboardHTML(lo: number, hi: number, sa: number): string {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!BLACK.has(mod(m, 12))) whites.push(m);
  const w = 100 / whites.length;
  let html = '<div class="kb" role="img" aria-label="Keyboard, with the key to press">';
  for (const m of whites) html += '<span class="kw' + (mod(m - sa, 12) === 0 ? ' sa' : '') + '" data-m="' + m + '"></span>';
  whites.forEach((m, i) => {
    if (m + 1 <= hi && BLACK.has(mod(m + 1, 12))) {
      html += '<span class="kbk' + (mod(m + 1 - sa, 12) === 0 ? ' sa' : '') + '" data-m="' + (m + 1) + '" style="left:' + ((i + 1) * w - w * 0.3).toFixed(3) + '%;width:' + (w * 0.6).toFixed(3) + '%"></span>';
    }
  });
  return html + '</div>';
}

/** A key's name as on a keyboard: "D4 · White 2" (the CT-X3000 counts keys from C). */
export function keyName(m: number): string {
  const r = Math.round(m);
  const k = KEYS[mod(r, 12)];
  return (k ? k[0] : '?') + (Math.floor(r / 12) - 1) + (k ? ' · ' + k[1] : '');
}

// ── Wiring ───────────────────────────────────────────────────────────────────

export type GuideRoute = 'app' | 'kb' | 'both';

export interface KeyboardHost {
  /** The open song's Sa, as a MIDI number. */
  saMidi(): number;
  /** The editor is showing: keys played type notes into it. */
  editorOpen(): boolean;
  type(token: string): void;
  script(): Script;
  /** The guide's level as played (Full, Soft, Off). */
  guide(): GuideLevel;
  audio(): AudioContext | null;
  prefs: {
    get(): { route: GuideRoute; sound: GuideSound; out?: string };
    set(p: { route: GuideRoute; sound: GuideSound; out?: string }): void;
  };
}

export interface KeyboardUI {
  /** Before the transport starts: route the guide (and choose the keyboard's sound). */
  playStarting(T: Transport): void;
  playStopped(): void;
}

export function initKeyboard(host: KeyboardHost): KeyboardUI {
  const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
  const btn = $<HTMLButtonElement>('#midiBtn');
  const status = $('#midiStatus');
  const opts = $('#midiOpts');
  const outSel = $<HTMLSelectElement>('#midiOut');
  const hint = $('#kbHint');
  let midi: Midi | null = null;
  /** Keys pressed together (an octave, a chord): the highest is typed. */
  let chord: { note: number; at: number } | null = null;
  let chordTimer = 0;

  const out = (): string | null => {
    if (!midi) return null;
    const list = midi.outputs();
    const want = host.prefs.get().out;
    return (list.find((o) => o.id === want) ?? list[0])?.id ?? null;
  };

  function render(): void {
    const p = host.prefs.get();
    const ins = midi?.inputs() ?? [];
    const outs = midi?.outputs() ?? [];
    btn.hidden = !!midi;
    opts.hidden = !midi;
    status.textContent = !midi ? '' : ins.length || outs.length ? 'Connected: ' + Array.from(new Set([...ins, ...outs].map((x) => x.name))).join(', ') : 'No keyboard found yet. Connect it with a USB cable (the keyboard’s USB port that goes to a computer), and it shows up here.';
    for (const b of document.querySelectorAll<HTMLElement>('#midiRoute button')) b.setAttribute('aria-pressed', String(b.dataset.v === p.route));
    $<HTMLSelectElement>('#midiSound').value = p.sound;
    outSel.hidden = outs.length < 2;
    outSel.innerHTML = outs.map((o) => '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>').join('');
    const o = out();
    if (o) outSel.value = o;
    hint.hidden = !ins.length;
  }

  async function connect(): Promise<void> {
    try {
      midi = await Midi.open();
    } catch (e) {
      midi = null;
      status.textContent = midiProblemText(e instanceof MidiError ? e.problem : 'other');
      return;
    }
    midi.onChange = render;
    midi.onKey = onKey;
    render();
  }

  function onKey(note: number): void {
    if (!host.editorOpen()) return;
    const now = performance.now();
    if (chord && now - chord.at < 40) {
      chord.note = Math.max(chord.note, note);
      return;
    }
    chord = { note, at: now };
    clearTimeout(chordTimer);
    chordTimer = window.setTimeout(() => {
      const c = chord;
      chord = null;
      if (!c) return;
      const n = keyToNote(c.note, host.saMidi());
      if (!n) {
        hint.textContent = 'That key is more than two octaves from Sa, beyond what the player writes.';
        return;
      }
      hint.textContent = 'Play your keyboard: each key you press is a beat. Add holds with Hold −.';
      host.type(noteToken(n.semi, n.oct, host.script()));
    }, 45);
  }

  /** Every note the keyboard should stop (now, and again once anything already queued has
   * gone out: a stopped song may have queued notes up to a fifth of a second ahead). */
  function silence(): void {
    const o = out();
    if (!midi || !o) return;
    for (const m of allOff(0)) midi.send(o, m);
    const at = performance.now() + 250;
    for (const m of allOff(0)) midi.send(o, m, at);
  }

  btn.addEventListener('click', () => void connect());
  $('#midiRoute').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button[data-v]');
    if (!b) return;
    const v = b.dataset.v === 'kb' || b.dataset.v === 'both' ? b.dataset.v : 'app';
    host.prefs.set({ ...host.prefs.get(), route: v });
    if (v === 'app') silence();
    render();
  });
  $('#midiSound').addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value;
    host.prefs.set({ ...host.prefs.get(), sound: v === 'organ' || v === 'accordion' ? v : 'keep' });
  });
  outSel.addEventListener('change', () => host.prefs.set({ ...host.prefs.get(), out: outSel.value }));

  // A keyboard allowed before connects again by itself (no question asked).
  try {
    void navigator.permissions?.query({ name: 'midi' as PermissionName }).then((s) => {
      if (s.state === 'granted' && Midi.supported()) void connect();
    }).catch(() => {});
  } catch {
    // no permissions API
  }
  if (!Midi.supported()) {
    btn.disabled = true;
    status.textContent = midiProblemText('unsupported');
  }
  render();

  return {
    playStarting(T: Transport) {
      const p = host.prefs.get();
      const o = out();
      const kb = !!midi && !!o && p.route !== 'app';
      T.localGuide = !kb || p.route === 'both';
      T.onNote = null;
      if (!kb) return;
      for (const m of programChange(0, p.sound)) midi!.send(o!, m);
      const ctx = host.audio();
      if (!ctx) return;
      /** The clocks read together: when a context time is heard, on the performance clock. Just
       * after the context starts the reading is zeros, then drifts by some 30 ms over its first
       * 20 ms of sound (measured in Edge), so notes wait until it has settled (they are
       * scheduled a tenth of a second ahead); after 150 ms the device's own latency figure
       * stands in. */
      const clocks = (late: boolean): ((x: number) => number) | null => {
        const s = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
        if (s && s.contextTime != null && s.contextTime >= 0.02 && s.performanceTime) return (x) => toPerformanceTime(x, { contextTime: s.contextTime!, performanceTime: s.performanceTime! });
        return late ? (x) => performance.now() + (x - ctx.currentTime + (ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000 : null;
      };
      const waiting: [number, number, number, number][] = [];
      let since = 0;
      const send = (perf: (x: number) => number, [t, dur, note, vel]: [number, number, number, number]) => {
        midi!.send(o!, noteOn(0, note, vel), perf(t));
        midi!.send(o!, noteOff(0, note), perf(t + Math.max(0.05, dur - 0.025)));
      };
      const flush = () => {
        const perf = clocks(performance.now() - since > 150);
        if (!perf) {
          window.setTimeout(flush, 8);
          return;
        }
        for (const n of waiting.splice(0)) send(perf, n);
      };
      T.onNote = (t, dur, note) => {
        const lvl = host.guide();
        if (lvl === 'off' || !midi) return;
        const n: [number, number, number, number] = [t, dur, note, lvl === 'soft' ? 50 : 100];
        const perf = waiting.length ? null : clocks(false);
        if (perf) return send(perf, n);
        if (!waiting.length) {
          since = performance.now();
          window.setTimeout(flush, 8);
        }
        waiting.push(n);
      };
    },
    playStopped() {
      if (host.prefs.get().route !== 'app') silence();
    },
  };
}

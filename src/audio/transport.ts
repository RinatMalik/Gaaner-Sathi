/**
 * The transport (docs/ENGINE.md → One clock, Transport): one clock drives the rhythm, the
 * guide melody and the highlight. tick() runs every 25 ms and schedules everything due in
 * the next 160 ms on the AudioContext's clock; each matra schedules its rhythm hits, its
 * guide notes and a display entry. The tanpura keeps its own free rhythm on the same tick.
 *
 * It reads the song, taal and settings live through `PlaySource`, as the prototype read
 * its globals, so a change made while playing takes effect on the next beat. A song whose
 * sections change taal (taal pherta) gives each beat its own taal through `taalAt`: the
 * rhythm, the taal beat shown and the count-in all follow it.
 */
import type { NoteEvent, ParsedSong } from '../core/notation/types';
import { activeLayers, rhythmTable, SPEEDS } from '../core/taal/rhythm';
import type { TaalInfo } from '../core/taal/taals';
import { noteFreq, saFreq, saMidi, tablaPitch, type SaKey } from './dsp/pitch';
import { liveGain, type Engine } from './engine';
import { applyReedTone, reed, reedSet, startDrone } from './instruments/harmonium';
import { crash, finalHit, playHit } from './instruments/percussion';
import { makeTanBufs, pluck, TAN_GAPS } from './instruments/tanpura';
import { endSession, makeSession, type Session } from './session';
import { beatLevel, droneLevels, guideLevel, type SoundSettings } from './sound';

/** What the transport plays from. Fields are read live. */
export interface PlaySource {
  parsed: ParsedSong;
  taal: TaalInfo;
  song: SaKey & { tempo: number; startOn: number };
  sound: SoundSettings;
  /** The tempo for a song beat, when sections have their own (absent: the song's tempo). */
  tempoAt?(s: number): number;
  /** The taal of a song beat and where its cycle counts from (taal beat (s + off) mod
   * cycle), when sections have their own (absent: `taal` from startOn throughout). */
  taalAt?(s: number): { T: TaalInfo; off: number };
}

/** A scheduled matra, for the highlight: s is the song beat (negative or before the
 * section during the count-in), pass the loop round (−1 in the count-in), p the taal beat. */
export interface BeatEntry {
  time: number;
  s: number;
  raw: number;
  p: number;
  pass: number;
  tempo: number;
  guide: boolean;
}
/** The end of the song: the taal beat it stopped on. */
export interface EndEntry {
  time: number;
  end: true;
  p: number;
}
export type DisplayEntry = BeatEntry | EndEntry;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Transport {
  playing = false;
  sess: Session | null = null;
  /** First and one-past-last beat of the section being played, and its length. */
  secStart = 0;
  secEnd = 0;
  secLen = 1;
  loop = false;
  /** With a loop: stop after this many rounds (0 loops on until stopped). */
  rounds = 0;
  /** Display entries waiting for their time. */
  queue: DisplayEntry[] = [];
  /** When the song has ended: the time playback should stop. */
  endAt = 0;
  /** Told of each matra as it is scheduled, with its seconds per beat (pitch feedback). */
  onBeat: ((q: BeatEntry, spb: number) => void) | null = null;
  /** Told of each guide note as it is scheduled: its time, length (seconds) and MIDI note
   * (a keyboard plays it). `localGuide` false leaves the harmonium out. */
  onNote: ((t: number, dur: number, note: number) => void) | null = null;
  localGuide = true;
  private src!: PlaySource;
  private t = 0;
  private nextTime = 0;
  private s0 = 0;
  private carry: NoteEvent[] = [];
  private afterFill = false;
  private tanNext = 0;
  private tanStep = 0;

  /** `later` runs the session's clean-up after it fades out (tests run it on demand). */
  constructor(
    readonly E: Engine,
    private readonly later: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms),
  ) {}

  private startOff(): number {
    return this.src.song.startOn - 1;
  }

  /** The taal of song beat s, and its offset. */
  private taalOf(s: number): { T: TaalInfo; off: number } {
    return this.src.taalAt ? this.src.taalAt(s) : { T: this.src.taal, off: this.startOff() };
  }

  /**
   * Start playing from note line `from` (and loop to line `to`, for `rounds` rounds if
   * given). Count-in: one cycle plus any pickup, always starting at sam. Returns the lines
   * used and the count-in length in beats, or null when there is nothing to play.
   */
  start(src: PlaySource, opts: { from: number; to: number; loop: boolean; rounds?: number }, now: number = this.E.ctx.currentTime): { from: number; to: number; pre: number } | null {
    const L = src.parsed.noteLines;
    if (!L.length) return null;
    if (this.playing) this.stop();
    this.src = src;
    const from = clamp(opts.from, 0, L.length - 1);
    this.loop = opts.loop;
    this.rounds = opts.loop && opts.rounds && opts.rounds > 0 ? Math.floor(opts.rounds) : 0;
    let to = clamp(opts.to, 0, L.length - 1);
    if (to < from) to = from;
    this.secStart = L[from]!.start;
    this.secEnd = this.loop ? L[to]!.end : src.parsed.total;
    this.secLen = Math.max(1, this.secEnd - this.secStart);
    const at = this.taalOf(this.secStart);
    const cyc = at.T.cycle;
    const pos = mod(this.secStart + at.off, cyc);
    const pre = pos + (src.sound.countIn ? cyc : 0);
    this.s0 = this.secStart - pre;
    this.t = 0;
    this.queue = [];
    this.endAt = 0;
    this.afterFill = false;
    this.carry = src.parsed.events.filter((e) => e.start < this.secStart - 1e-9 && e.start + e.dur > this.secStart + 1e-9);
    const sess = makeSession(this.E, src.sound, saFreq(src.song));
    this.sess = sess;
    startDrone(this.E, sess, saFreq(src.song));
    this.tanNext = 0;
    this.tanStep = 0;
    if (src.sound.droneType === 'tanpura') sess.tanBufs = makeTanBufs(this.E, saFreq(src.song), src.sound.tanTune);
    this.nextTime = now + 0.12;
    this.playing = true;
    this.tick(now);
    return { from, to, pre };
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.sess) endSession(this.E, this.sess, this.later);
    this.sess = null;
    this.queue = [];
    this.endAt = 0;
  }

  /** Tempo trainer: each new round of a loop gets faster by rampStep, never past rampMax.
   * `beat` is the song beat, for a section's own tempo (the count-in takes the first beat's). */
  liveTempo(pass: number, beat: number = this.secStart): number {
    const base = this.src.tempoAt ? this.src.tempoAt(Math.max(beat, this.secStart)) : this.src.song.tempo;
    const s = this.src.sound;
    if (!s.ramp || !this.loop || pass < 1) return base;
    return Math.max(base, Math.min(s.rampMax, base + s.rampStep * pass));
  }

  /** Guide on repeats: every round, the first round only, or every other round. */
  guideOn(pass: number): boolean {
    if (pass < 0) return false;
    const gl = this.src.sound.guideLoop;
    if (!this.loop || gl === 'all') return true;
    return gl === 'first' ? pass === 0 : pass % 2 === 0;
  }

  /** Schedule everything due in the next 160 ms. */
  tick(now: number = this.E.ctx.currentTime): void {
    if (!this.playing || this.endAt) return;
    this.scheduleTanpura(now);
    while (this.nextTime < now + 0.16) {
      const raw = this.s0 + this.t;
      let s = raw;
      let pass = -1;
      if (raw >= this.secStart) {
        const k = raw - this.secStart;
        if (this.loop) {
          pass = Math.floor(k / this.secLen);
          s = this.secStart + (k % this.secLen);
        } else pass = 0;
      }
      const spb = 60 / this.liveTempo(pass, s);
      const roundsDone = this.rounds > 0 && raw >= this.secStart + this.rounds * this.secLen;
      if ((!this.loop && raw >= this.secEnd) || roundsDone) {
        const e = roundsDone ? this.secStart : raw;
        const at = this.taalOf(e);
        const p = mod(e + at.off, at.T.cycle);
        if (p === 0) finalHit(this.E, this.sess!, this.nextTime, this.src.sound.beat);
        this.queue.push({ time: this.nextTime, end: true, p });
        this.endAt = this.nextTime + 1.3;
        return;
      }
      // The count-in is in the taal of the beat it leads to.
      const at = this.taalOf(raw < this.secStart ? this.secStart : s);
      this.scheduleBeat(this.nextTime, s, raw, pass, spb, at);
      this.nextTime += spb;
      this.t++;
    }
  }

  /** The latest display entry whose time has come (older ones are dropped), or null. */
  takeDue(now: number): DisplayEntry | null {
    let cur: DisplayEntry | null = null;
    while (this.queue.length && this.queue[0]!.time <= now) cur = this.queue.shift()!;
    return cur;
  }

  private scheduleBeat(time: number, s: number, raw: number, pass: number, spb: number, at: { T: TaalInfo; off: number }): void {
    const sess = this.sess!;
    const p = mod(s + at.off, at.T.cycle);
    this.scheduleRhythm(time, s, pass, spb, p, at);
    if (this.guideOn(pass)) {
      const evs: { start: number; dur: number; semi: number; oct: number }[] = (this.src.parsed.byBeat[s] || []).slice();
      if (s === this.secStart) for (const e of this.carry) evs.push({ start: this.secStart, dur: e.start + e.dur - this.secStart, semi: e.semi, oct: e.oct });
      for (const e of evs) {
        let d = e.dur;
        if (this.loop) d = Math.min(d, this.secEnd - e.start);
        if (d <= 0) continue;
        const at = time + (e.start - s) * spb;
        if (this.localGuide) reed(this.E, sess, reedSet(this.src.sound.reeds), at, d * spb, noteFreq(this.src.song, e), 0.32);
        this.onNote?.(at, d * spb, saMidi(this.src.song) + e.semi + 12 * e.oct);
      }
    }
    const q: BeatEntry = { time, s, raw, p, pass, tempo: Math.round(60 / spb), guide: this.guideOn(pass) };
    this.queue.push(q);
    this.onBeat?.(q, spb);
  }

  private scheduleRhythm(time: number, s: number, pass: number, spb: number, p: number, at: { T: TaalInfo; off: number }): void {
    const sound = this.src.sound;
    const st = sound.beat;
    if (st === 'off') return;
    const R = rhythmTable(st, at.T.id, SPEEDS[sound.speed] || 1, activeLayers(sound.layers, st));
    const cycNo = Math.floor((s + at.off) / R.cyc);
    if (p === 0 && this.afterFill) {
      this.afterFill = false;
      if (st === 'kit') crash(this.E, this.sess!, time, 0.8);
    }
    const inFill = !!(sound.fills && R.fill && p >= R.fillFrom && (pass < 0 || mod(cycNo, 4) === 3));
    const hits = inFill ? R.fill![p] : R.slots[R.W > R.cyc ? mod(cycNo, 2) * R.cyc + p : p];
    if (inFill) this.afterFill = true;
    for (const h of hits || []) playHit(this.E, this.sess!, h, time + h.frac * spb);
  }

  private scheduleTanpura(now: number): void {
    const sess = this.sess;
    const sound = this.src.sound;
    if (!sess || sound.droneType !== 'tanpura' || sound.droneVol <= 0) {
      this.tanNext = 0;
      return;
    }
    if (!sess.tanBufs) sess.tanBufs = makeTanBufs(this.E, saFreq(this.src.song), sound.tanTune);
    if (!this.tanNext || this.tanNext < now) {
      this.tanNext = now + 0.05;
      this.tanStep = 0;
    }
    while (this.tanNext < now + 0.3) {
      pluck(this.E, sess, sess.tanBufs[this.tanStep]!, this.tanNext);
      this.tanNext += TAN_GAPS[this.tanStep]! * (1 + (this.E.rand() - 0.5) * 0.03);
      this.tanStep = (this.tanStep + 1) % 4;
    }
  }

  // ── Live controls while playing ─────────────────────────────────────────────

  /** The guide level (Full, Soft, Off) changed. */
  applyGuide(): void {
    if (this.sess) liveGain(this.E, this.sess.mel, guideLevel(this.src.sound));
  }

  /** The rhythm style or volume changed. */
  applyBeatLevel(): void {
    if (this.sess) liveGain(this.E, this.sess.tab, beatLevel(this.src.sound));
  }

  /** The drone type or volume changed. */
  applyDrone(): void {
    if (!this.sess) return;
    const dl = droneLevels(this.src.sound);
    liveGain(this.E, this.sess.dr, dl.harm);
    liveGain(this.E, this.sess.tb, dl.tan);
  }

  /** The melody chain's tone after the number of reeds changes. */
  applyReeds(): void {
    applyReedTone(this.E, this.sess, reedSet(this.src.sound.reeds));
  }

  /** New Sa: retune the drone and tabla now; the tanpura strings re-render on the next tick. */
  retune(): void {
    if (!this.sess) return;
    const sa = saFreq(this.src.song);
    const now = this.E.ctx.currentTime;
    this.sess.drone.forEach((d) => d.o.frequency.setTargetAtTime(sa * d.r, now, 0.05));
    this.sess.tf = tablaPitch(sa);
    this.sess.tanBufs = null;
  }

  /** The tanpura's first string changed: re-render the strings on the next tick. */
  resetTanpura(): void {
    if (this.sess) this.sess.tanBufs = null;
  }
}

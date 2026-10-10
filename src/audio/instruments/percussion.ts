/**
 * Synthesised percussion (docs/ENGINE.md → Rhythm engine): tabla bols, click, drum kit,
 * dholak and the extra layers. Every voice is ported from the prototype statement by
 * statement; tests compare the Web Audio calls with the prototype's.
 */
import type { Hit } from '../../core/taal/rhythm';
import type { Engine } from '../engine';
import type { Session } from '../session';

/** A burst of filtered noise from the shared noise buffer, at a random offset. */
function noiseHit(E: Engine, out: AudioNode, t: number, type: BiquadFilterType, fc: number, q: number, amp: number, dur: number): void {
  const ctx = E.ctx;
  const n = ctx.createBufferSource();
  n.buffer = E.noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = fc;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(amp, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
  n.loop = true;
  n.connect(f);
  f.connect(g);
  g.connect(out);
  n.start(t, E.rand() * 0.5);
  n.stop(t + dur + 0.03);
}

/** Dayan strokes: partials [harmonic, level, decay] and a noise click [Hz, level, decay]. */
const DAYAN: Record<string, { p: [number, number, number][]; nz: [number, number, number] }> = {
  na: { p: [[1, 0.45, 0.16], [2, 0.85, 0.13], [3, 0.5, 0.09], [4, 0.3, 0.06], [5, 0.16, 0.045]], nz: [3400, 0.45, 0.012] },
  tin: { p: [[1, 0.9, 0.28], [2, 0.45, 0.18], [3, 0.2, 0.11], [4, 0.08, 0.07]], nz: [2600, 0.28, 0.01] },
  tun: { p: [[1, 1, 0.45], [2, 0.25, 0.2]], nz: [1800, 0.22, 0.01] },
  te: { p: [[2, 0.25, 0.025], [3, 0.15, 0.02]], nz: [2200, 0.65, 0.03] },
};

function dayan(E: Engine, sess: Session, t: number, kind: string, vel: number): void {
  const ctx = E.ctx;
  const f = sess.tf;
  const sp = DAYAN[kind] || DAYAN.na!;
  const out = ctx.createGain();
  out.gain.value = vel * 0.36;
  out.connect(sess.tab);
  for (const [h, a, tc] of sp.p) {
    const o = ctx.createOscillator();
    o.frequency.value = f * h * (1 + (h - 1) * 0.003);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.0025);
    g.gain.setTargetAtTime(0, t + 0.003, tc);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + tc * 7 + 0.02);
  }
  noiseHit(E, out, t, 'bandpass', sp.nz[0], 1.1, sp.nz[1], sp.nz[2]);
}

/** Bayan: open (Ge) glides 74 → 92 → 84 Hz; closed (Ke) is a noise slap with a thump. */
function bayan(E: Engine, sess: Session, t: number, open: boolean, vel: number): void {
  const ctx = E.ctx;
  const out = ctx.createGain();
  out.gain.value = vel * (open ? 0.6 : 0.45);
  out.connect(sess.tab);
  if (open) {
    [[1, 1, 0.2], [2, 0.45, 0.12], [3, 0.18, 0.07]].forEach(([h, a, tc]) => {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(74 * h!, t);
      o.frequency.linearRampToValueAtTime(92 * h!, t + 0.05);
      o.frequency.setTargetAtTime(84 * h!, t + 0.05, 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a!, t + 0.005);
      g.gain.setTargetAtTime(0, t + 0.006, tc!);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + tc! * 7 + 0.03);
    });
    noiseHit(E, out, t, 'lowpass', 400, 0.7, 0.35, 0.02);
  } else {
    noiseHit(E, out, t, 'bandpass', 700, 0.9, 0.9, 0.045);
    const o = ctx.createOscillator();
    o.frequency.value = 130;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.setTargetAtTime(0, t + 0.002, 0.025);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }
}

/** Which drum strokes make each bol. The second line came with Tagore's taals (2026-10-10),
 * whose thekas include mridanga bols: Den like Dhin, Di like Tin, Ga and Ghe the open bayan. */
const STROKES: Record<string, string[]> = {
  dha: ['na', 'ge'], dhin: ['tin', 'ge'], dhi: ['tin', 'ge'], na: ['na'], ta: ['na'], tin: ['tin'],
  ti: ['te'], te: ['te'], ra: ['te'], ge: ['ge'], ke: ['ke'], ka: ['ke'], ki: ['ke'], kat: ['ke'], tu: ['tun'], tun: ['tun'],
  den: ['tin', 'ge'], di: ['tin'], tet: ['te'], ga: ['ge'], ghe: ['ge'], ne: ['na'],
};

/** The strokes a bol is played with, or null for a bol with none of its own (played as Na). */
export function bolStrokes(bol: string): readonly string[] | null {
  const key = String(bol).toLowerCase();
  return (Object.hasOwn(STROKES, key) ? STROKES[key] : null) || null;
}

export function stroke(E: Engine, sess: Session, t: number, bol: string, vel: number): void {
  for (const s of bolStrokes(bol) || ['na']) {
    if (s === 'ge') bayan(E, sess, t, true, vel);
    else if (s === 'ke') bayan(E, sess, t, false, vel);
    else dayan(E, sess, t, s, vel);
  }
}

/** Metronome click: high on sam, middle on vibhag starts, low otherwise. */
export function click(E: Engine, sess: Session, t: number, lvl: number): void {
  const ctx = E.ctx;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = lvl === 2 ? 1568 : lvl === 1 ? 1175 : 880;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lvl === 2 ? 0.8 : 0.5, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(g);
  g.connect(sess.tab);
  o.start(t);
  o.stop(t + 0.1);
}

function voiceBus(E: Engine, sess: Session, level: number): GainNode {
  const g = E.ctx.createGain();
  g.gain.value = level;
  g.connect(sess.tab);
  return g;
}

function kick(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.72);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.012, 0.11);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.75);
  noiseHit(E, out, t, 'highpass', 3000, 0.7, 0.16, 0.008);
}

function snare(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.6);
  noiseHit(E, out, t, 'highpass', 1300, 0.5, 0.7, 0.17);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(230, t);
  o.frequency.exponentialRampToValueAtTime(175, t + 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.setTargetAtTime(0, t + 0.004, 0.04);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.3);
}

function hat(E: Engine, sess: Session, t: number, vel: number, open: boolean): void {
  noiseHit(E, voiceBus(E, sess, vel * 0.3), t, 'highpass', 7500, 0.6, 1, open ? 0.3 : 0.035);
}

export function crash(E: Engine, sess: Session, t: number, vel: number): void {
  noiseHit(E, voiceBus(E, sess, vel * 0.32), t, 'highpass', 4200, 0.5, 1, 1.6);
}

function dholBass(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.62);
  [[1, 1, 0.22], [2, 0.35, 0.1], [3, 0.12, 0.06]].forEach(([h, a, tc]) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(66 * h!, t);
    o.frequency.linearRampToValueAtTime(96 * h!, t + 0.07);
    o.frequency.setTargetAtTime(90 * h!, t + 0.07, 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a!, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.006, tc!);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + tc! * 7 + 0.03);
  });
  noiseHit(E, out, t, 'lowpass', 500, 0.7, 0.4, 0.02);
}

function dholClosed(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.55);
  noiseHit(E, out, t, 'bandpass', 900, 1, 0.9, 0.05);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(105, t + 0.04);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.setTargetAtTime(0, t + 0.002, 0.03);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

function dholTreble(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.36);
  [[1, 0.8, 0.09], [1.58, 0.45, 0.06], [2.31, 0.25, 0.04]].forEach(([h, a, tc]) => {
    const o = ctx.createOscillator();
    o.frequency.value = 560 * h!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a!, t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.003, tc!);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + tc! * 7 + 0.02);
  });
  noiseHit(E, out, t, 'bandpass', 3200, 1.2, 0.55, 0.025);
}

function tom(E: Engine, sess: Session, t: number, vel: number, f: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.6);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.45, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.01, 0.13);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + 0.9);
  noiseHit(E, out, t, 'bandpass', 1600, 0.8, 0.25, 0.02);
}

function manjira(E: Engine, sess: Session, t: number, vel: number, open: boolean): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.13);
  [[1, 1], [1.48, 0.7], [2.13, 0.5], [2.76, 0.35], [3.61, 0.22]].forEach(([r, a]) => {
    const o = ctx.createOscillator();
    o.frequency.value = 1650 * r!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a!, t + 0.001);
    g.gain.setTargetAtTime(0, t + 0.002, open ? 0.22 : 0.018);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + (open ? 1.6 : 0.15));
  });
  noiseHit(E, out, t, 'highpass', 6000, 0.7, 0.6, open ? 0.12 : 0.025);
}

function shaker(E: Engine, sess: Session, t: number, vel: number): void {
  noiseHit(E, voiceBus(E, sess, vel * 0.22), t, 'bandpass', 6500, 1.4, 1, 0.045);
}

function kartal(E: Engine, sess: Session, t: number, vel: number): void {
  const out = voiceBus(E, sess, vel * 0.3);
  noiseHit(E, out, t, 'bandpass', 2300, 2.5, 1, 0.025);
  noiseHit(E, out, t + 0.004, 'highpass', 7000, 0.7, 0.45, 0.07);
}

function ghungroo(E: Engine, sess: Session, t: number, vel: number, shake: boolean): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.16);
  [5100, 6350, 7420, 8900].forEach((f, i) => {
    const t0 = t + i * (shake ? 0.018 : 0.006);
    const o = ctx.createOscillator();
    o.frequency.value = f * (1 + (E.rand() - 0.5) * 0.01);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.002);
    g.gain.setTargetAtTime(0, t0 + 0.003, shake ? 0.09 : 0.035);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + (shake ? 0.6 : 0.25));
  });
  noiseHit(E, out, t, 'highpass', 8000, 0.7, 0.7, shake ? 0.22 : 0.06);
}

function tambourine(E: Engine, sess: Session, t: number, vel: number, hit: boolean): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.22);
  noiseHit(E, out, t, 'bandpass', 9000, 0.9, 1, hit ? 0.22 : 0.09);
  noiseHit(E, out, t, 'highpass', 6000, 0.7, 0.5, hit ? 0.14 : 0.05);
  if (hit) {
    const o = ctx.createOscillator();
    o.frequency.value = 230;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.setTargetAtTime(0, t + 0.002, 0.03);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }
}

function claps(E: Engine, sess: Session, t: number, vel: number): void {
  const out = voiceBus(E, sess, vel * 0.42);
  [0, 0.011, 0.023].forEach((d, i) => noiseHit(E, out, t + d, 'bandpass', 1150, 1.1, i === 2 ? 1 : 0.7, i === 2 ? 0.14 : 0.012));
}

function cowbell(E: Engine, sess: Session, t: number, vel: number): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.16);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 820;
  bp.Q.value = 2.2;
  bp.connect(out);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.002);
  g.gain.setTargetAtTime(0.25, t + 0.004, 0.02);
  g.gain.setTargetAtTime(0, t + 0.05, 0.09);
  g.connect(bp);
  [540, 800].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);
  });
}

function conga(E: Engine, sess: Session, t: number, vel: number, kind: string): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.5);
  const f = kind === 'cgL' ? 205 : 310;
  const dec = kind === 'cgM' ? 0.04 : kind === 'cgS' ? 0.05 : 0.2;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f * 1.15, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.004, dec);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dec * 8 + 0.05);
  if (kind === 'cgS') noiseHit(E, out, t, 'bandpass', 2200, 1, 0.8, 0.04);
  else noiseHit(E, out, t, 'bandpass', 1200, 1, 0.25, 0.015);
}

function ride(E: Engine, sess: Session, t: number, vel: number, bell: boolean): void {
  const ctx = E.ctx;
  const out = voiceBus(E, sess, vel * 0.14);
  [[2950, 1], [4460, 0.7], [6380, 0.45]].forEach(([f, a]) => {
    const o = ctx.createOscillator();
    o.frequency.value = f!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a! * (bell ? 1 : 0.45), t + 0.002);
    g.gain.setTargetAtTime(0, t + 0.003, bell ? 0.35 : 0.18);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 1.8);
  });
  noiseHit(E, out, t, 'highpass', 5500, 0.6, 0.6, bell ? 0.4 : 0.3);
}

/** Play one hit from a rhythm table on its lane's voice. */
export function playHit(E: Engine, sess: Session, h: Hit, t: number): void {
  switch (h.lane) {
    case 'bol': stroke(E, sess, t, h.bol!, h.vel); break;
    case 'click': click(E, sess, t, h.lvl!); break;
    case 'k': kick(E, sess, t, h.vel); break;
    case 's': snare(E, sess, t, h.vel); break;
    case 'h': hat(E, sess, t, h.vel, false); break;
    case 'o': hat(E, sess, t, h.vel, true); break;
    case 'tH': tom(E, sess, t, h.vel, 210); break;
    case 'tM': tom(E, sess, t, h.vel, 150); break;
    case 'tL': tom(E, sess, t, h.vel, 105); break;
    case 'b': dholBass(E, sess, t, h.vel); break;
    case 'c': dholClosed(E, sess, t, h.vel); break;
    case 't': dholTreble(E, sess, t, h.vel); break;
    case 'mo': manjira(E, sess, t, h.vel, true); break;
    case 'mc': manjira(E, sess, t, h.vel, false); break;
    case 'sh': shaker(E, sess, t, h.vel); break;
    case 'ka': kartal(E, sess, t, h.vel); break;
    case 'gh': ghungroo(E, sess, t, h.vel, false); break;
    case 'ghS': ghungroo(E, sess, t, h.vel, true); break;
    case 'tb': tambourine(E, sess, t, h.vel, false); break;
    case 'tbS': tambourine(E, sess, t, h.vel, true); break;
    case 'cl': claps(E, sess, t, h.vel); break;
    case 'cb': cowbell(E, sess, t, h.vel); break;
    case 'cgM': case 'cgS': case 'cgO': case 'cgL': conga(E, sess, t, h.vel, h.lane); break;
    case 'rd': ride(E, sess, t, h.vel, false); break;
    case 'rdB': ride(E, sess, t, h.vel, true); break;
  }
}

/** The closing stroke when a song ends on sam. */
export function finalHit(E: Engine, sess: Session, t: number, style: string): void {
  if (style === 'tabla') stroke(E, sess, t, 'Dha', 1);
  else if (style === 'click') click(E, sess, t, 2);
  else if (style === 'kit') {
    kick(E, sess, t, 1);
    crash(E, sess, t, 0.9);
  } else if (style === 'dholak') {
    dholBass(E, sess, t, 1);
    dholTreble(E, sess, t, 0.8);
  }
}

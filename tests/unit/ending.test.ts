// The end of a song or of its rounds (src/audio/transport.ts): the last note and then the
// sound still ringing fade out over a quarter of a second, instead of stopping short; so does a
// note followed by silence (x).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/audio/engine';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport } from '../../src/audio/transport';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext, type Entry } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

const SONG = 'S R G M | P D N S\nS N D P | M G R S\n';

function play(opts: { from: number; to: number; loop: boolean; rounds?: number }, endFade?: number, secs = 12, song = SONG) {
  const rec = new RecordingContext();
  const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(7)), () => {});
  if (endFade != null) T.endFade = endFade;
  const sound = { ...structuredClone(DEFAULT_SOUND), countIn: false, droneVol: 0.5 };
  T.start({ parsed: parseSong(song), taal: taalInfo('keherwa'), song: { saKey: 0, saOct: 4, tempo: 120, startOn: 1 }, sound }, opts);
  for (let i = 1; i * 0.025 <= secs && !T.endAt; i++) {
    rec.currentTime = i * 0.025;
    T.tick();
  }
  // Fades to silence: [time, time constant].
  const fades = rec.log.filter((e: Entry) => e[1] === 'setTarget' && e[2] === 0).map((e) => [e[3] as number, e[4] as number]);
  return { fades, endAt: T.endAt };
}

describe('the end of a song', () => {
  // At 120 a minute, from 0.12 s: line 1's last beat at 3.62 s, line 2's at 7.62 s.
  it('fades the last note out over a quarter of a second, the others as before', () => {
    const { fades, endAt } = play({ from: 0, to: 1, loop: false });
    const notes = fades.filter(([, c]) => c === 0.04);
    const soft = fades.filter(([, c]) => Math.abs(c - 0.25 / 3) < 1e-9);
    expect(notes).toHaveLength(15);
    // The last note lets go 25 ms before its beat ends; then, 1.3 s after the song, the rest.
    expect(soft.map(([t]) => +t.toFixed(3))).toEqual([8.095, 9.17, 9.17]);
    expect(endAt).toBeCloseTo(9.42, 9);
  });

  it('does the same at the end of the last of a set number of rounds (a line played on its own)', () => {
    const { fades } = play({ from: 0, to: 0, loop: true, rounds: 2 });
    const soft = fades.filter(([, c]) => Math.abs(c - 0.25 / 3) < 1e-9).map(([t]) => +t.toFixed(3));
    // Round 1's last note lets go as before; round 2's fades.
    expect(soft).toEqual([8.095, 9.17, 9.17]);
    expect(fades.filter(([t, c]) => c === 0.04 && Math.abs(t - 4.095) < 1e-9)).toHaveLength(1);
  });

  it('leaves a loop that goes on until stopped alone, and stops short with no fade (the prototype’s way)', () => {
    const soft = ([, c]: number[]) => Math.abs(c! - 0.25 / 3) < 1e-9;
    expect(play({ from: 0, to: 0, loop: true }, undefined, 9).fades.some(soft)).toBe(false);
    const short = play({ from: 0, to: 1, loop: false }, 0).fades;
    expect(short.some(soft)).toBe(false);
    expect(short.filter(([, c]) => c === 0.04)).toHaveLength(16);
  });

  it('fades a note followed by silence (x) the same way, even within a beat', () => {
    // Sa; Re for half a beat, then silence; Ga held over two beats, then silence; Pa, Dha; Ni last.
    const song = 'S Rx G - | x P D N\n';
    const { fades } = play({ from: 0, to: 0, loop: false }, undefined, 8, song);
    const soft = fades.filter(([, c]) => Math.abs(c - 0.25 / 3) < 1e-9).map(([t]) => +t.toFixed(3));
    // Re lets go at 0.845 s, Ga at 2.095 s, Ni (the last) at 4.095 s; then the rest at 5.17 s.
    expect(soft).toEqual([0.845, 2.095, 4.095, 5.17, 5.17]);
    // Sa, Pa and Dha, each followed by a note, let go as before.
    expect(fades.filter(([, c]) => c === 0.04).map(([t]) => +t.toFixed(3))).toEqual([0.595, 3.095, 3.595]);
    // With the prototype's ending, none fades.
    const short = play({ from: 0, to: 0, loop: false }, 0, 8, song).fades;
    expect(short.filter(([, c]) => c === 0.04)).toHaveLength(6);
    expect(short.some(([, c]) => Math.abs(c! - 0.25 / 3) < 1e-9)).toBe(false);
  });
});

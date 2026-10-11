// Keyboards: MIDI messages and timing (src/audio/midi.ts), the notes keys type, and the keys
// drawn on the Practice view (src/app/keyboard.ts); the transport's guide notes.
import { describe, expect, it } from 'vitest';
import { keyboardHTML, keyName, keyRange } from '../../src/app/keyboard';
import { createEngine } from '../../src/audio/engine';
import { allOff, keyToNote, noteOff, noteOn, programChange, readNoteOn, toPerformanceTime } from '../../src/audio/midi';
import { DEFAULT_SOUND } from '../../src/audio/sound';
import { Transport } from '../../src/audio/transport';
import { noteToken } from '../../src/core/notation/edit';
import { parseSong } from '../../src/core/notation/parse';
import { taalInfo } from '../../src/core/taal/taals';
import { RecordingContext } from '../differential/webaudio-recorder';
import { seeded } from '../helpers';

describe('MIDI messages', () => {
  it('note on and off, all notes off, and General MIDI sounds', () => {
    expect(noteOn(0, 60, 100)).toEqual([0x90, 60, 100]);
    expect(noteOn(2, 61, 0)).toEqual([0x92, 61, 1]);
    expect(noteOff(0, 60)).toEqual([0x80, 60, 0]);
    expect(allOff(0)).toEqual([[0xb0, 123, 0], [0xb0, 120, 0]]);
    expect(programChange(0, 'keep')).toEqual([]);
    expect(programChange(0, 'organ')).toEqual([[0xb0, 0, 0], [0xb0, 32, 0], [0xc0, 20]]);
    expect(programChange(0, 'accordion').pop()).toEqual([0xc0, 21]);
  });

  it('hears key presses on any channel, and nothing else', () => {
    expect(readNoteOn([0x90, 64, 80])).toEqual({ note: 64, vel: 80 });
    expect(readNoteOn([0x93, 64, 80])).toEqual({ note: 64, vel: 80 });
    for (const m of [[0x90, 64, 0], [0x80, 64, 40], [0xb0, 64, 127], [0xf8], []]) expect(readNoteOn(m)).toBeNull();
  });

  it('times a note on the performance clock from a reading of both clocks', () => {
    expect(toPerformanceTime(10.5, { contextTime: 10, performanceTime: 123_000 })).toBe(123_500);
  });
});

describe('keys and notes', () => {
  it('a key is a note from the song’s Sa, within two octaves either side', () => {
    expect(keyToNote(52, 52)).toEqual({ semi: 0, oct: 0 });
    expect(keyToNote(59, 52)).toEqual({ semi: 7, oct: 0 });
    expect(keyToNote(47, 52)).toEqual({ semi: 7, oct: -1 });
    expect(keyToNote(64, 52)).toEqual({ semi: 0, oct: 1 });
    expect(keyToNote(52 + 35, 52)).toEqual({ semi: 11, oct: 2 });
    expect(keyToNote(52 + 36, 52)).toBeNull();
    expect(keyToNote(52 - 25, 52)).toBeNull();
  });

  it('written as the editor writes notes, in either script', () => {
    expect([noteToken(7, -1, 'bn'), noteToken(0, 1, 'bn'), noteToken(3, 0, 'bn'), noteToken(6, 0, 'bn')]).toEqual(['.পা', 'র্সা', 'জ্ঞা', 'হ্মা']);
    expect([noteToken(7, -1, 'lat'), noteToken(0, 2, 'lat'), noteToken(6, 0, 'lat')]).toEqual(['.P', "S''", 'M#']);
    for (const [semi, oct] of [[7, -1], [0, 1], [3, 0], [11, -2], [6, 2]] as const) {
      for (const sc of ['bn', 'lat'] as const) {
        const u = parseSong(noteToken(semi, oct, sc)).beatList[0]!.units[0]!;
        expect(u).toMatchObject({ k: 'note', semi, oct });
      }
    }
  });

  it('the keys drawn: whole octaves around the song, each Sa marked, black keys in their places', () => {
    expect(keyRange(55, 72)).toEqual([48, 83]);
    expect(keyRange(60, 64)).toEqual([60, 83]);
    const html = keyboardHTML(48, 71, 52);
    expect((html.match(/class="kw/g) ?? []).length).toBe(14);
    expect((html.match(/class="kbk/g) ?? []).length).toBe(10);
    expect((html.match(/ sa"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-m="49" style="left:5.000%;width:4.286%"');
    expect(keyName(62)).toBe('D4 · White 2');
    expect(keyName(54)).toBe('F♯3 · Black 3');
  });
});

describe('the guide on a keyboard', () => {
  function play(localGuide: boolean) {
    const text = 'সা রা | গা -';
    const rec = new RecordingContext();
    const T = new Transport(createEngine(rec as unknown as BaseAudioContext, seeded(2)), () => {});
    const notes: [number, number, number][] = [];
    T.onNote = (t, d, n) => notes.push([t, d, n]);
    T.localGuide = localGuide;
    T.start({ parsed: parseSong(text), taal: taalInfo('keherwa'), song: { saKey: 4, saOct: 3, tempo: 60, startOn: 1 }, sound: { ...structuredClone(DEFAULT_SOUND), countIn: false, beat: 'off' } }, { from: 0, to: 0, loop: false });
    for (let i = 1; i * 0.025 <= 6 && !T.endAt; i++) {
      rec.currentTime = i * 0.025;
      T.tick();
    }
    return { notes, oscillators: rec.log.filter((e) => e[0] === 'ctx' && e[1] === 'create' && String(e[2]).startsWith('osc#')).length };
  }

  it('each guide note goes out as the harmonium plays it: time, length, MIDI note from Sa', () => {
    const r = play(true);
    expect(r.notes.map(([t, d, n]) => [Math.round(t * 100) / 100, d, n])).toEqual([[0.12, 1, 52], [1.12, 1, 54], [2.12, 2, 56]]);
    expect(r.oscillators).toBeGreaterThan(0);
  });

  it('with the guide on the keyboard alone, the harmonium is silent', () => {
    expect(play(false).oscillators).toBe(play(true).oscillators - 3 * 4);
  });
});

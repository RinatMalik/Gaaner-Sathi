/**
 * Keyboards over MIDI (docs/ENGINE.md → MIDI keyboards): any keyboard that shows up as a MIDI device
 * (USB "to host", or a MIDI interface) works the same, the Casio CT-X3000 among them. Notes
 * played come in to type a song; the guide can go out to the keyboard's own sound, timed from
 * the AudioContext clock that schedules everything else. Web MIDI is built into Chrome, Edge,
 * Opera and Android's Chrome (and Firefox after a permission add-on); Safari and iPhones have
 * none. The message sums are pure and tested in Node.
 */

export type MidiProblem = 'unsupported' | 'insecure' | 'denied' | 'other';
export class MidiError extends Error {
  constructor(readonly problem: MidiProblem, message: string) {
    super(message);
  }
}

export function midiProblemText(p: MidiProblem): string {
  switch (p) {
    case 'unsupported':
      return 'This browser has no MIDI. Chrome or Edge on a computer, or Chrome on Android, can talk to a keyboard.';
    case 'insecure':
      return 'MIDI only works on a secure (https) page.';
    case 'denied':
      return 'The browser blocked MIDI. Allow it for this site (the icon by the address), then press Connect again.';
    default:
      return 'The keyboard could not be reached. Check the cable, then press Connect again.';
  }
}

// ── Messages ─────────────────────────────────────────────────────────────────

/** Note on and off, on a channel (0 is channel 1). */
export const noteOn = (ch: number, note: number, vel: number): number[] => [0x90 | ch, note & 0x7f, Math.max(1, Math.min(127, Math.round(vel)))];
export const noteOff = (ch: number, note: number): number[] => [0x80 | ch, note & 0x7f, 0];
/** All notes off and all sound off (controllers 123 and 120). */
export const allOff = (ch: number): number[][] => [[0xb0 | ch, 123, 0], [0xb0 | ch, 120, 0]];

/** General MIDI sounds the guide can ask for (program numbers from 0), or the keyboard's own. */
export const GM_PROGRAMS = { organ: 20, accordion: 21 } as const;
export type GuideSound = 'keep' | keyof typeof GM_PROGRAMS;
/** Select a General MIDI sound: bank 0, then the program. Nothing for the keyboard's own. */
export function programChange(ch: number, sound: GuideSound): number[][] {
  if (sound === 'keep') return [];
  return [[0xb0 | ch, 0, 0], [0xb0 | ch, 32, 0], [0xc0 | ch, GM_PROGRAMS[sound]]];
}

/** A key pressed: its note and velocity; null for anything else (key up, controllers…). */
export function readNoteOn(data: ArrayLike<number>): { note: number; vel: number } | null {
  if (data.length < 3) return null;
  const st = data[0]! & 0xf0;
  return st === 0x90 && data[2]! > 0 ? { note: data[1]!, vel: data[2]! } : null;
}

/** The note the notation writes for a key, from the song's Sa (a MIDI number): null outside
 * the two octaves either side of Sa the player knows. */
export function keyToNote(key: number, saMidi: number): { semi: number; oct: number } | null {
  const d = key - saMidi;
  const oct = Math.floor(d / 12);
  if (oct < -2 || oct > 2) return null;
  return { semi: ((d % 12) + 12) % 12, oct };
}

/**
 * An AudioContext time as the performance clock MIDI messages are timed on, using a reading
 * of both clocks together (getOutputTimestamp: when that sample is heard), so the keyboard
 * sounds with the tabla, Bluetooth delay and all.
 */
export function toPerformanceTime(t: number, stamp: { contextTime: number; performanceTime: number }): number {
  return stamp.performanceTime + (t - stamp.contextTime) * 1000;
}

// ── Devices ──────────────────────────────────────────────────────────────────

export interface MidiPort {
  id: string;
  name: string;
}

/** The MIDI devices: keys played come to `onKey`; `onChange` hears devices come and go. */
export class Midi {
  onKey: ((note: number, vel: number) => void) | null = null;
  onChange: (() => void) | null = null;
  private constructor(private readonly access: MIDIAccess) {
    access.onstatechange = () => {
      this.listen();
      this.onChange?.();
    };
    this.listen();
  }

  static supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  }

  /** Ask for MIDI. Call from a tap or click. */
  static async open(): Promise<Midi> {
    if (typeof isSecureContext !== 'undefined' && !isSecureContext) throw new MidiError('insecure', 'not a secure context');
    if (!Midi.supported()) throw new MidiError('unsupported', 'no Web MIDI');
    try {
      return new Midi(await navigator.requestMIDIAccess({ sysex: false }));
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      throw new MidiError(name === 'SecurityError' || name === 'NotAllowedError' ? 'denied' : 'other', name || String(e));
    }
  }

  private listen(): void {
    this.access.inputs.forEach((inp) => {
      inp.onmidimessage = (ev: MIDIMessageEvent) => {
        const k = ev.data ? readNoteOn(ev.data) : null;
        if (k) this.onKey?.(k.note, k.vel);
      };
    });
  }

  inputs(): MidiPort[] {
    const out: MidiPort[] = [];
    this.access.inputs.forEach((p) => {
      if (p.state !== 'disconnected') out.push({ id: p.id, name: p.name || 'MIDI keyboard' });
    });
    return out;
  }

  outputs(): MidiPort[] {
    const out: MidiPort[] = [];
    this.access.outputs.forEach((p) => {
      if (p.state !== 'disconnected') out.push({ id: p.id, name: p.name || 'MIDI keyboard' });
    });
    return out;
  }

  /** Send to an output now, or at a performance time. */
  send(id: string, data: number[], at?: number): void {
    const o = this.access.outputs.get(id);
    if (!o) return;
    try {
      if (at == null) o.send(data);
      else o.send(data, at);
    } catch {
      // a device unplugged mid-send
    }
  }
}

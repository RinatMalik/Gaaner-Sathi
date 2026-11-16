/**
 * Takes in one file (2026-11-16; the review of 2026-11-14 found takes could be downloaded only
 * one at a time, and were in no backup, being too big for one): a ZIP of each take's WAV, named
 * as a single take's download is, and `takes.json` listing them with everything needed to play
 * each back against its guide. Import from file reads it back and adds the takes not here. Pure,
 * so it is tested in Node.
 */
import { wavFile } from '../audio/dsp/pcm';
import { cleanTake, type Take } from '../core/practice/take';
import { exportName, stamp } from './filenames';
import { isZip, zipData, zipFiles, ZipWriter, type ReadBytes } from './zip';

export const TAKES_FORMAT = 'gaaner-sathi-takes';
/** Its names: this one, and the one it will have once the storage takes the app's new name. */
const TAKES_FORMATS: readonly string[] = [TAKES_FORMAT, 'torongini-takes'];
export const TAKES_LIST = 'takes.json';

/** A take's file name, named as a session's files are (Rinat, 2026-10-21), so it lists beside
 * them: "2026.10.20_19.35.41 - Nisha lagilo re - Recording.wav". A take downloaded alone has it,
 * and so has its file in a ZIP of takes. */
export const takeFileName = (t: Take): string => exportName(stamp(t.at), t.title || 'Take', 'Recording');
const wavName = takeFileName;

/** A ZIP of takes, written a take at a time: `add` gives each take's bytes, `finish` the list
 * and the ZIP's table. Throws (RangeError) once the file would be too big for a ZIP. */
export class TakesZip {
  private readonly zip = new ZipWriter();
  private readonly names = new Set<string>();
  private readonly list: (Take & { file: string })[] = [];

  get count(): number {
    return this.list.length;
  }

  add(t: Take, pcm: Int16Array): Uint8Array[] {
    let name = wavName(t);
    for (let i = 2; this.names.has(name); i++) name = wavName(t).replace(/ - Recording\.wav$/, ' (' + i + ') - Recording.wav');
    const parts = this.zip.add(name, wavFile(pcm, t.rate), t.at);
    this.names.add(name);
    this.list.push({ ...t, file: name });
    return parts;
  }

  finish(now: number = Date.now()): Uint8Array[] {
    const json = new TextEncoder().encode(JSON.stringify({ format: TAKES_FORMAT, version: 1, exported: new Date(now).toISOString(), takes: this.list }, null, 1));
    return [...this.zip.add(TAKES_LIST, json, now), ...this.zip.finish()];
  }
}

/** A mono 16-bit WAV's rate and samples; null for any other kind. */
export function wavSamples(b: Uint8Array): { rate: number; samples: Int16Array } | null {
  if (b.length < 12) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (at: number) => String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let rate = 0;
  let p = 12;
  while (p + 8 <= b.length) {
    const id = tag(p);
    const len = v.getUint32(p + 4, true);
    const body = p + 8;
    if (id === 'fmt ') {
      if (len < 16 || v.getUint16(body, true) !== 1 || v.getUint16(body + 2, true) !== 1 || v.getUint16(body + 14, true) !== 16) return null;
      rate = v.getUint32(body + 4, true);
    } else if (id === 'data') {
      if (!rate) return null;
      const n = Math.floor(Math.min(len, b.length - body) / 2);
      const samples = new Int16Array(n);
      for (let i = 0; i < n; i++) samples[i] = v.getInt16(body + i * 2, true);
      return { rate, samples };
    }
    p = body + len + (len & 1);
  }
  return null;
}

export interface TakesRead {
  /** The takes listed, each with the name of its sound's file. */
  takes: { take: Take; file: string }[];
  /** A take's sound; null when its file is missing or damaged. */
  sound(file: string): Promise<{ rate: number; samples: Int16Array } | null>;
}

/** A file of takes, read a part at a time; null when it is not one. */
export async function readTakes(read: ReadBytes, size: number): Promise<TakesRead | null> {
  if (!isZip(await read(0, 4))) return null;
  const files = await zipFiles(read, size);
  const listFile = files?.find((f) => f.name === TAKES_LIST);
  if (!files || !listFile) return null;
  const raw = await zipData(read, listFile);
  let o: unknown;
  try {
    o = raw ? JSON.parse(new TextDecoder().decode(raw)) : null;
  } catch {
    return null;
  }
  const r = o && typeof o === 'object' ? (o as Record<string, unknown>) : null;
  if (!r || !TAKES_FORMATS.includes(r.format as string) || !Array.isArray(r.takes)) return null;
  const byName = new Map(files.map((f) => [f.name, f]));
  const takes: TakesRead['takes'] = [];
  for (const x of r.takes) {
    const take = cleanTake(x);
    const file = x && typeof x === 'object' ? (x as { file?: unknown }).file : null;
    if (take && typeof file === 'string' && byName.has(file)) takes.push({ take, file });
  }
  return {
    takes,
    sound: async (file) => {
      const f = byName.get(file);
      const data = f ? await zipData(read, f) : null;
      return data ? wavSamples(data) : null;
    },
  };
}

/** What Import says of a file of takes: the takes restored, those here already, those damaged. */
export function takesRestoredWords(name: string, added: number, had: number, bad: number): string {
  const were = (n: number) => (n === 1 ? '1 was' : n + ' were');
  const also = [had ? were(had) + ' here already' : '', bad ? were(bad) + ' damaged, left out' : ''].filter(Boolean).join('; ');
  if (added) return 'Restored ' + (added === 1 ? '1 take' : added + ' takes') + ' from ' + name + (also ? '; ' + also : '');
  if (bad) return 'No take restored from ' + name + ': ' + also;
  if (had) return (had === 1 ? 'The take in ' + name + ' is' : 'All ' + had + ' takes in ' + name + ' are') + ' here already';
  return name + ' holds no takes';
}

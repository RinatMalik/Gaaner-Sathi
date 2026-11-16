/**
 * ZIP files, stored (not compressed), written and read without a library: several takes leave as
 * one file, and come back through Import (2026-11-16). A take is a WAV of a voice, which a
 * compressor would hardly shrink, so storing keeps this short and quick. Any computer's own
 * tools open the files. Pure, so it is tested in Node.
 */

/** CRC-32 as ZIP files check their contents with. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A file in a ZIP is found by its place in a 32-bit number, so a ZIP of this kind holds less
 * than 4 GB, and fewer than 65,535 files. */
export const ZIP_MOST_BYTES = 0xffffffff;
export const ZIP_MOST_FILES = 0xfffe;

/** The time and date as ZIP files keep them, where the singer is. */
function dosTime(at: number): { time: number; date: number } {
  const d = new Date(at);
  const y = Math.max(1980, Math.min(2107, d.getFullYear()));
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const utf8 = new TextEncoder();

/** A ZIP written a file at a time: `add` gives the bytes of each file as it goes, `finish` the
 * table at the end. Nothing already given is held. */
export class ZipWriter {
  private offset = 0;
  private readonly central: Uint8Array[] = [];
  private centralBytes = 0;

  get files(): number {
    return this.central.length;
  }

  /** The file's bytes in the ZIP; throws when it would make the ZIP too big for its kind. */
  add(name: string, data: Uint8Array, at: number): Uint8Array[] {
    const n = utf8.encode(name);
    const head = 30 + n.length;
    if (this.central.length >= ZIP_MOST_FILES || this.offset + head + data.length + this.centralBytes + 46 + n.length + 22 > ZIP_MOST_BYTES) throw new RangeError('too big for one file');
    const crc = crc32(data);
    const { time, date } = dosTime(at);
    const local = new Uint8Array(head);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 10, true); // version needed: stored
    v.setUint16(6, 0x0800, true); // the name is UTF-8
    v.setUint16(8, 0, true); // stored
    v.setUint16(10, time, true);
    v.setUint16(12, date, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, n.length, true);
    v.setUint16(28, 0, true);
    local.set(n, 30);
    const c = new Uint8Array(46 + n.length);
    const w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 10, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(10, 0, true);
    w.setUint16(12, time, true);
    w.setUint16(14, date, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, data.length, true);
    w.setUint32(24, data.length, true);
    w.setUint16(28, n.length, true);
    w.setUint32(42, this.offset, true);
    c.set(n, 46);
    this.central.push(c);
    this.centralBytes += c.length;
    this.offset += head + data.length;
    return [local, data];
  }

  /** The table of files and the ZIP's last record. */
  finish(): Uint8Array[] {
    const end = new Uint8Array(22);
    const v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.central.length, true);
    v.setUint16(10, this.central.length, true);
    v.setUint32(12, this.centralBytes, true);
    v.setUint32(16, this.offset, true);
    return [...this.central, end];
  }
}

/** Bytes of the file being read, from `at`, `len` of them (a slice of a File, in the app). */
export type ReadBytes = (at: number, len: number) => Promise<Uint8Array>;

export interface ZipFile {
  name: string;
  /** Where its local header starts, its size, and its CRC. */
  offset: number;
  size: number;
  crc: number;
}

/** Whether these are a ZIP's first bytes. */
export const isZip = (b: Uint8Array): boolean => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4;

/** The files a ZIP holds, stored ones only; null when it is not a ZIP this can read. */
export async function zipFiles(read: ReadBytes, size: number): Promise<ZipFile[] | null> {
  if (size < 22) return null;
  const tailLen = Math.min(size, 22 + 0xffff);
  const tail = await read(size - tailLen, tailLen);
  const tv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tv.getUint32(i, true) === 0x06054b50) {
      e = i;
      break;
    }
  }
  if (e < 0) return null;
  const count = tv.getUint16(e + 10, true);
  const cdSize = tv.getUint32(e + 12, true);
  const cdAt = tv.getUint32(e + 16, true);
  if (cdAt + cdSize > size) return null;
  const cd = await read(cdAt, cdSize);
  const v = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  const dec = new TextDecoder();
  const out: ZipFile[] = [];
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > cd.length || v.getUint32(p, true) !== 0x02014b50) return null;
    const method = v.getUint16(p + 10, true);
    const crc = v.getUint32(p + 16, true);
    const packed = v.getUint32(p + 20, true);
    const plain = v.getUint32(p + 24, true);
    const nl = v.getUint16(p + 28, true);
    const xl = v.getUint16(p + 30, true);
    const cl = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nl));
    if (method === 0 && packed === plain) out.push({ name, offset, size: plain, crc });
    p += 46 + nl + xl + cl;
  }
  return out;
}

/** A file's bytes, checked against its CRC; null when it is damaged. */
export async function zipData(read: ReadBytes, f: ZipFile): Promise<Uint8Array | null> {
  const h = await read(f.offset, 30);
  if (h.length < 30) return null;
  const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
  if (v.getUint32(0, true) !== 0x04034b50) return null;
  const at = f.offset + 30 + v.getUint16(26, true) + v.getUint16(28, true);
  const data = await read(at, f.size);
  return data.length === f.size && crc32(data) === f.crc ? data : null;
}

/**
 * A session's readings packed small, for a backup (docs/DATA.md → Backups). What the microphone
 * heard is four numbers 47 times a second: written out as numbers they were four fifths of a
 * backup, and a year's practice made a file too big to read back. Packed, each number is the
 * step from the one before it, on the grid it is kept to (times to the millisecond, pitches to
 * the hundredth of a hertz, levels to a tenth of a decibel), in as few bytes as it needs, and
 * the bytes are written as base64 text so the file stays JSON. A steady voice moves little from
 * one reading to the next, so most steps take one byte, where a number took six characters.
 * Unpacking gives back exactly the numbers a backup held before. Pure, so it is tested in Node.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_OF = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

export function toBase64(bytes: Uint8Array): string {
  const out: string[] = [];
  const codes = new Array<number>(0x2000);
  let n = 0;
  const flush = () => {
    codes.length = n;
    out.push(String.fromCharCode.apply(null, codes));
    codes.length = 0x2000;
    n = 0;
  };
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    codes[n++] = B64.charCodeAt(a >> 2);
    codes[n++] = B64.charCodeAt(((a & 3) << 4) | (b >> 4));
    codes[n++] = i + 1 < bytes.length ? B64.charCodeAt(((b & 15) << 2) | (c >> 6)) : 61;
    codes[n++] = i + 2 < bytes.length ? B64.charCodeAt(c & 63) : 61;
    if (n === 0x2000) flush();
  }
  if (n) flush();
  return out.join('');
}

/** The bytes of base64 text; null when it is not base64. */
export function fromBase64(text: string): Uint8Array | null {
  const len = text.length;
  if (len % 4) return null;
  const pad = len && text.charCodeAt(len - 1) === 61 ? (text.charCodeAt(len - 2) === 61 ? 2 : 1) : 0;
  const out = new Uint8Array((len / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    let v = 0;
    for (let k = 0; k < 4; k++) {
      const ch = text.charCodeAt(i + k);
      const d = ch === 61 && i + k >= len - pad ? 0 : ch < 128 ? B64_OF[ch]! : -1;
      if (d < 0) return null;
      v = v * 64 + d;
    }
    if (o < out.length) out[o++] = v >> 16;
    if (o < out.length) out[o++] = (v >> 8) & 255;
    if (o < out.length) out[o++] = v & 255;
  }
  return out;
}

/** Whole numbers written in as few bytes as each needs: seven bits to a byte, the smallest
 * first, the eighth bit saying another byte follows. */
class Writer {
  private buf = new Uint8Array(4096);
  private n = 0;

  uint(u: number): void {
    if (this.n + 8 > this.buf.length) {
      const b = new Uint8Array(this.buf.length * 2);
      b.set(this.buf);
      this.buf = b;
    }
    while (u >= 128) {
      this.buf[this.n++] = (u % 128) | 128;
      u = Math.floor(u / 128);
    }
    this.buf[this.n++] = u;
  }

  /** A number of either sign: 0, −1, 1, −2, 2 … as 0, 1, 2, 3, 4 …, so small steps stay small. */
  int(v: number): void {
    this.uint(v < 0 ? -2 * v - 1 : 2 * v);
  }

  bytes(): Uint8Array {
    return this.buf.subarray(0, this.n);
  }
}

class Reader {
  private i = 0;
  /** The bytes ran out, or a number was longer than any written here. */
  bad = false;
  constructor(private readonly b: Uint8Array) {}

  uint(): number {
    let u = 0;
    let m = 1;
    for (let k = 0; k < 8; k++) {
      if (this.i >= this.b.length) break;
      const x = this.b[this.i++]!;
      u += (x & 127) * m;
      if (x < 128) return u;
      m *= 128;
    }
    this.bad = true;
    return 0;
  }

  int(): number {
    const u = this.uint();
    return u % 2 ? -(u + 1) / 2 : u / 2;
  }

  get done(): boolean {
    return this.i === this.b.length;
  }
}

/** The layout's number, first in the bytes; a later layout takes another. */
const LAYOUT = 1;
/** More readings than any session holds (the pitch check keeps 60,000, about 21 minutes). */
const MOST_READINGS = 2_000_000;

const grid = (v: number | undefined, per: number): number => {
  const x = Math.round((v ?? 0) * per);
  return Number.isFinite(x) ? x || 0 : 0;
};

/** One of each pair's numbers, each as its step from the one before, on its grid. */
function column(w: Writer, v: ArrayLike<number>, n: number, first: number, per: number): void {
  let last = 0;
  for (let i = 0; i < n; i++) {
    const x = grid(v[2 * i + first], per);
    w.int(x - last);
    last = x;
  }
}

/**
 * Readings packed: `readings` in pairs [seconds, Hz], and `levels`, when they match them, in
 * pairs [dB, dB]. Times are kept to the millisecond, pitches to the hundredth of a hertz and
 * levels to a tenth of a decibel, as a backup always kept them.
 */
export function packReadings(readings: ArrayLike<number>, levels?: ArrayLike<number>): string {
  const n = Math.floor(readings.length / 2);
  const lv = levels && levels.length === 2 * n && n > 0 ? levels : null;
  const w = new Writer();
  w.uint(LAYOUT);
  w.uint(n);
  w.uint(lv ? 1 : 0);
  column(w, readings, n, 0, 1000);
  column(w, readings, n, 1, 100);
  if (lv) {
    column(w, lv, n, 0, 10);
    column(w, lv, n, 1, 10);
  }
  return toBase64(w.bytes());
}

/** What `packReadings` packed; null when the text is not that, or is cut short. */
export function unpackReadings(text: string): { readings: number[]; levels?: number[] } | null {
  const b = fromBase64(text);
  if (!b) return null;
  const r = new Reader(b);
  if (r.uint() !== LAYOUT) return null;
  const n = r.uint();
  const hasLevels = r.uint() === 1;
  if (r.bad || n > MOST_READINGS) return null;
  const readings = new Array<number>(2 * n);
  const levels = hasLevels ? new Array<number>(2 * n) : null;
  const read = (into: number[], first: number, per: number) => {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last += r.int();
      into[2 * i + first] = last / per;
    }
  };
  read(readings, 0, 1000);
  read(readings, 1, 100);
  if (levels) {
    read(levels, 0, 10);
    read(levels, 1, 10);
  }
  if (r.bad || !r.done) return null;
  return levels ? { readings, levels } : { readings };
}

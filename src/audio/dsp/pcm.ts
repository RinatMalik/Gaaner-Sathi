/**
 * Takes' samples (docs/adr/ADR-004-takes.md): halved in rate to save room (a voice needs
 * nothing above 10 kHz), kept as 16-bit numbers, and written as a WAV file when downloaded.
 * Pure, so it is tested in Node.
 */

/** A half-band low-pass (windowed sinc, 31 taps), cutting at a quarter of the input rate. */
const TAPS = (() => {
  const n = 31;
  const m = (n - 1) / 2;
  const h = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = i - m;
    const sinc = x === 0 ? 0.5 : Math.sin(Math.PI * x * 0.5) / (Math.PI * x);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (n - 1));
    h[i] = sinc * w;
    sum += h[i]!;
  }
  for (let i = 0; i < n; i++) h[i]! /= sum;
  return h;
})();

/** Every other sample, after the low-pass, so nothing folds back into the band kept. */
export function halfRate(x: Float32Array): Float32Array {
  const out = new Float32Array(Math.floor(x.length / 2));
  const m = (TAPS.length - 1) / 2;
  for (let k = 0; k < out.length; k++) {
    const c = 2 * k;
    let acc = 0;
    for (let i = 0; i < TAPS.length; i++) {
      const j = c + i - m;
      if (j >= 0 && j < x.length) acc += TAPS[i]! * x[j]!;
    }
    out[k] = acc;
  }
  return out;
}

export function toInt16(x: Float32Array): Int16Array {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.round(Math.max(-1, Math.min(1, x[i]!)) * 32767);
  return out;
}

export function fromInt16(x: Int16Array): Float32Array {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! / 32767;
  return out;
}

/** A mono 16-bit WAV file. */
export function wavFile(samples: Int16Array, rate: number): Uint8Array {
  const data = samples.length * 2;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + data, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, data, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, samples[i]!, true);
  return new Uint8Array(buf);
}

/** Loudness of a stretch of samples, dB RMS (−Infinity for silence). */
export function rmsDb(x: Float32Array, a = 0, b = x.length): number {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return 10 * Math.log10(s / Math.max(1, b - a));
}

/**
 * halfRate as the samples arrive, block by block, giving 16-bit samples: a long take never
 * holds more than a few blocks at the full rate. The result equals halfRate on the whole.
 */
export class HalfRateStream {
  private buf = new Float32Array(0);
  /** Input index of buf[0], and the next output's centre (an even input index). */
  private base = 0;
  private next = 0;
  private outs: Int16Array[] = [];
  private count = 0;

  push(x: Float32Array): void {
    const b = new Float32Array(this.buf.length + x.length);
    b.set(this.buf);
    b.set(x, this.buf.length);
    this.buf = b;
    this.run(false);
  }

  /** Samples out so far (at the half rate). */
  get length(): number {
    return this.count;
  }

  /** Every sample, the last ones worked out with what came in (as halfRate does at the end). */
  finish(): Int16Array {
    this.run(true);
    const out = new Int16Array(this.count);
    let at = 0;
    for (const o of this.outs) {
      out.set(o, at);
      at += o.length;
    }
    return out;
  }

  private run(final: boolean): void {
    const m = (TAPS.length - 1) / 2;
    const total = this.base + this.buf.length;
    const last = final ? 2 * Math.floor(total / 2) - 2 : total - 1 - m;
    if (this.next > last) return;
    const n = Math.floor((last - this.next) / 2) + 1;
    const o = new Int16Array(n);
    for (let k = 0; k < n; k++) {
      const c = this.next + 2 * k;
      let acc = 0;
      for (let i = 0; i < TAPS.length; i++) {
        const j = c + i - m;
        if (j >= 0 && j < total) acc += TAPS[i]! * this.buf[j - this.base]!;
      }
      o[k] = Math.round(Math.max(-1, Math.min(1, acc)) * 32767);
    }
    this.outs.push(o);
    this.count += n;
    this.next += 2 * n;
    const keep = Math.max(0, this.next - m - this.base);
    if (keep > 0) {
      this.buf = this.buf.slice(keep);
      this.base += keep;
    }
  }
}

/**
 * One take being captured from blocks of microphone samples, each stamped with the frame just
 * after its last sample: it keeps frames `from` up to `to` (set when the take ends), fills any
 * gap with silence so later samples stay in time, and halves the rate as they come.
 */
export class TakeCapture {
  private readonly out = new HalfRateStream();
  private at: number;
  to = Infinity;
  constructor(readonly from: number, readonly maxFrames: number) {
    this.at = from;
  }

  push(end: number, data: Float32Array): void {
    const start = end - data.length;
    const last = Math.min(this.to, this.from + this.maxFrames);
    const a = Math.max(start, this.at);
    const b = Math.min(end, last);
    if (b <= a) return;
    if (a > this.at) this.out.push(new Float32Array(a - this.at));
    this.out.push(data.subarray(a - start, b - start));
    this.at = b;
  }

  /** The take's samples, at half the rate, from `from` to `to`; anything that never came in
   * is silence. */
  finish(): Int16Array {
    const last = Math.min(this.to, this.from + this.maxFrames);
    if (Number.isFinite(last) && this.at < last) this.out.push(new Float32Array(last - this.at));
    this.at = Math.max(this.at, last);
    const all = this.out.finish();
    const want = Number.isFinite(last) ? Math.floor((last - this.from) / 2) : all.length;
    return all.length > want ? all.slice(0, want) : all;
  }
}

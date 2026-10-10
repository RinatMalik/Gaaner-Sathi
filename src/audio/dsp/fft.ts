/**
 * A radix-2 FFT, enough for the pitch detector's autocorrelation. Pure (no DOM), so it is
 * tested in Node against a plain DFT.
 */

export interface FFT {
  size: number;
  /** In place: re and im are both `size` long. `inverse` scales by 1 / size. */
  transform(re: Float64Array, im: Float64Array, inverse?: boolean): void;
}

const plans = new Map<number, FFT>();

/** An FFT of a power-of-two size, with its tables worked out once. */
export function fft(size: number): FFT {
  const known = plans.get(size);
  if (known) return known;
  if (size < 2 || (size & (size - 1)) !== 0) throw new Error('FFT size must be a power of two: ' + size);
  const bits = Math.log2(size);
  const rev = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(size / 2);
  const sin = new Float64Array(size / 2);
  for (let i = 0; i < size / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / size);
    sin[i] = Math.sin((2 * Math.PI * i) / size);
  }
  const plan: FFT = {
    size,
    transform(re, im, inverse = false) {
      for (let i = 0; i < size; i++) {
        const j = rev[i]!;
        if (j > i) {
          let t = re[i]!;
          re[i] = re[j]!;
          re[j] = t;
          t = im[i]!;
          im[i] = im[j]!;
          im[j] = t;
        }
      }
      const sign = inverse ? 1 : -1;
      for (let len = 2; len <= size; len <<= 1) {
        const half = len >> 1;
        const step = size / len;
        for (let start = 0; start < size; start += len) {
          for (let k = 0; k < half; k++) {
            const wr = cos[k * step]!;
            const wi = sign * sin[k * step]!;
            const a = start + k;
            const b = a + half;
            const xr = re[b]! * wr - im[b]! * wi;
            const xi = re[b]! * wi + im[b]! * wr;
            re[b] = re[a]! - xr;
            im[b] = im[a]! - xi;
            re[a] = re[a]! + xr;
            im[a] = im[a]! + xi;
          }
        }
      }
      if (inverse) {
        for (let i = 0; i < size; i++) {
          re[i] = re[i]! / size;
          im[i] = im[i]! / size;
        }
      }
    },
  };
  plans.set(size, plan);
  return plan;
}

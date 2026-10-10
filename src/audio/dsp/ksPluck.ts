/**
 * Tanpura string (docs/ENGINE.md → Drones): a Karplus-Strong plucked string with a
 * fractional-delay allpass for exact tuning. The "jawari" buzz comes from the string grazing
 * a curved bridge: while the string is loud, its negative swing is softly limited, which
 * adds bright harmonics that fade as the note decays. Pure DSP, no Web Audio, so it is
 * tested in Node. `rand` defaults to Math.random; tests pass a seeded one.
 */
export function ksPluck(freq: number, sr: number, secs: number, rand: () => number = Math.random): Float32Array<ArrayBuffer> {
  const total = Math.floor(sr * secs);
  const out = new Float32Array(total);
  const s = 0.05; // loop lowpass: (1-s)·x[n] + s·x[n-1], delays s samples
  const D = sr / freq - s;
  const L = Math.floor(D);
  const frac = D - L;
  const c = (1 - frac) / (1 + frac);
  const line = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) {
    lp += 0.5 * ((rand() * 2 - 1) - lp);
    line[i] = lp;
  }
  let mean = 0;
  for (let i = 0; i < L; i++) mean += line[i]!;
  mean /= L;
  let peak0 = 0;
  for (let i = 0; i < L; i++) {
    line[i] -= mean;
    peak0 = Math.max(peak0, Math.abs(line[i]!));
  }
  const thr = peak0 * 0.25;
  const loss = Math.pow(0.001, 1 / (freq * 8)); // fundamental about -60 dB after 8 s
  let idx = 0;
  let prev = 0;
  let apx = 0;
  let apy = 0;
  let dcx = 0;
  let dcy = 0;
  let pk = 0;
  for (let n = 0; n < total; n++) {
    const cur = line[idx]!;
    dcy = cur - dcx + 0.995 * dcy; // remove the DC the bridge adds
    dcx = cur;
    out[n] = dcy;
    if (Math.abs(dcy) > pk) pk = Math.abs(dcy);
    let y = loss * ((1 - s) * cur + s * prev);
    prev = cur;
    if (y < -thr) y = -thr + (y + thr) * 0.5;
    const ap = c * y + apx - c * apy;
    apx = y;
    apy = ap;
    line[idx] = ap;
    idx = idx + 1 === L ? 0 : idx + 1;
  }
  const k = pk ? 0.6 / pk : 1;
  const fade = Math.floor(sr * 0.3);
  for (let n = 0; n < total; n++) out[n] *= k * (n > total - fade ? (total - n) / fade : 1);
  return out;
}

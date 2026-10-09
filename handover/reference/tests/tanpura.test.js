const fs = require('fs'); eval(fs.readFileSync(__dirname+'/.extracted/ks.js', 'utf8') + ';globalThis.KS=ksPluck;');
const sr = 48000;
function pitch(x, a, b, f0) {           // autocorrelation peak near the expected period, parabolic refine
  const seg = x.subarray(a, b), N = seg.length;
  const lo = Math.floor(sr / (f0 * 1.06)), hi = Math.ceil(sr / (f0 * 0.94));
  let best = -1, bl = lo, vals = [];
  for (let l = lo - 1; l <= hi + 1; l++) { let s = 0; for (let i = 0; i + l < N; i++) s += seg[i] * seg[i + l]; vals[l] = s; if (l >= lo && l <= hi && s > best) { best = s; bl = l; } }
  const y0 = vals[bl - 1], y1 = vals[bl], y2 = vals[bl + 1], d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
  return sr / (bl + d);
}
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
let ok = true;
for (const f of [98.0, 130.81, 196.0, 261.63, 293.66]) {
  const x = KS(f, sr, 5);
  const p = pitch(x, Math.floor(sr * 0.5), Math.floor(sr * 1.0), f);
  const cents = 1200 * Math.log2(p / f);
  const r = [rms(x, 0, sr * 0.3), rms(x, sr * 1.5, sr * 1.8), rms(x, sr * 3.5, sr * 3.8)].map(v => 20 * Math.log10(v + 1e-12));
  const finite = x.every(Number.isFinite);
  const pass = Math.abs(cents) < 3 && finite && r[0] > r[1] && r[1] > r[2];
  ok = ok && pass;
  console.log((pass ? 'PASS' : 'FAIL') + ` ${f} Hz -> measured ${p.toFixed(2)} Hz (${cents.toFixed(2)} cents) | level 0s ${r[0].toFixed(1)} dB, 1.5s ${r[1].toFixed(1)} dB, 3.5s ${r[2].toFixed(1)} dB`);
}
process.exit(ok ? 0 : 1);

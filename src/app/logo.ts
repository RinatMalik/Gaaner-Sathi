/**
 * The logo at the top left (PH2-62): the name তরঙ্গিণী in Tiro Bangla italic, crossed at an angle by
 * a river that runs from the feet of the first letter to the shoulders of the last; inside the river
 * the letters turn blue and ripple. It is Rinat's pick of 2026-11-13, logo 36 in
 * docs/brand/river-logos.html (which draws all the choices), lowered twice at Rinat's request.
 *
 * Drawn as SVG markup, written into index.html when Vite serves or builds it (vite.config.ts), so
 * the header needs no script. Its colours are the page's own (styles.css → The logo), so it follows
 * the colour scheme; the name is in the typeface the page already loads, and `textLength` holds it to
 * Tiro's width so that, if another font stands in, the river still crosses the same letters.
 * Pure: no DOM, so it runs in Node for the build and the tests.
 */

/** The name as the logo writes it. */
export const LOGO_NAME = 'তরঙ্গিণী';
/** Tiro Bangla italic's measurements of the name, in ems: its width, and its height above and below
 *  the baseline (measured in Edge, 2026-11-13). */
const EM = { w: 2.904, asc: 0.91, desc: 0.08 };
/** The type size, in px: as in the previews Rinat chose from. */
export const LOGO_SIZE = 42;
/** How high the river's middle crosses the middle of the name, in ems above the baseline: 0.38 as
 *  first drawn, lowered by 0.06 twice (Rinat, 2026-11-13). */
export const RIVER_MID = 0.26;

type Curve = (x: number) => number;
const r = (v: number): number => Math.round(v * 100) / 100;

/** A smooth path along y = f(x) from xa to xb, as cubic pieces whose handles follow the slope. */
function seg(f: Curve, xa: number, xb: number, n: number): string {
  const h = (xb - xa) / n, e = Math.abs(h) / 40;
  const slope = (x: number): number => (f(x + e) - f(x - e)) / (2 * e);
  let x = xa, y = f(x), d = slope(x), s = '';
  for (let i = 1; i <= n; i++) {
    const xn = xa + i * h, yn = f(xn), dn = slope(xn);
    s += ' C' + r(x + h / 3) + ' ' + r(y + d * h / 3) + ' ' + r(xn - h / 3) + ' ' + r(yn - dn * h / 3) + ' ' + r(xn) + ' ' + r(yn);
    x = xn; y = yn; d = dn;
  }
  return s;
}
const steps = (xa: number, xb: number, lam: number): number => Math.max(4, Math.ceil(Math.abs(xb - xa) / (lam / 6)));

/** A gradient along x that fades in from nothing and out again at the ends. */
function fade(id: string, x0: number, x1: number, cls: string, edge: number): string {
  const stop = (o: number, op?: number) => '<stop offset="' + o + '" class="' + cls + '"' + (op === undefined ? '' : ' stop-opacity="' + op + '"') + '/>';
  return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r(x0) + '" y1="0" x2="' + r(x1) + '" y2="0">' +
    stop(0, 0) + stop(edge) + stop(1 - edge) + stop(1, 0) + '</linearGradient>';
}

/** The logo's size in px, and its SVG. */
export function logoParts(): { width: number; height: number; svg: string } {
  const S = LOGO_SIZE, W = EM.w * S, PI = Math.PI;
  const L = 0.8 * S, w = W + 1.6 * S, B = EM.asc * S + 0.22 * S, h = B + Math.max(EM.desc * S, 0.1 * S) + 0.3 * S;
  const cx = L + W / 2, sl = -0.5 * S / W, lam = 0.85 * S, k = 2 * PI / lam;
  // The river: its middle, its banks, and a brass thread of current along it.
  const fc: Curve = (x) => B - RIVER_MID * S + sl * (x - cx);
  const ft: Curve = (x) => fc(x) - 0.17 * S + 0.04 * S * Math.sin(k * x);
  const fb: Curve = (x) => fc(x) + 0.17 * S + 0.04 * S * Math.sin(k * x + 1.2);
  const fm: Curve = (x) => fc(x) + 0.03 * S * Math.sin(1.2 * k * x + 2.4);
  // Where the letters are clipped: above the river, in it, below it (just wider than the name).
  const X0 = L - 0.5 * S, X1 = L + W + 0.5 * S, nc = steps(X0, X1, lam), top = -S, bottom = h + S;
  const region = (upper: Curve | null, lower: Curve | null): string =>
    'M' + r(X0) + ' ' + r(upper ? upper(X0) : top) + (upper ? seg(upper, X0, X1, nc) : ' H' + r(X1)) +
    ' L' + r(X1) + ' ' + r(lower ? lower(X1) : bottom) + (lower ? seg(lower, X1, X0, nc) : ' H' + r(X0)) + 'Z';
  const n = steps(0, w, lam);
  const line = (f: Curve, stroke: string, width: number, extra = ''): string =>
    '<path d="M0 ' + r(f(0)) + seg(f, 0, w, n) + '" fill="none" stroke="url(#' + stroke + ')" stroke-width="' + width + '" stroke-linecap="round"' + extra + '/>';
  const body = 'M0 ' + r(ft(0)) + seg(ft, 0, w, n) + ' L' + r(w) + ' ' + r(fb(w)) + seg(fb, w, 0, n) + 'Z';
  const text = (cls: string): string => '<text x="' + r(L) + '" y="' + r(B) + '" textLength="' + r(W) + '" lengthAdjust="spacingAndGlyphs" class="' + cls + '" stroke-width="' + r(0.1 * S) + '">' + LOGO_NAME + '</text>';
  const svg = '<svg class="logosvg" viewBox="0 0 ' + r(w) + ' ' + r(h) + '" width="' + Math.ceil(w) + '" height="' + Math.ceil(h) + '" aria-hidden="true" focusable="false" lang="bn">' +
    '<defs>' +
    '<clipPath id="lg-dry1"><path d="' + region(null, ft) + '"/></clipPath>' +
    '<clipPath id="lg-wet"><path d="' + region(ft, fb) + '"/></clipPath>' +
    '<clipPath id="lg-dry2"><path d="' + region(fb, null) + '"/></clipPath>' +
    '<filter id="lg-ripple" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="turbulence" baseFrequency="0.012 0.1" numOctaves="1" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    fade('lg-river', 0, w, 'lg-stR', 0.2) + fade('lg-brass', 0, w, 'lg-stB', 0.25) +
    '</defs>' +
    '<path d="' + body + '" fill="url(#lg-river)" opacity=".08"/>' +
    line(ft, 'lg-river', 1.2) + line(fb, 'lg-river', 1.2) + line(fm, 'lg-brass', 0.9, ' opacity=".8"') +
    '<g clip-path="url(#lg-dry1)">' + text('lg-ink lg-halo') + '</g>' +
    '<g clip-path="url(#lg-dry2)">' + text('lg-ink lg-halo') + '</g>' +
    '<g clip-path="url(#lg-wet)"><g filter="url(#lg-ripple)">' + text('lg-river lg-halo') + '</g></g>' +
    '</svg>';
  return { width: Math.ceil(w), height: Math.ceil(h), svg };
}

/** The logo's SVG markup. */
export function logoSvg(): string { return logoParts().svg; }

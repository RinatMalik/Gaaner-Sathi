// The logo at the top left (src/app/logo.ts) and its place in the header (index.html, vite.config.ts).
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';
import css from '../../src/app/styles.css?raw';
import { LOGO_NAME, LOGO_WIDEN, RIVER_MID, logoParts, logoSvg } from '../../src/app/logo';

describe('the logo', () => {
  const svg = logoSvg();

  it('writes the name in Bengali three times (above, in and below the river) and never in English', () => {
    expect(svg.split('>' + LOGO_NAME + '</text>').length - 1).toBe(3);
    expect(svg).not.toMatch(/torongini/i);
  });

  it('is complete markup: no missing numbers, every reference to an id that is there, each id once', () => {
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
    expect(svg.startsWith('<svg ') && svg.endsWith('</svg>')).toBe(true);
  });

  it('is hidden from screen readers, which read the heading’s own text instead', () => {
    expect(svg).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(page).toMatch(/<h1 class="logo"><span class="sr-only">Torongini \(তরঙ্গিণী\)<\/span><!-- logo --><\/h1>/);
  });

  it('is the previews’ size made a quarter wider, as Rinat asked, and still fits a phone', () => {
    const { width, height } = logoParts();
    expect(LOGO_WIDEN).toBe(1.25);
    expect(width).toBeGreaterThan(1.25 * 180);
    expect(width).toBeLessThan(1.25 * 200);
    expect(width).toBeLessThan(328); // a 360 px phone less the page's margins
    expect(height).toBeGreaterThan(55);
    expect(height).toBeLessThan(75);
    expect(svg).toContain('width="' + width + '" height="' + height + '"');
    expect(svg).toContain('<g transform="scale(1.25 1)">');
  });

  it('has the river where Rinat asked: lowered twice from 0.38 by 0.06', () => {
    expect(RIVER_MID).toBeCloseTo(0.38 - 2 * 0.06, 10);
  });
});

describe('the header', () => {
  it('has exactly one place for the logo, and tagline 16 under it instead of the English line', () => {
    expect(page.split('<!-- logo -->').length).toBe(2);
    expect(page).toContain('<div class="sub tagline" lang="bn">প্রতিদিনের রেওয়াজের সাথী</div>');
    expect(page).not.toContain('harmonium and rhythm from your own notation');
  });

  it('starts the tagline under র, the name’s second letter, as Rinat asked', () => {
    const { roX } = logoParts();
    expect(roX).toBeGreaterThan(70); // past ত and the logo's own margin
    expect(roX).toBeLessThan(90);
    const m = css.match(/\.brand \.tagline\{[^}]*margin-left:(\d+(?:\.\d+)?)px/);
    expect(m).not.toBeNull();
    // the tagline's first letter is drawn 0.03 em (0.5 px at 16 px) into its box
    expect(Math.abs(Number(m![1]) + 0.03 * 16 - roX)).toBeLessThan(1);
  });
});

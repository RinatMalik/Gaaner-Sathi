// The app's icon (Rinat's pick of 2026-11-13, a gold ত on rosewood): index.html links it at each size,
// and public/icons/ holds a picture of that size for each link (dev/icon.html draws them).
import { describe, expect, it } from 'vitest';
import page from '../../index.html?raw';

const files = import.meta.glob('../../public/icons/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;

/** A PNG's width and height, from its header (bytes 16 to 23), given as a data URL. */
function pngSize(dataUrl: string): { w: number; h: number; type: number } {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const u32 = (i: number) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
  expect(bin.slice(1, 4)).toBe('PNG');
  return { w: u32(16), h: u32(20), type: bin.charCodeAt(25) };
}
const file = (name: string): string => {
  const key = Object.keys(files).find((k) => k.endsWith('/' + name));
  expect(key, name + ' in public/icons').toBeDefined();
  return files[key!];
};

describe('the icon', () => {
  it('is linked for the browser tab at 16 and 32 px, and for a home screen at 192 and Apple’s 180', () => {
    const links = [...page.matchAll(/<link rel="(icon|apple-touch-icon)"[^>]*>/g)].map((m) => m[0]);
    expect(links).toHaveLength(4);
    for (const [size, name] of [[32, 'icon-32.png'], [16, 'icon-16.png'], [192, 'icon-192.png']] as const)
      expect(links).toContain('<link rel="icon" type="image/png" sizes="' + size + 'x' + size + '" href="/icons/' + name + '">');
    expect(links).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">');
  });

  it('is a picture of the size each link says', () => {
    for (const [name, px] of [['icon-16.png', 16], ['icon-32.png', 32], ['icon-192.png', 192], ['apple-touch-icon.png', 180]] as const) {
      const { w, h } = pngSize(file(name));
      expect([name, w, h]).toEqual([name, px, px]);
    }
  });

  it('has see-through rounded corners for the tab and Android, and none for Apple, which rounds its own', () => {
    for (const name of ['icon-16.png', 'icon-32.png', 'icon-192.png']) expect(pngSize(file(name)).type).toBe(6); // RGBA
    expect(pngSize(file('apple-touch-icon.png')).type).not.toBe(6); // no alpha: iOS shows transparency as black
  });
});

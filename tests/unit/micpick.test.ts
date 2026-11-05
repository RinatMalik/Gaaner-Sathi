import { describe, expect, it } from 'vitest';
import { heardText, micName } from '../../src/app/micpick';

describe('the microphone picked and heard (Rinat, 2026-11-05)', () => {
  it('names a microphone without the USB ids Chrome adds', () => {
    expect(micName('Microphone (2- Scarlett 2i2 USB) (1235:8016)')).toBe('Microphone (2- Scarlett 2i2 USB)');
    expect(micName('Microphone (BRIO 4K Stream Edition)')).toBe('Microphone (BRIO 4K Stream Edition)');
  });
  it('says which one is heard, and when it is not the one picked', () => {
    const scarlett = { id: 'a', label: 'Microphone (2- Scarlett 2i2 USB) (1235:8016)' };
    const brio = { id: 'b', label: 'Microphone (BRIO 4K Stream Edition) (046d:0866)' };
    expect(heardText(null, null)).toBe('Which microphone is heard shows once it has been on.');
    expect(heardText(null, brio)).toBe('Hearing Microphone (BRIO 4K Stream Edition).');
    expect(heardText(scarlett, scarlett)).toBe('Hearing Microphone (2- Scarlett 2i2 USB).');
    expect(heardText(scarlett, brio)).toBe('Microphone (2- Scarlett 2i2 USB) is not plugged in: hearing Microphone (BRIO 4K Stream Edition).');
    expect(heardText(scarlett, null)).toBe('');
  });
});

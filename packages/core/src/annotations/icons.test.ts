import { describe, expect, it } from 'vitest';
import { parseIcon } from './icons';

describe('square icons', () => {
  it('reads an icon on a square', () => {
    expect(parseIcon('pin@f6')).toEqual({ icon: 'pin', square: 'f6' });
  });

  it.each(['pin@z9', 'sparkle@e4', 'pin f6', 'Pin@f6'])('rejects %s', (text) => {
    expect(parseIcon(text)).toBeNull();
  });
});

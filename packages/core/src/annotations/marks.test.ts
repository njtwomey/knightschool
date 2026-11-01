import { describe, expect, it } from 'vitest';
import { markColours, parseArrow, parseRing } from './marks';

describe('marks', () => {
  it('reads arrows and rings and rejects anything else', () => {
    expect(parseArrow('Gc4f7')).toEqual({ colour: 'G', from: 'c4', to: 'f7' });
    expect(parseArrow('Xc4f7')).toBeNull();
    expect(parseArrow('Gc4c4')).toBeNull();
    expect(parseRing('Yd5')).toEqual({ colour: 'Y', square: 'd5' });
  });

  it('lists the colours present in key order', () => {
    expect(markColours({ arrows: ['Bd1h5', 'Gc4f7'], circles: ['Ye5'] })).toEqual(['G', 'Y', 'B']);
  });
});

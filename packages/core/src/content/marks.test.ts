import { describe, expect, it } from 'vitest';
import { cleanMarks, markColours, parseArrow, parseCircle, toggleArrow, toggleCircle } from './marks';

describe('parseArrow and parseCircle', () => {
  it.each([
    ['Gc3d5', { colour: 'G', from: 'c3', to: 'd5' }],
    ['Rh8a1', { colour: 'R', from: 'h8', to: 'a1' }],
    ['Xc3d5', undefined],
    ['gc3d5', undefined],
    ['Gc3c3', undefined],
    ['Gc3', undefined],
    ['Gi3d5', undefined],
  ])('arrow %s', (mark, expected) => {
    expect(parseArrow(mark)).toEqual(expected);
  });

  it.each([
    ['Yd5', { colour: 'Y', square: 'd5' }],
    ['Bh1', { colour: 'B', square: 'h1' }],
    ['d5', undefined],
    ['Yd9', undefined],
    ['Yd5e4', undefined],
  ])('circle %s', (mark, expected) => {
    expect(parseCircle(mark)).toEqual(expected);
  });
});

describe('toggleArrow', () => {
  const empty = { arrows: [], circles: ['Yd5'] };
  it.each([
    ['adds a new arrow', empty, 'G', ['Gc3d5']],
    ['takes the same arrow away', { arrows: ['Gc3d5', 'Rf6e4'], circles: ['Yd5'] }, 'G', ['Rf6e4']],
    ['changes the colour of an arrow on the same squares', { arrows: ['Gc3d5'], circles: ['Yd5'] }, 'R', ['Rc3d5']],
  ] as const)('%s', (_, marks, colour, arrows) => {
    expect(toggleArrow({ arrows: [...marks.arrows], circles: [...marks.circles] }, colour, 'c3', 'd5')).toEqual({
      arrows,
      circles: ['Yd5'],
    });
  });

  it('keeps the reverse arrow apart', () => {
    expect(toggleArrow({ arrows: ['Gd5c3'], circles: [] }, 'G', 'c3', 'd5').arrows).toEqual(['Gd5c3', 'Gc3d5']);
  });
});

describe('toggleCircle', () => {
  it.each([
    ['adds a ring', [], 'Y', ['Yd5']],
    ['takes the same ring away', ['Yd5', 'Re4'], 'Y', ['Re4']],
    ['changes its colour', ['Yd5'], 'B', ['Bd5']],
  ] as const)('%s', (_, circles, colour, expected) => {
    expect(toggleCircle({ arrows: ['Gc3d5'], circles: [...circles] }, colour, 'd5')).toEqual({
      arrows: ['Gc3d5'],
      circles: expected,
    });
  });
});

describe('cleanMarks and markColours', () => {
  it('drops malformed and repeated marks', () => {
    expect(cleanMarks({ arrows: ['Gc3d5', 'Gc3d5', 'Xa1a2'], circles: ['Yd5', 'e4'] })).toEqual({
      arrows: ['Gc3d5'],
      circles: ['Yd5'],
    });
  });

  it('lists the colours used, in the key order', () => {
    expect(markColours({ arrows: ['Bc3d5', 'Gf3d4'], circles: ['Rd5', 'Bd4'] })).toEqual(['G', 'R', 'B']);
    expect(markColours(undefined)).toEqual([]);
  });
});

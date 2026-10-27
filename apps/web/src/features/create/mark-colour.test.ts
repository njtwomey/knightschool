import { describe, expect, it } from 'vitest';
import { markColourFor } from './mark-colour';

const keys = (held: Partial<Record<'shift' | 'alt' | 'ctrl' | 'meta', boolean>>) => ({
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
  ...held,
});

describe('markColourFor', () => {
  it.each([
    ['no keys: the colour picked', {}, 'G'],
    ['Shift: a threat', { shift: true }, 'R'],
    ['Alt: support', { alt: true }, 'B'],
    ['Shift and Alt: a target', { shift: true, alt: true }, 'Y'],
  ] as const)('%s', (_, held, colour) => {
    expect(markColourFor('G', keys(held))).toBe(colour);
  });
});

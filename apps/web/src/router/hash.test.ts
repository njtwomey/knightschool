import { describe, expect, it } from 'vitest';
import { buildHash, decodeMoves, encodeMoves, parseHash } from './hash';

describe('hash state', () => {
  it('round-trips values, including spaces, ampersands and unicode', () => {
    const params = { q: 'two knights & more', pgn: '1. e4 e5 2. Nf3', note: 'é' };
    expect(parseHash(buildHash(params))).toEqual(params);
  });

  it('leaves out empty values and is empty when nothing is set', () => {
    expect(buildHash({ a: '1', b: '', c: undefined })).toBe('#a=1');
    expect(buildHash({})).toBe('');
    expect(parseHash('')).toEqual({});
    expect(parseHash('#')).toEqual({});
  });

  it('reads a hash with or without the leading #, and ignores damaged parts', () => {
    expect(parseHash('a=1&b=2')).toEqual({ a: '1', b: '2' });
    expect(parseHash('#a=%E0%A4%A&b=2')).toEqual({ b: '2' });
    expect(parseHash('#flag&a=1')).toEqual({ a: '1' });
  });

  it('writes moves compactly and reads back only valid ones', () => {
    expect(encodeMoves(['e2e4', 'e7e5', 'e7e8q'])).toBe('e2e4.e7e5.e7e8q');
    expect(decodeMoves('e2e4.e7e5.e7e8q')).toEqual(['e2e4', 'e7e5', 'e7e8q']);
    expect(decodeMoves('e2e4.nonsense.e7e5')).toEqual(['e2e4', 'e7e5']);
    expect(decodeMoves(undefined)).toEqual([]);
    expect(decodeMoves('')).toEqual([]);
  });
});

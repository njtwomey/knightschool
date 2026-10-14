import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PREFS, parseBoardPrefs } from './prefs';

describe('parseBoardPrefs', () => {
  it('uses the defaults when nothing is saved or the value is damaged', () => {
    expect(parseBoardPrefs(null)).toEqual(DEFAULT_BOARD_PREFS);
    expect(parseBoardPrefs('not json')).toEqual(DEFAULT_BOARD_PREFS);
    expect(parseBoardPrefs('42')).toEqual(DEFAULT_BOARD_PREFS);
  });

  it('keeps valid choices', () => {
    const saved = { theme: 'tan', pieces: 'bold', legalMoves: false, hover: false, coordinates: false };
    expect(parseBoardPrefs(JSON.stringify(saved))).toEqual(saved);
  });

  it('replaces only the invalid parts', () => {
    expect(parseBoardPrefs(JSON.stringify({ theme: 'neon', pieces: 'bold', legalMoves: 'yes' }))).toEqual({
      ...DEFAULT_BOARD_PREFS,
      pieces: 'bold',
    });
  });

  it('starts on the green board', () => {
    expect(DEFAULT_BOARD_PREFS.theme).toBe('green');
  });
});

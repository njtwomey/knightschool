import { START_FEN } from '@knightschool/core';
import { describe, expect, it } from 'vitest';
import { EMPTY_VIEW, readBoardHash, writeBoardHash } from './board-hash';

const SICILIAN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';

describe('board hash', () => {
  it('is empty for the usual start', () => {
    expect(writeBoardHash(EMPTY_VIEW)).toBe('');
    expect(readBoardHash('')).toEqual(EMPTY_VIEW);
  });

  it('round-trips a start, moves, the move shown and the side', () => {
    const view = { fen: SICILIAN, moves: ['g1f3', 'd7d6'], ply: 1, side: 'black' as const };
    const hash = writeBoardHash(view);
    expect(hash).toContain('m=g1f3,d7d6');
    expect(hash).toContain('fen=rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR+w+KQkq+c6+0+2');
    expect(readBoardHash(hash)).toEqual(view);
  });

  it('shows the last move when no ply is given, and keeps a ply within the moves', () => {
    expect(readBoardHash('#m=e2e4,e7e5').ply).toBe(2);
    expect(readBoardHash('#m=e2e4,e7e5&ply=9').ply).toBe(2);
    expect(readBoardHash('#m=e2e4,e7e5&ply=0').ply).toBe(0);
  });

  it('falls back to the defaults for broken parts', () => {
    expect(readBoardHash('#fen=nonsense&m=e2e4,zz,e7e5&side=red')).toEqual({
      fen: START_FEN,
      moves: ['e2e4', 'e7e5'],
      ply: 2,
      side: 'white',
    });
  });
});

describe('board hash moves', () => {
  it('stops at the first move that cannot be played', () => {
    expect(readBoardHash('#m=e2e4,e2e4,e7e5').moves).toEqual(['e2e4']);
  });
});

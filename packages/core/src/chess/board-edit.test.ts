import { describe, expect, it } from 'vitest';
import {
  checkFen,
  EMPTY_SETUP,
  fenFromSetup,
  loadGame,
  pgnFor,
  pieceAt,
  placePiece,
  possibleCastling,
  setupFromFen,
  START_FEN,
} from './board-edit';

describe('placing pieces', () => {
  it('puts a piece on a square and takes it off again', () => {
    const withKing = placePiece('8/8/8/8/8/8/8/8', 'e1', 'K');
    expect(withKing).toBe('8/8/8/8/8/8/8/4K3');
    expect(pieceAt(withKing, 'e1')).toBe('K');
    expect(placePiece(withKing, 'e1', null)).toBe('8/8/8/8/8/8/8/8');
  });

  it('replaces what was there and keeps the rest', () => {
    expect(placePiece('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', 'e4', 'Q')).toBe(
      'rnbqkbnr/pppppppp/8/8/4Q3/8/PPPPPPPP/RNBQKBNR',
    );
  });

  it('ignores squares that do not exist', () => {
    expect(placePiece('8/8/8/8/8/8/8/8', 'z9', 'K')).toBe('8/8/8/8/8/8/8/8');
  });
});

describe('setups', () => {
  it('round-trips the standard position', () => {
    expect(fenFromSetup(setupFromFen(START_FEN))).toBe(START_FEN);
  });

  it('drops castling rights that cannot exist', () => {
    expect(possibleCastling('4k3/8/8/8/8/8/8/4K2R', 'KQkq')).toBe('K');
    expect(fenFromSetup({ ...EMPTY_SETUP, placement: '4k3/8/8/8/8/8/8/4K3', castling: 'KQ' })).toBe(
      '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    );
  });

  it('says why a position is not valid', () => {
    expect(checkFen(START_FEN)).toBeNull();
    expect(checkFen('8/8/8/8/8/8/8/8 w - - 0 1')).not.toBeNull();
  });
});

describe('pgnFor', () => {
  it('numbers the moves from the standard start with no headers', () => {
    expect(pgnFor(START_FEN, ['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3 *');
  });

  it('puts a custom start in the SetUp and FEN headers', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    expect(pgnFor(fen, ['e4', 'Kd7'])).toBe(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7 *`);
  });

  it('starts with an ellipsis when Black is to move', () => {
    expect(pgnFor('4k3/8/8/8/8/8/4P3/4K3 b - - 0 12', ['Kd7', 'e4'])).toContain('12... Kd7 13. e4');
  });
});

describe('loadGame', () => {
  it('reads a bare FEN', () => {
    expect(loadGame('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toEqual({
      startFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      sans: [],
    });
  });

  it('reads a PGN from the start position', () => {
    expect(loadGame('1. e4 e5 2. Nf3 *')).toEqual({ startFen: START_FEN, sans: ['e4', 'e5', 'Nf3'] });
  });

  it('reads a PGN that starts from a set-up position, and reproduces it', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const pgn = pgnFor(fen, ['e4', 'Kd7']);
    expect(loadGame(pgn)).toEqual({ startFen: fen, sans: ['e4', 'Kd7'] });
  });

  it('explains what it cannot read', () => {
    expect(() => loadGame('')).toThrow(/Paste/);
    expect(() => loadGame('1. e5 *')).toThrow(/PGN/);
  });
});

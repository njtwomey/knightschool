import { describe, expect, it } from 'vitest';
import { checkFen, fenAfter, firstPlyOf, loadGame, pgnFor, START_FEN } from './load';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('loadGame', () => {
  it('reads a FEN, and an EPD given counters', () => {
    expect(loadGame(AFTER_E4)).toEqual({ ok: true, game: { fen: AFTER_E4, moves: [] } });
    expect(loadGame('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -')).toMatchObject({
      ok: true,
      game: { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
    });
  });

  it('says why a FEN is not valid', () => {
    const result = loadGame('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN w KQkq - 0 1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toMatch(/^That FEN is not valid: /);
  });

  it('reads a PGN’s main line past headers, comments, variations, NAGs and the result', () => {
    const pgn = `[Event "Casual"]
[White "A"]

1. e4 {the king's pawn} e5 2. Nf3 (2. f4 exf4 (2... d5)) Nc6 $1 3. Bc4!? ; a comment to the end of the line
3... Bc5 4. 0-0 Nf6 1-0`;
    const result = loadGame(pgn);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.fen).toBe(START_FEN);
    expect(result.game.moves.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6']);
    expect(result.game.moves[6]?.uci).toBe('e1g1');
    expect(result.game.problem).toBeUndefined();
  });

  it('starts from the FEN header', () => {
    const result = loadGame(`[SetUp "1"]\n[FEN "${AFTER_E4}"]\n\n1... c5 2. Nf3 *`);
    expect(result).toMatchObject({ ok: true, game: { fen: AFTER_E4 } });
    if (result.ok) expect(result.game.moves.map((move) => move.san)).toEqual(['c5', 'Nf3']);
  });

  it('stops at a move that is not legal, says where, and keeps the moves before', () => {
    const result = loadGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Ke3 Nf6');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.moves).toHaveLength(6);
    expect(result.game.problem).toBe('4.Ke3 is not legal here; the moves before it are loaded.');
    const black = loadGame('1. e4 Nf3');
    if (black.ok) expect(black.game.problem).toMatch(/^1\.\.\.Nf3 is not legal here/);
  });

  it('refuses text that is neither', () => {
    expect(loadGame('')).toEqual({ ok: false, problem: 'Paste a FEN or a PGN.' });
    expect(loadGame('hello there')).toEqual({
      ok: false,
      problem: 'Not a FEN or a PGN this board can read: 1.hello is not legal here.',
    });
    expect(loadGame('[Event "Nothing"]')).toEqual({ ok: false, problem: 'No moves found: paste a FEN or a PGN.' });
  });
});

describe('checkFen', () => {
  it('accepts a full FEN as it is', () => {
    expect(checkFen(` ${AFTER_E4} `)).toEqual({ ok: true, fen: AFTER_E4 });
  });
});

describe('firstPlyOf', () => {
  it('counts from the move number and the side to move', () => {
    expect(firstPlyOf(START_FEN)).toBe(0);
    expect(firstPlyOf(AFTER_E4)).toBe(1);
    expect(firstPlyOf('8/8/8/8/8/8/8/K6k w - - 3 12')).toBe(22);
  });
});

describe('fenAfter', () => {
  it('keeps real move counters', () => {
    expect(fenAfter(START_FEN, ['e2e4', 'e7e5', 'g1f3'])).toBe(
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    );
  });

  it('stops at an illegal move', () => {
    expect(fenAfter(START_FEN, ['e2e4', 'e2e4'])).toBe(AFTER_E4.replace(' e3 ', ' - '));
  });
});

describe('pgnFor', () => {
  it('writes the moves, numbered, with set-up headers only when needed', () => {
    expect(pgnFor(START_FEN, ['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3 *');
    expect(pgnFor(START_FEN, [])).toBe('*');
    expect(pgnFor(AFTER_E4, ['c5', 'Nf3'])).toBe(`[SetUp "1"]\n[FEN "${AFTER_E4}"]\n\n1... c5 2. Nf3 *`);
  });

  it('reads back what it writes', () => {
    const result = loadGame(pgnFor(AFTER_E4, ['c5', 'Nf3', 'd6']));
    expect(result.ok && result.game.moves.map((move) => move.san)).toEqual(['c5', 'Nf3', 'd6']);
  });
});

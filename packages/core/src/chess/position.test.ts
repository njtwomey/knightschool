import { describe, expect, it } from 'vitest';
import { resolvePosition } from './position';
import { START_EPD } from './epd';

const PGN = '1. e4 { King pawn } e5 2. Nf3 (2. f4 exf4) 2... Nc6 3. Bc4 Bc5 *';

describe('resolvePosition', () => {
  it('takes a FEN or an EPD', () => {
    expect(resolvePosition({ fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' })).toMatchObject({
      epd: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
      ply: 0,
      turn: 'black',
    });
    expect(resolvePosition({ epd: START_EPD }).fen).toBe(`${START_EPD} 0 1`);
  });

  it('plays a PGN to the end by default, or to "last"', () => {
    const last = resolvePosition({ pgn: PGN });
    expect(last).toMatchObject({ ply: 6, totalPlies: 6, lastMove: { san: 'Bc5', uci: 'f8c5' }, turn: 'white' });
    expect(resolvePosition({ pgn: PGN, ply: 'last' }).epd).toBe(last.epd);
  });

  it('plays a PGN to a given ply, reading comments and ignoring variations', () => {
    expect(resolvePosition({ pgn: PGN, ply: 3 })).toMatchObject({ ply: 3, lastMove: { san: 'Nf3' }, turn: 'black' });
    expect(resolvePosition({ pgn: PGN, ply: 0 })).toMatchObject({ epd: START_EPD, ply: 0, turn: 'white' });
    expect(resolvePosition({ pgn: PGN, ply: 0 }).lastMove).toBeUndefined();
  });

  it('starts from the FEN header when the PGN has one', () => {
    const pgn = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 *';
    expect(resolvePosition({ pgn })).toMatchObject({ epd: '4k3/8/8/8/4P3/8/8/4K3 b - -', ply: 1 });
  });

  it('says plainly what is wrong', () => {
    expect(() => resolvePosition({ fen: 'nonsense' })).toThrow(/Not a valid position/);
    expect(() => resolvePosition({ pgn: '1. e4 e5 2. Ke3' })).toThrow(/Cannot read that PGN/);
    expect(() => resolvePosition({ pgn: PGN, ply: 99 })).toThrow(/outside this PGN \(0 to 6\)/);
    expect(() => resolvePosition({ pgn: PGN, ply: -1 })).toThrow(/outside/);
  });
});

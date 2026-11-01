import { describe, expect, it } from 'vitest';
import { playMove, gameOver } from '../chess/play';
import { parseGameUrl, parsePuzzleRow, puzzleGameUrl, puzzleSolver, puzzleStart, puzzleUrl } from './puzzle';

// Real rows from lichess_db_puzzle.csv (November 2026).
const ROWS = {
  blackFirst:
    '00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1819,77,95,10446,crushing hangingPiece long middlegame,https://lichess.org/787zsVup/black#48,,',
  whiteFirst:
    '0000D,5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27,d3d6 f8d8 d6d8 f6d8,1433,75,96,37700,advantage endgame short,https://lichess.org/F8M8OS71#53,,',
  promotion:
    '0071N,6k1/p4pp1/1p5p/4b3/4B3/4P1P1/PpR2PKP/3r4 b - - 1 30,b2b1q c2c8 d1d8 c8d8,554,93,93,284,endgame mate mateIn2 pillsburysMate short,https://lichess.org/game/HRlw71ON/black#60,,',
  mateInOne:
    '006GK,2kr1br1/ppBb1ppp/8/3P2Q1/3n2n1/5N2/PP3qPP/RN2R2K b - - 0 16,d4f3 g5d8,1020,136,71,21,mate mateIn1 oneMove opening queensideAttack,https://lichess.org/game/CSpoYrv7/black#32,Italian_Game Italian_Game_Two_Knights_Defense,',
};

describe('parsePuzzleRow', () => {
  it('reads every column, the game id and the ply', () => {
    expect(parsePuzzleRow(ROWS.mateInOne)).toEqual({
      id: '006GK',
      fen: '2kr1br1/ppBb1ppp/8/3P2Q1/3n2n1/5N2/PP3qPP/RN2R2K b - - 0 16',
      moves: ['d4f3', 'g5d8'],
      rating: 1020,
      deviation: 136,
      popularity: 71,
      plays: 21,
      themes: ['mate', 'mateIn1', 'oneMove', 'opening', 'queensideAttack'],
      gameId: 'CSpoYrv7',
      ply: 32,
      openingTags: ['Italian_Game', 'Italian_Game_Two_Knights_Defense'],
    });
  });

  it('gives no tags when the row has none, and null for the header and broken rows', () => {
    expect(parsePuzzleRow(ROWS.blackFirst)?.openingTags).toEqual([]);
    const header = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
    expect(parsePuzzleRow(header)).toBeNull();
    expect(parsePuzzleRow('x,y')).toBeNull();
    expect(parsePuzzleRow(ROWS.whiteFirst.replace('1433', 'many'))).toBeNull();
  });
});

describe('parseGameUrl', () => {
  it.each([
    ['https://lichess.org/787zsVup/black#48', { gameId: '787zsVup', ply: 48 }],
    ['https://lichess.org/F8M8OS71#53', { gameId: 'F8M8OS71', ply: 53 }],
    ['https://lichess.org/game/HRlw71ON/black#60', { gameId: 'HRlw71ON', ply: 60 }],
    ['https://example.com/x', null],
  ])('%s', (url, expected) => expect(parseGameUrl(url)).toEqual(expected));
});

describe('puzzleStart', () => {
  it('plays the opponent move; White solves after a Black move', () => {
    const puzzle = parsePuzzleRow(ROWS.blackFirst)!;
    const start = puzzleStart(puzzle);
    expect(start.lastMove.san).toBe('Bxg3');
    expect(start.solver).toBe('white');
    expect(puzzleSolver(puzzle)).toBe('white');
    expect(start.epd).toBe('r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2b1/PqP3PP/7K w - -');
    expect(start.solution).toEqual(['e6e7', 'b2b1', 'b3c1', 'b1c1', 'h6c1']);
  });

  it('Black solves after a White move', () => {
    const puzzle = parsePuzzleRow(ROWS.whiteFirst)!;
    expect(puzzleStart(puzzle).solver).toBe('black');
    expect(puzzleSolver(puzzle)).toBe('black');
  });

  it('plays a promotion', () => {
    const start = puzzleStart(parsePuzzleRow(ROWS.promotion)!);
    expect(start.lastMove.san).toBe('b1=Q');
    expect(start.solver).toBe('white');
  });

  it('leaves a mate in one to find', () => {
    const start = puzzleStart(parsePuzzleRow(ROWS.mateInOne)!);
    expect(start.solver).toBe('white');
    const mate = playMove(start.epd, start.solution[0]!)!;
    expect(mate.san).toBe('Qxd8#');
    expect(gameOver(mate.epd)).toBe('white');
  });

  it('throws on a first move that is not legal', () => {
    const puzzle = { ...parsePuzzleRow(ROWS.whiteFirst)!, moves: ['a1a8'] };
    expect(() => puzzleStart(puzzle)).toThrow(/0000D/);
  });
});

describe('addresses', () => {
  it('links the puzzle and its game', () => {
    expect(puzzleUrl('006GK')).toBe('https://lichess.org/training/006GK');
    expect(puzzleGameUrl({ gameId: 'CSpoYrv7', ply: 32 })).toBe('https://lichess.org/CSpoYrv7#32');
  });
});

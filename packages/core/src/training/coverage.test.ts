import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import { coverage } from './coverage';

const at = (sans: string) => (sans ? replay(START_EPD, sans.split(' ')).at(-1)!.epd : START_EPD);

describe('coverage', () => {
  const afterE4 = at('e4');
  const afterE5 = at('e4 e5');
  const afterNf3 = at('e4 e5 Nf3');
  const counts = {
    [afterE4]: {
      games: 100,
      moves: [
        { uci: 'e7e5', games: 60 },
        { uci: 'c7c5', games: 37 },
        { uci: 'a7a6', games: 3 },
      ],
    },
    [afterNf3]: { games: 50, moves: [{ uci: 'b8c6', games: 50 }] },
  };
  const book: Record<string, string> = { [START_EPD]: 'e2e4', [afterE5]: 'g1f3' };
  const run = (answer: (epd: string) => string | undefined, depths = [1, 2, 3]) =>
    coverage({ start: START_EPD, startPly: 0, side: 'white', answer, counts, minShare: 0.05, depths });

  it('follows the learner’s move and the band’s replies, leaving out the rare ones', () => {
    const result = run((epd) => book[epd]);
    // Move 1 (ply 2): every game is still inside after 1.e4 and Black's reply.
    // Move 2 (ply 4): 1...c5 is not answered; 1...e5 2.Nf3 Nc6 is (60 of 97 games).
    expect(result.depths[0]).toEqual({ move: 1, share: 1 });
    expect(result.depths[1]!.share).toBeCloseTo(60 / 97);
    // Move 3: no answer after 2...Nc6, so everything has left.
    expect(result.depths[2]!.share).toBe(0);
    expect(result.missingData).toBe(false);
    // The biggest gap is 1...c5, then 2...Nc6 (no answer written).
    expect(result.gaps.map((gap) => gap.moves.length)).toEqual([4, 2]);
    expect(result.gaps[1]).toMatchObject({ epd: at('e4 c5'), moves: ['e2e4', 'c7c5'] });
    expect(result.gaps[1]!.share).toBeCloseTo(37 / 97);
  });
  it('rises as more is known, and counts positions with no data as left', () => {
    const less = run((epd) => (epd === START_EPD ? 'e2e4' : undefined));
    expect(less.depths[1]!.share).toBe(0);
    const missing = run((epd) => (epd === START_EPD ? 'd2d4' : undefined));
    expect(missing.missingData).toBe(true);
    expect(missing.depths[0]!.share).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';
import { evalWords, moveCost, whiteShare, winningChances } from './score';

describe('winning chances', () => {
  it.each([
    [0, 0],
    [100, 0.18],
    [300, 0.5],
    [1000, 0.95],
    [-300, -0.5],
  ])('%i cp is about %f', (cp, chances) => expect(winningChances({ cp })).toBeCloseTo(chances, 1));

  it('counts a mate as certain and caps big scores', () => {
    expect(winningChances({ mate: 3 })).toBe(1);
    expect(winningChances({ mate: -1 })).toBe(-1);
    expect(winningChances({ cp: 5000 })).toBe(winningChances({ cp: 1000 }));
    expect(whiteShare({ cp: 0 })).toBe(0.5);
  });
});

describe('move cost', () => {
  it('measures from the mover’s side', () => {
    const white = moveCost({ cp: 50 }, { cp: -150 }, 'white');
    expect(white.cp).toBe(200);
    expect(white.drop).toBeGreaterThan(0.3);
    const black = moveCost({ cp: 50 }, { cp: -150 }, 'black');
    expect(black.cp).toBe(0);
  });

  it('notices a mate allowed or missed', () => {
    expect(moveCost({ cp: 20 }, { mate: -2 }, 'white').mate).toBe('allowed');
    expect(moveCost({ mate: 3 }, { cp: 400 }, 'white').mate).toBe('missed');
  });
});

describe('eval words', () => {
  it.each([
    [{ cp: 10 }, 'Equal', '+0.1'],
    [{ cp: 60 }, 'White is a little better', '+0.6'],
    [{ cp: -180 }, 'Black is clearly better', '-1.8'],
    [{ cp: 420 }, 'White is winning', '+4.2'],
    [{ mate: -2 }, 'Black mates in 2', '-M2'],
  ])('%o reads %s', (score, words, number) => {
    expect(evalWords(score, siteConfig.judge.evalWords)).toMatchObject({ words, number });
  });
});

describe('a game over on the board', () => {
  it('reads as won, not equal', () => {
    expect(winningChances({ over: 'white' })).toBe(1);
    expect(whiteShare({ over: 'black' })).toBe(0);
    expect(evalWords({ over: 'white' }, siteConfig.judge.evalWords)).toMatchObject({
      words: 'Checkmate: White wins',
      number: '#',
    });
    expect(evalWords({ over: 'draw' }, siteConfig.judge.evalWords).words).toBe('Draw');
  });
});

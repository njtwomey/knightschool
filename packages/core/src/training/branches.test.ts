import { manifestOf } from '../testing/manifest';
import { describe, expect, it } from 'vitest';
import { chooseReply, expectedMove, nextBranchMove } from './branches';
import { parsePgn } from '../chess/pgn';
import { RESERVED_LINE_ID } from '../constants';
import { buildOpening } from '../content/course-build';

const game = (variation: string, moves: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "${variation}"]
[ECO "B12"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves}`);

const manifest = (over: Parameters<typeof manifestOf>[0] = {}) =>
  manifestOf({ name: 'T', eco: 'B12', lines: ['main', 'side'], ...over });

// White's answer to 1...c6 is 2. Nc3 against everything; Black may play 2...d5 (main line) or 2...e5.
const content = buildOpening('t', manifest(), [
  { id: 'main', kind: 'line', game: game('main', '1. e4 c6 2. Nc3 d5 3. Nf3 *'), source: 'main.pgn' },
  { id: 'side', kind: 'line', game: game('side', '1. e4 c6 2. Nc3 e5 3. Nf3 *'), source: 'side.pgn' },
]);

const afterNc3 = Object.values(content.nodes).find((node) => node.moves.some((edge) => edge.san === 'd5'))!;

describe('branch drill', () => {
  it('picks among the replies the course knows, favouring the main line', () => {
    expect(afterNc3.moves.map((edge) => edge.san).sort()).toEqual(['d5', 'e5']);
    expect(chooseReply(afterNc3, () => 0)?.san).toBe('d5'); // main line first
    expect(chooseReply(afterNc3, () => 0.7)?.san).toBe('d5'); // 0.7 * 4 = 2.8 is inside the main line's weight of 3
    expect(chooseReply(afterNc3, () => 0.9)?.san).toBe('e5'); // 0.9 * 4 = 3.6 is past it
  });

  it('over many draws plays the main line about three times in four', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const draws = Array.from({ length: 4000 }, () => chooseReply(afterNc3, rng)!.san);
    const share = draws.filter((san) => san === 'd5').length / draws.length;
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(0.8);
  });

  it('asks the learner for the repertoire move and lets the computer reply otherwise', () => {
    const root = content.nodes[content.opening.rootEpd]!;
    expect(nextBranchMove(root, () => 0)).toMatchObject({ ours: true, edge: { san: 'e4' } });
    const afterE4 = content.nodes[root.moves[0]!.to]!;
    expect(nextBranchMove(afterE4, () => 0)).toMatchObject({ ours: false, edge: { san: 'c6' } });
    expect(expectedMove(afterNc3)).toBeUndefined(); // it is Black's turn there
  });

  it('ends where the course ends', () => {
    const end = Object.values(content.nodes).find((node) => node.moves.length === 0)!;
    expect(nextBranchMove(end, () => 0)).toBeUndefined();
  });

  it('reserves "all" so the route for every branch cannot clash with a line', () => {
    expect(RESERVED_LINE_ID).toBe('all');
    expect(() =>
      buildOpening('t', manifest({ lines: ['all'] }), [
        { id: 'all', kind: 'line', game: game('all', '1. e4 *'), source: 'all.pgn' },
      ]),
    ).toThrow(/reserved/);
  });
});

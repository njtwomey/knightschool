import { describe, expect, it } from 'vitest';
import { readPgnGames } from './pgn-games';

// The shape of a Lichess export (POST /api/games/export/_ids), with a clock comment, a NAG and a variation added.
const EXPORT = `[Event "rated blitz game"]
[Site "https://lichess.org/game/TiwHxq8n"]
[Result "0-1"]
[GameId "TiwHxq8n"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 f5 4. d4?! fxe4 0-1


[Event "rated blitz game"]
[Site "https://lichess.org/game/CSpoYrv7"]
[GameId "CSpoYrv7"]

1. d4 { [%clk 0:03:00] } 1... d5 (1... Nf6 2. c4) 2. c4 $1 1/2-1/2
`;

describe('readPgnGames', () => {
  it('reads every game with its headers and main-line moves', () => {
    const games = readPgnGames(EXPORT);
    expect(games.map((game) => game.tags.GameId)).toEqual(['TiwHxq8n', 'CSpoYrv7']);
    expect(games[0]!.sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'f5', 'd4', 'fxe4']);
    expect(games[1]!.sans).toEqual(['d4', 'd5', 'c4']);
    expect(games[1]!.tags.Site).toBe('https://lichess.org/game/CSpoYrv7');
  });

  it('gives nothing for an empty text', () => {
    expect(readPgnGames('  \n')).toEqual([]);
  });
});

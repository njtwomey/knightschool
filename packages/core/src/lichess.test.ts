import { describe, expect, it } from 'vitest';
import { lichessOpeningKey, lichessUrlForCourse, lichessUrlForLine } from './lichess';
import { parsePgn } from './pgn';
import { manifestOf } from './test-manifest';
import { buildOpening } from './tree';
import { variantPath } from './tree-helpers';

const game = (moves: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves} *`);

const content = () =>
  buildOpening('t', manifestOf({ trigger: '1. e4 e5 2. Nf3' }), [
    { id: 'main', kind: 'line', game: game('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4'), source: 'main.pgn' },
  ]);

describe('Lichess opening pages', () => {
  it('turns a name into the key Lichess uses in its addresses', () => {
    expect(lichessOpeningKey("King's Gambit Accepted: Kieseritzky Gambit")).toBe(
      'Kings_Gambit_Accepted_Kieseritzky_Gambit',
    );
    expect(lichessOpeningKey('Italian Game: Evans Gambit, Morphy Attack')).toBe(
      'Italian_Game_Evans_Gambit_Morphy_Attack',
    );
    expect(lichessOpeningKey('Caro-Kann Defense: Hillbilly Attack')).toBe('Caro-Kann_Defense_Hillbilly_Attack');
    expect(lichessOpeningKey('Réti Opening')).toBe('Reti_Opening');
  });

  it('links a line to its deepest named position, or to its moves when nothing is named', () => {
    const c = content();
    expect(lichessUrlForLine(c, 'main')).toBe('https://lichess.org/opening/e4_e5_Nf3_Nc6_Bc4_Bc5_b4');
    const path = variantPath(c, 'main');
    c.nodes[path[2]!.to]!.name = "King's Knight Opening";
    c.nodes[path[6]!.to]!.name = 'Italian Game: Evans Gambit';
    expect(lichessUrlForLine(c, 'main')).toBe('https://lichess.org/opening/Italian_Game_Evans_Gambit');
    expect(lichessUrlForCourse(c)).toBe('https://lichess.org/opening/Kings_Knight_Opening');
  });
});

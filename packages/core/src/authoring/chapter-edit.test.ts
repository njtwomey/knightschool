import { describe, expect, it } from 'vitest';
import { buildAuthored } from './build';
import {
  appendMove,
  chapterText,
  newChapter,
  opponentMove,
  readChapter,
  setHeader,
  setMoveNote,
  startHeader,
  truncateMoves,
} from './chapter-edit';
import { START_EPD } from '../chess/epd';
import { playSan } from '../chess/chess';
import type { PgnGame } from '../chess/pgn';

/** Plays SAN moves onto a chapter from a position, as the editor does one by one. */
function play(game: PgnGame, from: string, sans: string[]): PgnGame {
  let epd = from;
  for (const san of sans) {
    game = appendMove(game, epd, san);
    epd = playSan(epd, san).epd;
  }
  return game;
}

const course = (lines: string[]) =>
  JSON.stringify({
    name: 'Mine',
    side: 'white',
    opening: 'italian-game',
    tier: 1,
    trigger: '',
    summary: 'x',
    about: { idea: 'x', risks: 'x', suits: 'x' },
    lines,
  });

describe('editing a chapter', () => {
  const base = newChapter({ title: 'Main', opening: 'Italian Game', eco: 'C50', side: 'white', kind: 'main' });

  it('starts with every header a chapter needs, and an unknown ECO falls back', () => {
    expect(base.tags).toMatchObject({ Variation: 'Main', For: 'white', Kind: 'main', ECO: 'C50', Tricks: 'none' });
    expect(newChapter({ title: 'x', opening: 'y', eco: 'B10-B19', side: 'black', kind: 'rare' }).tags.ECO).toBe('A00');
  });

  it('plays moves, notes them, and reads back the same from its PGN text', () => {
    let game = play(base, START_EPD, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(() => appendMove(game, START_EPD, 'e5')).toThrow();
    game = setMoveNote(game, 2, { comment: '  Develops   and attacks e5. ', tags: ['Tip', 'tip', 'common blunder'] });
    game = setHeader(setHeader(game, 'Description', 'The "quiet" one.'), 'Opponent', '1...e5');
    const text = chapterText(game, 0);
    expect(readChapter(text)).toEqual(game);
    expect(game.moves[2]).toMatchObject({ comment: 'Develops and attacks e5.', tags: ['tip', 'common-blunder'] });
    expect(setMoveNote(game, 2, { comment: '', tags: [] }).moves[2]).not.toHaveProperty('comment');
    expect(truncateMoves(game, 1).moves.map((move) => move.san)).toEqual(['e4']);
    expect(setHeader(game, 'Description', ' ').tags).not.toHaveProperty('Description');
  });

  it('names a branch point by its move, or by every move when that one is written twice', () => {
    const main = play(base, START_EPD, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(startHeader(main, 'main', 0, 3)).toBe('main 2...Nc6');
    expect(startHeader(main, 'main', 0, 0)).toBe('main 1.e4');
    const twice: PgnGame = {
      ...main,
      moves: main.moves.map((move, i) =>
        i === 1 ? { ...move, variations: [[{ san: 'e5', nags: [], arrows: [], circles: [], variations: [] }]] } : move,
      ),
    };
    expect(startHeader(twice, 'main', 0, 1)).toBe('main 1.e4 e5');
    // A branch of a branch: the owner's own moves start later.
    expect(startHeader(play(base, playSan(START_EPD, 'e4').epd, ['c5', 'Nf3']), 'side', 1, 2)).toBe('side 2.Nf3');
    expect(() => startHeader(main, 'main', 0, 9)).toThrow();
  });

  it('says what the opponent does to reach a line', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'];
    expect(opponentMove(sans, 5, 'white')).toBe('3...Bc5'); // the line starts with their move
    expect(opponentMove(sans, 6, 'white')).toBe('3...Bc5'); // it starts with ours: the move before
    expect(opponentMove(sans, 0, 'white')).toBe('1...e5');
    expect(opponentMove(sans, 0, 'black')).toBe('1.e4');
    expect(opponentMove(['e4'], 0, 'white')).toBe('any move');
  });

  it('makes chapters the tree accepts: a main line and a branch from it', () => {
    let main = play(base, START_EPD, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    main = setHeader(
      main,
      'Opponent',
      opponentMove(
        main.moves.map((m) => m.san),
        0,
        'white',
      ),
    );
    const branchFrom = main.moves.slice(0, 5).reduce((epd, move) => playSan(epd, move.san).epd, START_EPD);
    let branch = newChapter({
      title: 'Two Knights',
      opening: 'Italian Game',
      eco: 'C55',
      side: 'white',
      kind: 'sideline',
      start: startHeader(main, 'main', 0, 4),
    });
    expect(branch.tags.Start).toBe('main 3.Bc4');
    branch = play(branch, branchFrom, ['Nf6', 'Ng5']);
    branch = setHeader(branch, 'Opponent', '3...Nf6');
    const built = buildAuthored([], {
      chapters: [
        { id: 'main', pgn: chapterText(main, 0) },
        { id: 'two-knights', pgn: chapterText(branch, 5) },
      ],
      courses: [{ id: 'mine', manifest: course(['main', 'two-knights']) }],
    });
    expect(built.problems).toEqual([]);
    expect(built.tree.lines.get('two-knights')!.game.moves.map((move) => move.san)).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Nf6',
      'Ng5',
    ]);
  });
});

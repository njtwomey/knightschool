import { fenToEpd, sideToMove, type Side } from '../chess/epd';
import { replay, type Played } from '../chess/play';

/**
 * A Lichess puzzle, from one row of the puzzle database (database.lichess.org, CC0). `fen` is the position before the
 * opponent's move and `moves` (UCI) start with that move; the rest is the solution. `ply` is the number from the game
 * address (`#48`): how many plies the game had played at the puzzle's start, the opponent's move included.
 */
export type Puzzle = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  deviation: number;
  popularity: number;
  plays: number;
  themes: string[];
  gameId: string;
  ply: number;
  openingTags: string[];
};

/** The database's columns, in order. */
export const PUZZLE_COLUMNS = [
  'PuzzleId',
  'FEN',
  'Moves',
  'Rating',
  'RatingDeviation',
  'Popularity',
  'NbPlays',
  'Themes',
  'GameUrl',
  'OpeningTags',
  'DailyDate',
] as const;

const words = (text: string | undefined): string[] => (text ? text.split(' ').filter(Boolean) : []);

/** The game id and ply from a puzzle's game address: `https://lichess.org/787zsVup/black#48` → 787zsVup, 48. */
export function parseGameUrl(url: string): { gameId: string; ply: number } | null {
  const match = /lichess\.org\/(?:game\/)?([A-Za-z0-9]{8})(?:\/(?:white|black))?(?:#(\d+))?/.exec(url);
  if (!match) return null;
  return { gameId: match[1]!, ply: Number(match[2] ?? 0) };
}

/**
 * One CSV row of the puzzle database as a Puzzle, or null for the header or a row that does not parse. No field holds
 * a comma or a quote (themes and opening tags are separated by spaces), so a plain split is exact.
 */
export function parsePuzzleRow(line: string): Puzzle | null {
  const fields = line.trimEnd().split(',');
  if (fields.length < 10 || fields[0] === PUZZLE_COLUMNS[0]) return null;
  const [id, fen, moves, rating, deviation, popularity, plays, themes, gameUrl, openingTags] = fields;
  const game = parseGameUrl(gameUrl ?? '');
  const numbers = [rating, deviation, popularity, plays].map(Number);
  if (!id || !fen || !moves || !game || numbers.some((value) => !Number.isFinite(value))) return null;
  return {
    id,
    fen,
    moves: words(moves),
    rating: numbers[0]!,
    deviation: numbers[1]!,
    popularity: numbers[2]!,
    plays: numbers[3]!,
    themes: words(themes),
    gameId: game.gameId,
    ply: game.ply,
    openingTags: words(openingTags),
  };
}

/** Who solves: the side to move after the opponent's first move, so the side not to move in the row's FEN. */
export const puzzleSolver = (puzzle: Pick<Puzzle, 'fen'>): Side =>
  sideToMove(fenToEpd(puzzle.fen)) === 'white' ? 'black' : 'white';

/** Where the solver starts: the opponent's move played, the position it gives, who solves and the moves to find. */
export type PuzzleStart = { epd: string; lastMove: Played; solver: Side; solution: string[] };

/** The position the solver faces. Throws when the opponent's move is not legal in the row's FEN (a corrupt row). */
export function puzzleStart(puzzle: Pick<Puzzle, 'id' | 'fen' | 'moves'>): PuzzleStart {
  const [first, ...solution] = puzzle.moves;
  const lastMove = first ? replay(fenToEpd(puzzle.fen), [first])[0] : undefined;
  if (!lastMove) throw new Error(`Puzzle ${puzzle.id}: the first move ${first ?? '(none)'} is not legal`);
  return { epd: lastMove.epd, lastMove, solver: sideToMove(lastMove.epd), solution };
}

/** The puzzle on Lichess. */
export const puzzleUrl = (id: string): string => `https://lichess.org/training/${id}`;

/** The puzzle's game on Lichess at the puzzle's start. */
export const puzzleGameUrl = (puzzle: Pick<Puzzle, 'gameId' | 'ply'>): string =>
  `https://lichess.org/${puzzle.gameId}#${puzzle.ply}`;

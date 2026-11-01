import { sideToMove, type Side } from '../chess/epd';
import { gameOver, playMove } from '../chess/play';
import type { Verdict } from '../judge/judge';
import { GRADES, type Grade } from '../judge/grade';
import type { TryOutcome } from '../training/attempt';

/**
 * An exercise (docs/v2/library/exercise.md): a start position, the learner's side, how a learner move is graded and
 * how the other side answers. Every practice mode is exercises with a different grader and responder.
 */
export type Exercise = {
  /** What is asked: a card id, a step id, a puzzle id. */
  id: string;
  mode: 'try' | 'review' | 'drill' | 'puzzle' | 'play-on' | 'checkpoint' | 'speed';
  start: string;
  side: Side;
  grader: Grader;
  responder: Responder;
  /** How many of the learner's moves end it; with a script, the script's end does. */
  learnerMoves?: number;
  /** The ply of `start` in the game, so moves are numbered as the game numbers them (0 when it starts the game). */
  startPly?: number;
  /** Wrong tries before the move is shown; config `teach.triesBeforeShown` when left out (a checkpoint gives fewer). */
  tries?: number;
  /** Whether Hint and Show me are offered (false in a checkpoint). */
  help?: boolean;
  /** The move that reached the start (UCI), highlighted as the last move before anything is played (a review card). */
  before?: string;
};

/**
 * How a learner move is graded:
 * - exact: the move at this point of the script (the line, the puzzle), or the opening's answer in this position
 *   (`book`, by EPD, for Drill and Review); a sound move that is not it is "another" and uses no try; for a puzzle,
 *   any move that mates also counts;
 * - tolerant: any move whose grade is no worse than `worst` (Play on).
 */
export type Grader =
  { kind: 'exact'; anyMate?: boolean; book?: Record<string, string> } | { kind: 'tolerant'; worst: Grade };

/**
 * How the other side answers:
 * - scripted: the next move of the script;
 * - popular: one of the moves players at the band choose there, weighted by games, among `allowed` when given (the
 *   opening's book replies), else the engine;
 * - engine: the engine's best move.
 */
export type Responder =
  | { kind: 'scripted'; script: string[] }
  /** `replies`: the replies in scope by EPD (Drill); with it the exercise ends where the book does (exerciseOver). */
  | { kind: 'popular'; replies?: Record<string, string[]> }
  | { kind: 'engine' };

/** The move the script expects at a ply of the exercise (plies counted from its start), if it has one. */
export const scriptedMove = (exercise: Exercise, ply: number): string | undefined =>
  exercise.responder.kind === 'scripted' ? exercise.responder.script[ply] : undefined;

/** The learner move an exact grader expects here: the opening's answer in this position, else the script's move. */
export const expectedMove = (exercise: Exercise, epd: string, ply: number): string | undefined =>
  (exercise.grader.kind === 'exact' ? exercise.grader.book?.[epd] : undefined) ?? scriptedMove(exercise, ply);

/**
 * Grades a learner move. `verdict` is the judgement of the move (judgeMove), needed for "another" and for tolerant
 * grading; without it an exact grader can still say right or wrong.
 */
export function gradeMove(
  exercise: Exercise,
  epd: string,
  ply: number,
  uci: string,
  verdict: Pick<Verdict, 'grade' | 'offRepertoire'> | null,
): TryOutcome {
  if (exercise.grader.kind === 'exact') {
    const expected = expectedMove(exercise, epd, ply);
    if (uci === expected) return 'right';
    if (exercise.grader.anyMate) {
      const after = playMove(epd, uci);
      if (after && gameOver(after.epd) === sideToMove(epd)) return 'right';
    }
    return verdict?.offRepertoire ? 'another' : 'wrong';
  }
  if (!verdict) return 'wrong';
  return GRADES.indexOf(verdict.grade) <= GRADES.indexOf(exercise.grader.worst) ? 'right' : 'wrong';
}

/** Whether the exercise is over after `plies` moves (a script run out, enough learner moves, or the game ended). */
export function exerciseOver(exercise: Exercise, epd: string, plies: number, learnerMovesPlayed: number): boolean {
  if (gameOver(epd)) return true;
  if (exercise.responder.kind === 'scripted' && plies >= exercise.responder.script.length) return true;
  if (exercise.responder.kind === 'popular' && exercise.responder.replies) {
    // A drill runs to the end of the book: no reply in scope, or no answer of the learner's.
    const learnerToMove = sideToMove(epd) === exercise.side;
    const book = exercise.grader.kind === 'exact' ? exercise.grader.book : undefined;
    if (!learnerToMove && !exercise.responder.replies[epd]?.length) return true;
    if (learnerToMove && book && !book[epd]) return true;
  }
  return exercise.learnerMoves !== undefined && learnerMovesPlayed >= exercise.learnerMoves;
}

/**
 * Picks one move from weighted options with a random number in [0, 1): the popular responder. Options with no weight
 * are never picked unless all are weightless.
 */
export function pickWeighted<T extends { weight: number }>(options: readonly T[], random: number): T | undefined {
  const total = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0);
  if (total <= 0) return options[Math.floor(random * options.length)];
  let at = random * total;
  for (const option of options) {
    at -= Math.max(0, option.weight);
    if (at < 0) return option;
  }
  return options.at(-1);
}

/** The popular responder's choice: the band's moves here (allowed ones only, when given), weighted by games. */
export function popularReply(
  counts: { moves: { uci: string; games: number }[] } | undefined,
  allowed: readonly string[] | undefined,
  random: number,
): string | undefined {
  const options = (counts?.moves ?? [])
    .filter((move) => !allowed || allowed.includes(move.uci))
    .map((move) => ({ uci: move.uci, weight: move.games }));
  const fromCounts = pickWeighted(options, random)?.uci;
  if (fromCounts) return fromCounts;
  return allowed?.length ? allowed[Math.floor(random * allowed.length)] : undefined;
}

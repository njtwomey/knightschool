import { START_EPD, type Side } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { pickWeighted, type Exercise } from '../exercise/exercise';

/** One line to play in a Speed run: its moves from the start of the game and how much it weighs in the draw. */
export type SpeedLine = { opening: string; line: string; side: Side; moves: string[]; weight: number };

/** What a Speed line's answers are logged under (attempts, mode `speed`). */
export const speedRef = (opening: string, line: string) => `speed:${opening}:${line}`;

/**
 * A line's moves to a depth (to move `depth`; 0 is the whole line), ending on the learner's move so a run never ends
 * waiting on the other side.
 */
export function cutToDepth(moves: readonly string[], side: Side, depth: number): string[] {
  const cut = depth > 0 ? moves.slice(0, depth * 2) : [...moves];
  const mine = (ply: number) => (ply % 2 === 0) === (side === 'white');
  while (cut.length && !mine(cut.length - 1)) cut.pop();
  return cut;
}

/** How many of the learner's moves a script holds. */
export const learnerMovesIn = (moves: readonly string[], side: Side) =>
  moves.filter((_, ply) => (ply % 2 === 0) === (side === 'white')).length;

/**
 * The lines of an opening (or one variation) to play from memory, alternatives left out, each weighted by the games
 * that reach the position deciding it (config weighting "favour popular"): where it parts from the lines listed before
 * it, the first line at the opening's start. Unknown counts weigh as one game, rare rather than never.
 */
export function speedLines(
  opening: BuiltOpening,
  counts: Record<string, { games: number; moves: { uci: string; games: number }[] }> | undefined,
  variation?: string,
): SpeedLine[] {
  const lines = opening.lines.filter((line) => !line.alternative && (!variation || line.variation === variation));
  return lines.map((line, i) => {
    const parting = Math.max(
      opening.startPly,
      ...lines.slice(0, i).map((earlier) => commonPrefix(earlier.moves, line.moves)),
    );
    const path = [START_EPD, ...replay(START_EPD, line.moves).map((move) => move.epd)];
    const games =
      i === 0
        ? counts?.[opening.startEpd]?.games
        : counts?.[path[parting]!]?.moves.find((move) => move.uci === line.moves[parting])?.games;
    return {
      opening: opening.id,
      line: line.id,
      side: opening.side,
      moves: line.moves,
      weight: Math.max(1, games ?? 1),
    };
  });
}

const commonPrefix = (a: readonly string[], b: readonly string[]) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/** A Speed line as an exercise: from the start of the game, every move from memory, the other side scripted. */
export function speedExercise(line: Pick<SpeedLine, 'opening' | 'line' | 'side'>, script: readonly string[]): Exercise {
  return {
    id: speedRef(line.opening, line.line),
    mode: 'speed',
    start: START_EPD,
    side: line.side,
    grader: { kind: 'exact' },
    responder: { kind: 'scripted', script: [...script] },
  };
}

/**
 * Draws `count` items, weighted when `weighted` (else evenly), none twice until every one has been drawn: a set of
 * lines, or the queue of a timed run, which goes round again.
 */
export function drawRound<T extends { weight: number }>(
  items: readonly T[],
  count: number,
  weighted: boolean,
  random: () => number,
): T[] {
  const out: T[] = [];
  let left: T[] = [];
  while (out.length < count && items.length) {
    if (!left.length) left = [...items];
    const pick = pickWeighted(
      left.map((item) => ({ item, weight: weighted ? item.weight : 1 })),
      random(),
    )!.item;
    out.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return out;
}

/** The score of a run: a set by the mean time per move (lower is better), a timed run by moves made (higher). */
export function speedScore(
  kind: 'lines' | 'time',
  lines: readonly { ms: number; moves: number }[],
): { value: number; better: 'lower' | 'higher' } {
  const moves = lines.reduce((sum, line) => sum + line.moves, 0);
  if (kind === 'time') return { value: moves, better: 'higher' };
  const ms = lines.reduce((sum, line) => sum + line.ms, 0);
  return { value: moves ? ms / moves : 0, better: 'lower' };
}

/** Whether a new score beats the best so far (none yet always does). */
export const beats = (score: { value: number; better: 'lower' | 'higher' }, best: number | undefined) =>
  best === undefined || (score.better === 'lower' ? score.value < best : score.value > best);

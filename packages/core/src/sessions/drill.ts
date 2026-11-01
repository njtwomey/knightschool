import { sideToMove } from '../chess/epd';
import type { BuiltOpening } from '../content/build-opening';
import type { Exercise } from '../exercise/exercise';
import { lineEarnsCards, moveCardId, moveCards } from '../training/cards';

/**
 * What a drill of an opening (or one of its variations) holds: the learner's answer in each position (`book`) and the
 * opponent's replies in scope (`replies`), both by EPD. Only lines that earn cards are walked, so a drill never asks a
 * move a step would not make a card of; a line stops at the first learner move that is not a card.
 */
export type DrillScope = { book: Record<string, string>; replies: Record<string, string[]> };

export function drillScope(
  opening: BuiltOpening,
  variation?: string,
  options: { includeRare?: boolean } = {},
): DrillScope {
  const cards = new Set(moveCards(opening, options).map((card) => card.id));
  const book: Record<string, string> = {};
  const replies: Record<string, string[]> = {};
  const lines = opening.lines.filter(
    (line) => (!variation || line.variation === variation) && lineEarnsCards(line, options.includeRare),
  );
  for (const line of lines) {
    let epd = opening.startEpd;
    for (let ply = opening.startPly; ply < line.moves.length; ply++) {
      const uci = line.moves[ply]!;
      const move = opening.positions[epd]?.moves.find((candidate) => candidate.uci === uci);
      if (!move) break;
      if (sideToMove(epd) === opening.side) {
        if (!cards.has(moveCardId(epd, uci))) break;
        book[epd] ??= uci;
        if (book[epd] !== uci) break;
      } else {
        const list = (replies[epd] ??= []);
        if (!list.includes(uci)) list.push(uci);
      }
      epd = move.to;
    }
  }
  return { book, replies };
}

/** The learner positions of a scope, in a stable order: each card a drill or a checkpoint can ask. */
export const scopePositions = (scope: DrillScope) => Object.entries(scope.book).map(([epd, uci]) => ({ epd, uci }));

/**
 * A drill session: `runs` branches, each from the opening's start, the computer replying as players at the band do
 * among the replies in scope and the learner answering with the opening's move, until the book ends.
 */
export function drillExercises(opening: BuiltOpening, scope: DrillScope, runs: number, name = 'all'): Exercise[] {
  return Array.from({ length: runs }, (_, run) => ({
    id: `drill:${opening.id}:${name}:${run + 1}`,
    mode: 'drill' as const,
    start: opening.startEpd,
    startPly: opening.startPly,
    side: opening.side,
    grader: { kind: 'exact' as const, book: scope.book },
    responder: { kind: 'popular' as const, replies: scope.replies },
  }));
}

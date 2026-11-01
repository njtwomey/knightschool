import { sideToMove } from '../chess/epd';
import type { BuiltOpening } from '../content/build-opening';
import type { Exercise } from '../exercise/exercise';
import { moveCardId, type MoveCardDefinition } from '../training/cards';
import type { Card } from '../training/scheduler';

/** The position and move of a move card id (`move:<epd>:<uci>`), or null for another kind of card. */
export function parseMoveCardId(id: string): { epd: string; uci: string } | null {
  if (!id.startsWith('move:')) return null;
  const rest = id.slice('move:'.length);
  const at = rest.lastIndexOf(':');
  if (at <= 0 || at === rest.length - 1) return null;
  return { epd: rest.slice(0, at), uci: rest.slice(at + 1) };
}

/** The cards due at `now`, the most overdue first (docs/v2/pages/review.md). */
export function dueCards(cards: readonly Card[], now: Date): Card[] {
  const at = now.getTime();
  return cards
    .filter((card) => new Date(card.due).getTime() <= at)
    .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}

/** The move that reaches a position in an opening's tree (the opponent's last move before a card), if any. */
export function moveInto(opening: BuiltOpening, epd: string): string | undefined {
  for (const node of Object.values(opening.positions)) {
    const move = node.moves.find((candidate) => candidate.to === epd);
    if (move) return move.uci;
  }
  return undefined;
}

/**
 * One move card as an exercise: the position before the move, the move that reached it shown as the last move, and
 * the opening's move as the only right answer.
 */
export function moveExercise(
  card: { epd: string; uci: string },
  options: { mode: 'review' | 'checkpoint'; before?: string; tries?: number; help?: boolean; startPly?: number },
): Exercise {
  return {
    id: moveCardId(card.epd, card.uci),
    mode: options.mode,
    start: card.epd,
    side: sideToMove(card.epd),
    grader: { kind: 'exact', book: { [card.epd]: card.uci } },
    responder: { kind: 'scripted', script: [card.uci] },
    learnerMoves: 1,
    ...(options.before ? { before: options.before } : {}),
    ...(options.tries !== undefined ? { tries: options.tries } : {}),
    ...(options.help !== undefined ? { help: options.help } : {}),
    ...(options.startPly !== undefined ? { startPly: options.startPly } : {}),
  };
}

/**
 * The new cards a review session introduces: up to `limit`, each opening's offers in step order, taking turns between
 * openings, leaving out cards the learner already has (docs/v2/library/training.md, "New cards").
 */
export function planIntroductions(
  offers: readonly (readonly MoveCardDefinition[])[],
  have: ReadonlySet<string>,
  limit: number,
): MoveCardDefinition[] {
  const queues = offers.map((list) => list.filter((card) => !have.has(card.id)));
  const picked: MoveCardDefinition[] = [];
  const seen = new Set<string>();
  while (picked.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const card = queue.shift();
      if (!card || seen.has(card.id)) continue;
      seen.add(card.id);
      picked.push(card);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}

/** New cards left today: the daily allowance less those introduced today (a count kept for one day only). */
export function newLeftToday(introduced: { day: string; count: number } | undefined, today: string, perDay: number) {
  const used = introduced?.day === today ? introduced.count : 0;
  return Math.max(0, perDay - used);
}

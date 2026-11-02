import { sideToMove } from '../chess/epd';
import type { BuiltOpening } from '../content/build-opening';
import type { Exercise } from '../exercise/exercise';
import { moveCardId, type MoveCardDefinition } from '../training/cards';
import type { Card } from '../training/scheduler';
import { dayKey } from './streak';

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

/** Whether a card counts against the daily allowance of new material: moves and questions, not puzzles or games. */
export const countsAsNew = (cardId: string) => cardId.startsWith('move:') || cardId.startsWith('quiz:');

/**
 * How many cards were met for the first time on `day` (the learner's local day, `dayKey`): their first review falls on
 * it. Worked out from the log, so cards made by a step's Try count as well as those Review introduces
 * (docs/v2/library/training.md, "New cards").
 */
export function introducedOn(reviews: readonly { cardId: string; at: string }[], day: string): number {
  const first = new Map<string, string>();
  for (const review of reviews) {
    if (!countsAsNew(review.cardId)) continue;
    const seen = first.get(review.cardId);
    if (!seen || review.at < seen) first.set(review.cardId, review.at);
  }
  let count = 0;
  for (const at of first.values()) if (dayKey(new Date(at)) === day) count += 1;
  return count;
}

/** New cards left today: the daily allowance less those met today. */
export const newLeftToday = (introducedToday: number, perDay: number) => Math.max(0, perDay - introducedToday);

/**
 * A review question of several moves (setting `review.movesPerQuestion`): from a card's position, the learner plays
 * on along the line of the step that teaches it for `moves` of their moves (0: to the end of the line), the other side
 * answering as the line does. The run stops early at a learner move `allowed` refuses (one the learner has not met, so
 * a question never introduces a card by the back door). One move is the plain card (`moveExercise`).
 */
export function runExercise(
  opening: BuiltOpening,
  card: { epd: string; uci: string; step?: string },
  options: {
    mode: 'review' | 'checkpoint';
    moves: number;
    allowed?: (cardId: string) => boolean;
    before?: string;
    startPly?: number;
    tries?: number;
    help?: boolean;
  },
): Exercise {
  const single = moveExercise(card, options);
  if (options.moves === 1) return single;
  const stepLine = opening.steps.find((step) => step.id === card.step)?.line;
  const lines = [...opening.lines].sort((a, b) => Number(b.id === stepLine) - Number(a.id === stepLine));
  for (const line of lines) {
    let epd = opening.startEpd;
    for (let ply = opening.startPly; ply < line.moves.length; ply++) {
      if (epd === card.epd && line.moves[ply] === card.uci) {
        const script: string[] = [];
        let mine = 0;
        let at = epd;
        for (let i = ply; i < line.moves.length; i++) {
          const uci = line.moves[i]!;
          const learner = sideToMove(at) === single.side;
          if (learner) {
            if (options.moves > 0 && mine >= options.moves) break;
            if (script.length && options.allowed && !options.allowed(moveCardId(at, uci))) break;
            mine += 1;
          }
          script.push(uci);
          const next = opening.positions[at]?.moves.find((move) => move.uci === uci);
          if (!next) break;
          at = next.to;
        }
        // End on the learner's move: a trailing reply would ask nothing.
        while (script.length && script.length % 2 === 0) script.pop();
        const { learnerMoves: _one, ...rest } = single;
        return { ...rest, responder: { kind: 'scripted', script }, grader: { kind: 'exact' } };
      }
      const next = opening.positions[epd]?.moves.find((move) => move.uci === line.moves[ply]);
      if (!next) break;
      epd = next.to;
    }
  }
  return single;
}

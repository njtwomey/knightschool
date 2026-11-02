import {
  gameOver,
  moveCardId,
  moveCards,
  moveState,
  replay,
  START_EPD,
  stepState,
  testedOutSteps,
  type Card,
  type ItemState,
  type Score,
} from '@knightschool/core';
import type { BuiltOpening, BuiltStep, Note, OpeningFacts } from '@knightschool/core/content';
import { siteConfig } from '@/data/site-config';
import type { AttemptRow, ReviewRow } from '@/data/learner-store';

/** A move of a line as the learning pages use it: where it is played from and to, its note, and whose it is. */
export type LineMove = {
  ply: number;
  san: string;
  uci: string;
  before: string;
  after: string;
  mine: boolean;
  note?: Note;
};

/** A line's moves from the start, each with the note the opening's tree gives it. */
export function lineMoves(opening: BuiltOpening, lineId: string): LineMove[] {
  const line = opening.lines.find((candidate) => candidate.id === lineId);
  if (!line) throw new Error(`no line "${lineId}" in ${opening.id}`);
  const played = replay(START_EPD, line.moves);
  return played.map((move, ply) => {
    const before = ply === 0 ? START_EPD : played[ply - 1]!.epd;
    const edge = opening.positions[before]?.moves.find((candidate) => candidate.uci === move.uci);
    return {
      ply,
      san: move.san,
      uci: move.uci,
      before,
      after: move.epd,
      mine: (ply % 2 === 0) === (opening.side === 'white'),
      ...(edge?.note ? { note: edge.note } : {}),
    };
  });
}

/** A step's moves (from the lead-in opponent move to its last learner move) and the moves before it. */
export function stepMoves(opening: BuiltOpening, step: BuiltStep) {
  const moves = lineMoves(opening, step.line);
  return { before: moves.slice(0, step.from), moves: moves.slice(step.from, step.to + 1), all: moves };
}

/** The engine's score of a position from the shipped facts (its best line), if analysed; a finished game's result. */
export function bakedScore(facts: OpeningFacts | undefined, epd: string): Score | null {
  const over = gameOver(epd);
  if (over) return { over };
  const best = facts?.evals[epd]?.lines[0];
  if (!best) return null;
  return best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 };
}

/**
 * Each step's state from the learner's cards and answers, with gates (config `teach.gates`, `teach.firstStepOpen`).
 * A step passed by a test-out in the attempts log (its own, its variation's checkpoint, the final test) is known.
 */
export function stepStates(
  opening: BuiltOpening,
  cards: readonly Card[],
  reviews: readonly ReviewRow[],
  attempts: readonly Pick<AttemptRow, 'mode' | 'ref' | 'result'>[] = [],
) {
  const testedOut = testedOutSteps(opening, attempts);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const ratingsOf = (id: string) => reviews.filter((review) => review.cardId === id).map((review) => review.rating);
  const defs = moveCards(opening);
  const states = new Map<string, ItemState>();
  const counts = new Map<string, { mine: number; known: number; inReviews: number }>();
  let previousKnown = true;
  opening.steps.forEach((step, i) => {
    const mine = defs.filter((card) => card.step === step.id);
    const moveStates = mine.map((card) => moveState(byId.get(card.id), ratingsOf(card.id), siteConfig.judge));
    const open = i === 0 ? siteConfig.teach.firstStepOpen || previousKnown : previousKnown;
    const state = stepState(moveStates, open, siteConfig.teach.gates, testedOut.has(step.id));
    states.set(step.id, state);
    counts.set(step.id, {
      mine: mine.length,
      known: moveStates.filter((s) => s === 'known' || s === 'mastered').length,
      inReviews: mine.filter((card) => byId.has(card.id)).length,
    });
    previousKnown = state === 'known' || state === 'mastered';
  });
  return { states, counts, cards: defs };
}

/** Each card's state by id, from its answers (for moves, lines and puzzles alike). */
export function cardStates(cards: readonly Card[], reviews: readonly ReviewRow[]): Map<string, ItemState> {
  const ratings = new Map<string, ReviewRow['rating'][]>();
  for (const review of [...reviews].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    const list = ratings.get(review.cardId) ?? [];
    list.push(review.rating);
    ratings.set(review.cardId, list);
  }
  return new Map(cards.map((card) => [card.id, moveState(card, ratings.get(card.id) ?? [], siteConfig.judge)]));
}

/** The ply where a line leaves the lines listed before it in the opening (its own moves start there). */
export function branchPly(opening: BuiltOpening, lineId: string): number {
  const index = opening.lines.findIndex((line) => line.id === lineId);
  const line = opening.lines[index];
  if (!line) return opening.startPly;
  let branch = opening.startPly;
  for (const other of opening.lines.slice(0, index)) {
    let same = 0;
    while (same < line.moves.length && other.moves[same] === line.moves[same]) same++;
    branch = Math.max(branch, same);
  }
  return Math.min(branch, Math.max(line.moves.length - 1, opening.startPly));
}

/** A line's learner moves from the opening's start, each as its move card id. */
export function lineCardIds(opening: BuiltOpening, lineId: string, from = opening.startPly): string[] {
  return lineMoves(opening, lineId)
    .filter((move) => move.mine && move.ply >= from)
    .map((move) => moveCardId(move.before, move.uci));
}

/** The positions where the opponent moves in a step's stretch: where Their mistakes looks for mistakes. */
export function opponentPositions(moves: readonly LineMove[]): string[] {
  return moves.filter((move) => !move.mine).map((move) => move.before);
}

/**
 * Where a position the learner moves from is taught: the line's name and the step's title, for prompts that ask for the
 * opening's own move ("Find the book move", then this), so a sound move that is not the book's is never what was meant.
 */
export function taughtAt(opening: BuiltOpening, epd: string): { line: string; step?: string } | undefined {
  for (const step of opening.steps) {
    const moves = stepMoves(opening, step).moves;
    if (!moves.some((move) => move.mine && move.before === epd)) continue;
    const line = opening.lines.find((candidate) => candidate.id === step.line);
    return { line: line?.name ?? opening.name, ...(step.title ? { step: step.title } : {}) };
  }
  return undefined;
}

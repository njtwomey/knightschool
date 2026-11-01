import {
  moveCards,
  moveState,
  replay,
  START_EPD,
  stepState,
  type Card,
  type ItemState,
  type Score,
} from '@knightschool/core';
import type { BuiltOpening, BuiltStep, Note, OpeningFacts } from '@knightschool/core/content';
import { siteConfig } from '@/data/site-config';
import type { ReviewRow } from '@/data/learner-store';

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

/** The engine's score of a position from the shipped facts (its best line), if analysed. */
export function bakedScore(facts: OpeningFacts | undefined, epd: string): Score | null {
  const best = facts?.evals[epd]?.lines[0];
  if (!best) return null;
  return best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 };
}

/** Each step's state from the learner's cards and answers, with gates (config `teach.gates`, `teach.firstStepOpen`). */
export function stepStates(opening: BuiltOpening, cards: readonly Card[], reviews: readonly ReviewRow[]) {
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
    const state = stepState(moveStates, open, siteConfig.teach.gates);
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

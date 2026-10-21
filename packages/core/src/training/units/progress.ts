import type { Card, Review } from '../../schema/user';
import { GRADUATED_DAYS, type CourseUnit } from './types';

export type UnitState = 'locked' | 'unlocked' | 'learning' | 'passed' | 'graduated';

export type UnitProgress = {
  state: UnitState;
  /** Core moves in the unit. */
  total: number;
  /** Of those, how many have a card in storage. */
  introduced: number;
  /** How many were right (good or easy) in each of their last two answers. */
  passed: number;
  /** How many are in FSRS review with an interval of `GRADUATED_DAYS` or more. */
  graduated: number;
  /** Locked units: the prerequisites not yet passed. */
  waitingFor: string[];
  /** Each core move, in the order of `unit.cards`. */
  moves: MoveProgress[];
};

/** One core move of a unit: does its card exist, is it passed (last two answers right), is it graduated. */
export type MoveProgress = { introduced: boolean; passed: boolean; graduated: boolean };

const done = (state: UnitState) => state === 'passed' || state === 'graduated';

/**
 * Each unit's state, derived from the course's cards and review log (nothing is stored):
 *
 * - graduated: every core card is in FSRS `review` with an interval of `GRADUATED_DAYS` or more;
 * - passed: every core move's last two answers were good or easy (or the move is graduated on its own);
 * - learning: some of its cards exist;
 * - unlocked: none of its cards exist yet, and every prerequisite is passed (or graduated);
 * - locked: none of its cards exist yet, and a prerequisite is not passed.
 *
 * A unit with progress shows it even when a prerequisite is not passed, so what was learned before the path existed
 * still counts.
 */
export function unitProgress(
  units: CourseUnit[],
  cards: Pick<Card, 'id' | 'state' | 'scheduledDays'>[],
  reviews: Pick<Review, 'cardId' | 'at' | 'rating'>[],
): Map<string, UnitProgress> {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const lastTwo = new Map<string, Pick<Review, 'at' | 'rating'>[]>();
  for (const review of [...reviews].sort((a, b) => a.at.localeCompare(b.at))) {
    const list = lastTwo.get(review.cardId) ?? [];
    list.push(review);
    if (list.length > 2) list.shift();
    lastTwo.set(review.cardId, list);
  }
  const good = (rating: Review['rating']) => rating === 'good' || rating === 'easy';
  const progress = new Map<string, UnitProgress>();
  for (const unit of units) {
    const ids = unit.cards.map((card) => card.id);
    const moves = ids.map((id): MoveProgress => {
      const card = byId.get(id);
      const last = lastTwo.get(id) ?? [];
      return {
        introduced: !!card,
        passed: last.length === 2 && last.every((review) => good(review.rating)),
        graduated: card?.state === 'review' && card.scheduledDays >= GRADUATED_DAYS,
      };
    });
    const introduced = moves.filter((move) => move.introduced).length;
    const passed = moves.filter((move) => move.passed).length;
    const graduated = moves.filter((move) => move.graduated).length;
    const waitingFor = unit.prerequisites.filter((id) => !done(progress.get(id)?.state ?? 'locked'));
    const total = ids.length;
    let state: UnitState;
    if (total > 0 && graduated === total) state = 'graduated';
    else if (total > 0 && moves.every((move) => move.passed || move.graduated)) state = 'passed';
    else if (introduced > 0) state = 'learning';
    else state = waitingFor.length > 0 ? 'locked' : 'unlocked';
    progress.set(unit.id, {
      state,
      total,
      introduced,
      passed,
      graduated,
      waitingFor: state === 'locked' ? waitingFor : [],
      moves,
    });
  }
  return progress;
}

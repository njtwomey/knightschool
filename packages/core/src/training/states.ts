import type { SiteConfig } from '../config/site-config';
import type { ReviewRating, Card } from './scheduler';

export type ItemState = 'locked' | 'open' | 'learning' | 'known' | 'mastered';

/**
 * A move's state from its card and its answers, newest last (docs/v2/model.md): known when its last
 * `judge.knownAfterRight` answers were Good or Easy, mastered when known and at an FSRS interval of
 * `judge.masteredDays` or more. Known comes first: one quick right answer can earn a long first interval, but a move
 * is never mastered before it has been right that many times running.
 */
export function moveState(
  card: Card | undefined,
  answers: readonly ReviewRating[],
  judge: Pick<SiteConfig['judge'], 'knownAfterRight' | 'masteredDays'>,
): Exclude<ItemState, 'locked' | 'open'> | 'open' {
  if (!card) return 'open';
  const recent = answers.slice(-judge.knownAfterRight);
  const known =
    recent.length === judge.knownAfterRight && recent.every((rating) => rating === 'good' || rating === 'easy');
  if (!known) return 'learning';
  return card.state === 'review' && card.scheduledDays >= judge.masteredDays ? 'mastered' : 'known';
}

/**
 * A step's state from its moves' states and whether the step it grows from is known (gates, `teach.gates`): mastered
 * or known when every move is, learning once any move has started, else open or locked. A step passed by a test-out
 * (`testedOut`, from `testedOutSteps`) is known, whatever its moves say, until every move is mastered.
 */
export function stepState(
  moves: readonly ItemState[],
  prerequisiteKnown: boolean,
  gates: boolean,
  testedOut = false,
): ItemState {
  if (moves.length && moves.every((state) => state === 'mastered')) return 'mastered';
  if (testedOut || (moves.length && moves.every((state) => state === 'known' || state === 'mastered'))) return 'known';
  if (moves.some((state) => state === 'learning' || state === 'known' || state === 'mastered')) return 'learning';
  return prerequisiteKnown || !gates ? 'open' : 'locked';
}

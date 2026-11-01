import type { SiteConfig } from '../config/site-config';
import type { ReviewRating, Card } from './scheduler';

export type ItemState = 'locked' | 'open' | 'learning' | 'known' | 'mastered';

/**
 * A move's state from its card and its answers, newest last (docs/v2/model.md): known when its last
 * `judge.knownAfterRight` answers were Good or Easy, mastered at an FSRS interval of `judge.masteredDays` or more.
 */
export function moveState(
  card: Card | undefined,
  answers: readonly ReviewRating[],
  judge: Pick<SiteConfig['judge'], 'knownAfterRight' | 'masteredDays'>,
): Exclude<ItemState, 'locked' | 'open'> | 'open' {
  if (!card) return 'open';
  if (card.state === 'review' && card.scheduledDays >= judge.masteredDays) return 'mastered';
  const recent = answers.slice(-judge.knownAfterRight);
  if (recent.length === judge.knownAfterRight && recent.every((rating) => rating === 'good' || rating === 'easy')) {
    return 'known';
  }
  return 'learning';
}

/**
 * A step's state from its moves' states and whether the step it grows from is known (gates, `teach.gates`): mastered
 * or known when every move is, learning once any move has started, else open or locked.
 */
export function stepState(moves: readonly ItemState[], prerequisiteKnown: boolean, gates: boolean): ItemState {
  if (moves.length && moves.every((state) => state === 'mastered')) return 'mastered';
  if (moves.length && moves.every((state) => state === 'known' || state === 'mastered')) return 'known';
  if (moves.some((state) => state === 'learning' || state === 'known' || state === 'mastered')) return 'learning';
  return prerequisiteKnown || !gates ? 'open' : 'locked';
}

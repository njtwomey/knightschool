import type { OpeningContent } from '../../schema/content';
import type { Card, Review } from '../../schema/user';
import type { CardDefinition, CardOptions } from '../cards';
import { newCard } from '../scheduler';
import { courseUnits } from './cut';
import { unitProgress, type UnitProgress } from './progress';
import type { CourseUnit } from './types';

/**
 * The cards to introduce next for a course, in path order: those of unlocked units and units being learned, leaving
 * out cards that already exist. Locked units wait; quizzes and traps are never introduced this way.
 */
export function pathIntroductionOrder(
  units: CourseUnit[],
  progress: Map<string, UnitProgress>,
  existing: ReadonlySet<string>,
): CardDefinition[] {
  return units
    .filter((unit) => {
      const state = progress.get(unit.id)?.state;
      return state === 'unlocked' || state === 'learning';
    })
    .flatMap((unit) => unit.cards.filter((card) => !existing.has(card.id)));
}

/** One course's part in planning the day's new cards: its content, and the learner's cards and reviews of it. */
export type IntroductionSource = {
  content: OpeningContent;
  cards: Pick<Card, 'id' | 'state' | 'scheduledDays'>[];
  reviews: Pick<Review, 'cardId' | 'at' | 'rating'>[];
};

/**
 * The next new cards to introduce today, at most `quota`, taking turns between courses so one does not hog the day.
 * Each course offers cards in path order from its unlocked units and the units being learned (`pathIntroductionOrder`),
 * so a locked unit waits until the unit it grows from is passed, and quizzes are never introduced. Due reviews are not
 * planned here: a session always puts them first (`planSession`). Returns the cards to insert.
 */
export function planIntroductions(
  courses: IntroductionSource[],
  quota: number,
  now: Date,
  options: CardOptions = {},
): Card[] {
  const queues = courses.map(({ content, cards, reviews }) => {
    const units = courseUnits(content, options);
    return pathIntroductionOrder(units, unitProgress(units, cards, reviews), new Set(cards.map((card) => card.id)));
  });
  const chosen: CardDefinition[] = [];
  for (let round = 0; chosen.length < quota; round++) {
    let any = false;
    for (const queue of queues) {
      const next = queue[round];
      if (!next || chosen.length >= quota) continue;
      any = true;
      chosen.push(next);
    }
    if (!any) break;
  }
  // Due times one millisecond apart, earliest first and all already past, so a session studies the new cards in the
  // order they were introduced and every one of them is due immediately.
  return chosen.map((definition, i) => newCard(definition, new Date(now.getTime() - (chosen.length - i))));
}

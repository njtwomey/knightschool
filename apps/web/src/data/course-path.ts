import {
  courseUnits,
  unitProgress,
  type Card,
  type CourseUnit,
  type OpeningContent,
  type Review,
  type UnitProgress,
} from '@knightschool/core';
import { whenStorageReady } from './storage';
import { getCardOptions } from './training-settings';

/** A course's study path: its units in order, and each unit's state from the learner's cards and reviews. */
export type CoursePath = {
  units: CourseUnit[];
  progress: Map<string, UnitProgress>;
  cards: Card[];
  reviews: Review[];
  /** False when the database could not be read: the units are cut with the default settings and nothing is studied. */
  saved: boolean;
};

/**
 * Cuts a course into units with the learner's card settings (the same cut the quiz introduces cards by) and works out
 * where they are. Nothing is stored: the state comes from the cards and the review log.
 */
export async function loadCoursePath(content: OpeningContent): Promise<CoursePath> {
  const id = content.opening.id;
  try {
    const { storage } = await whenStorageReady();
    const [options, cards, reviews] = await Promise.all([
      getCardOptions(storage),
      storage.cards.byOpening(id),
      storage.reviews.byOpening(id),
    ]);
    const units = courseUnits(content, options);
    return { units, progress: unitProgress(units, cards, reviews), cards, reviews, saved: true };
  } catch {
    const units = courseUnits(content);
    return { units, progress: unitProgress(units, [], []), cards: [], reviews: [], saved: false };
  }
}

/** Whether a unit is done with for now: passed, or graduated. */
export const isPassed = (progress: UnitProgress | undefined) =>
  progress?.state === 'passed' || progress?.state === 'graduated';

import type { Review } from './schema/user';

/** A right answer is anything but a miss: hard means right with help, which still counts as recalled. */
export const isRecalled = (review: Pick<Review, 'rating'>) => review.rating !== 'again';

export type DayCount = { day: string; total: number; recalled: number };

/** Reviews per calendar day for the given days (oldest first). `dayOf` turns a timestamp into the learner's local day. */
export function dailyCounts(reviews: Review[], days: string[], dayOf: (at: string) => string): DayCount[] {
  const byDay = new Map(days.map((day) => [day, { day, total: 0, recalled: 0 }]));
  for (const review of reviews) {
    const entry = byDay.get(dayOf(review.at));
    if (!entry) continue;
    entry.total++;
    if (isRecalled(review)) entry.recalled++;
  }
  return days.map((day) => byDay.get(day)!);
}

/** Share of reviews that were recalled, 0 to 1, or null when there are none. */
export function accuracy(reviews: Pick<Review, 'rating'>[]): number | null {
  return reviews.length === 0 ? null : reviews.filter(isRecalled).length / reviews.length;
}

/**
 * Days in a row with at least one review, counting back from today. A streak is still alive if today has no review
 * yet but yesterday does, so it does not read as broken first thing in the morning.
 */
export function streak(reviewDays: ReadonlySet<string>, today: string, previous: (day: string) => string): number {
  let day = reviewDays.has(today) ? today : previous(today);
  let count = 0;
  while (reviewDays.has(day)) {
    count++;
    day = previous(day);
  }
  return count;
}

export type Missed = { cardId: string; misses: number; total: number };

/** The cards missed most often (at least `minMisses` times), worst first. */
export function mostMissed(reviews: Pick<Review, 'cardId' | 'rating'>[], limit: number, minMisses = 2): Missed[] {
  const byCard = new Map<string, Missed>();
  for (const review of reviews) {
    const entry = byCard.get(review.cardId) ?? { cardId: review.cardId, misses: 0, total: 0 };
    entry.total++;
    if (!isRecalled(review)) entry.misses++;
    byCard.set(review.cardId, entry);
  }
  return [...byCard.values()]
    .filter((entry) => entry.misses >= minMisses)
    .sort((a, b) => b.misses - a.misses || b.misses / b.total - a.misses / a.total || a.cardId.localeCompare(b.cardId))
    .slice(0, limit);
}

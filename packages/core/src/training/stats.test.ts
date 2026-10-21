import { describe, expect, it } from 'vitest';
import type { Review } from '../schema/user';
import { accuracy, dailyCounts, mostMissed, streak } from './stats';

const review = (cardId: string, rating: Review['rating'], at: string): Review => ({
  id: `${cardId}-${at}-${rating}`,
  cardId,
  at,
  rating,
  playedUci: null,
  msToAnswer: 1000,
  hintUsed: false,
  sessionId: 's',
});

const dayOf = (at: string) => at.slice(0, 10);
const previous = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

describe('stats', () => {
  const reviews = [
    review('a', 'easy', '2026-10-12T09:00:00Z'),
    review('a', 'again', '2026-10-12T09:05:00Z'),
    review('b', 'hard', '2026-10-13T10:00:00Z'),
    review('a', 'again', '2026-10-13T10:01:00Z'),
    review('a', 'good', '2026-10-14T08:00:00Z'),
  ];

  it('counts reviews and recalled answers per day, including empty days, oldest first', () => {
    expect(dailyCounts(reviews, ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'], dayOf)).toEqual([
      { day: '2026-10-11', total: 0, recalled: 0 },
      { day: '2026-10-12', total: 2, recalled: 1 },
      { day: '2026-10-13', total: 2, recalled: 1 },
      { day: '2026-10-14', total: 1, recalled: 1 },
    ]);
  });

  it('ignores reviews outside the days asked for', () => {
    expect(dailyCounts(reviews, ['2026-10-14'], dayOf)).toEqual([{ day: '2026-10-14', total: 1, recalled: 1 }]);
  });

  it('measures accuracy, counting help as recalled, and is null with no reviews', () => {
    expect(accuracy(reviews)).toBeCloseTo(3 / 5);
    expect(accuracy([])).toBeNull();
  });

  it('counts days in a row, and keeps yesterday’s streak alive until today has a review', () => {
    const days = new Set(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(streak(days, '2026-10-14', previous)).toBe(3);
    expect(streak(new Set(['2026-10-12', '2026-10-13']), '2026-10-14', previous)).toBe(2);
    expect(streak(new Set(['2026-10-11', '2026-10-13']), '2026-10-14', previous)).toBe(1);
    expect(streak(new Set(['2026-10-10']), '2026-10-14', previous)).toBe(0);
    expect(streak(new Set(), '2026-10-14', previous)).toBe(0);
  });

  it('lists the cards missed most, worst first, ignoring one-off slips', () => {
    expect(mostMissed(reviews, 5)).toEqual([{ cardId: 'a', misses: 2, total: 4 }]);
    expect(mostMissed(reviews, 5, 1).map((entry) => entry.cardId)).toEqual(['a']);
    expect(
      mostMissed([...reviews, review('c', 'again', '2026-10-14T09:00:00Z')], 5, 1).map((entry) => entry.cardId),
    ).toEqual(['a', 'c']);
    expect(mostMissed(reviews, 0)).toEqual([]);
  });
});

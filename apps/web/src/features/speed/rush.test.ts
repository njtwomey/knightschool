import { testManifest } from '@/test-manifest';
import { buildOpening, courseUnits, newCard, parsePgn, unitProgress, type Review } from '@knightschool/core';
import { describe, expect, it, vi } from 'vitest';
import type * as CoursePathModule from '@/data/course-path';
import type { CoursePath } from '@/data/course-path';

const content = buildOpening('t', testManifest(), [
  {
    id: 'main',
    kind: 'line',
    game: parsePgn(`[Event "x"]
[Opening "T"]
[Variation "Main"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 *`),
    source: 'main.pgn',
  },
]);
const units = courseUnits(content);
const NOW = new Date('2026-10-21T10:00:00.000Z');
let passedUnits = 1;

/** The first `passedUnits` units passed: every move answered right twice. */
function path(): CoursePath {
  const studied = units.slice(0, passedUnits);
  const cards = studied.flatMap((unit) => unit.cards.map((card) => newCard(card, NOW)));
  const reviews: Review[] = cards.flatMap((card) =>
    [1, 2].map((minute) => ({
      id: `${card.id}:${minute}`,
      cardId: card.id,
      at: new Date(NOW.getTime() + minute * 60_000).toISOString(),
      rating: 'good' as const,
      playedUci: null,
      msToAnswer: 1000,
      hintUsed: false,
      sessionId: 's',
    })),
  );
  return { units, progress: unitProgress(units, cards, reviews), cards, reviews, saved: true };
}

vi.mock('@/data/content', () => ({
  loadOpening: () => Promise.resolve(content),
  loadIndex: () => Promise.resolve([]),
}));
vi.mock('@/data/course-path', async (original) => ({
  ...(await original<typeof CoursePathModule>()),
  loadCoursePath: () => Promise.resolve(path()),
}));

const { rushQueue } = await import('./store');
const { rushCourse, rushSource } = await import('@/data/practice-config');

describe('opening rush', () => {
  it('names its source after the course', () => {
    expect(rushSource('caro-kann')).toBe('rush:caro-kann');
    expect(rushCourse('rush:caro-kann')).toBe('caro-kann');
    expect(rushCourse('caro-kann')).toBeUndefined();
    expect(rushCourse('learning')).toBeUndefined();
  });

  it('plays only passed units, each from the start to its end, coming round again to fill the run', async () => {
    passedUnits = 1;
    const queue = await rushQueue('t', 3, 'random');
    expect(queue).toHaveLength(3);
    for (const line of queue) {
      expect(line.lineName).toBe('Main, unit 1');
      expect(line.steps.map((step) => step.edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3']);
    }
    passedUnits = 2;
    const both = await rushQueue('t', 10, 'popular');
    expect(new Set(both.map((line) => line.lineName))).toEqual(new Set(['Main, unit 1', 'Main, unit 2']));
  });

  it('refuses when no unit is passed', async () => {
    passedUnits = 0;
    await expect(rushQueue('t', 3, 'random')).rejects.toThrow(/No unit of .* is passed yet/);
  });
});

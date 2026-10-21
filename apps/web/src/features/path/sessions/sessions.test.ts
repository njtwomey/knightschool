import { testManifest } from '@/test-manifest';
import {
  buildOpening,
  courseUnits,
  newCard,
  parsePgn,
  unitProgress,
  type Card,
  type CourseUnit,
  type Review,
} from '@knightschool/core';
import { describe, expect, it } from 'vitest';
import type { CoursePath } from '@/data/course-path';
import { SESSION_TYPES } from '.';
import { nextMoves } from './next-moves';
import { nextUnit } from './next-unit';
import { openingRush } from './opening-rush';

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
const at = (minute: number) => new Date(NOW.getTime() + minute * 60_000).toISOString();
const answer = (cardId: string, rating: Review['rating'], minute: number): Review => ({
  id: `${cardId}:${minute}`,
  cardId,
  at: at(minute),
  rating,
  playedUci: null,
  msToAnswer: 1000,
  hintUsed: false,
  sessionId: 's',
});

/** A path where the given units' cards exist, the first `passed` of each answered right twice. */
function pathWith(studied: { unit: CourseUnit; passed: number }[]): CoursePath {
  const cards: Card[] = studied.flatMap(({ unit }) => unit.cards.map((card) => newCard(card, NOW)));
  const reviews = studied.flatMap(({ unit, passed }) =>
    unit.cards.slice(0, passed).flatMap((card) => [answer(card.id, 'good', 1), answer(card.id, 'easy', 2)]),
  );
  return { units, progress: unitProgress(units, cards, reviews), cards, reviews, saved: true };
}

const [first, second] = units as [CourseUnit, CourseUnit];
const pick = (type: (typeof SESSION_TYPES)[number], path: CoursePath) => type.pick({ content, path });

describe('session types', () => {
  it('are registered in the order shown', () => {
    expect(SESSION_TYPES.map((type) => type.id)).toEqual(['next-unit', 'next-moves', 'opening-rush']);
    expect(units.map((unit) => unit.cards.length)).toEqual([4, 3]);
  });

  it.each([
    ['nothing studied: learn the first unit', [], { href: '/play/t/main/learn/1', summary: 'Learn Unit 1 (Main).' }],
    [
      'the first unit under way: drill it',
      [{ unit: first, passed: 2 }],
      { href: '/play/t/main/drill/1', summary: 'Drill Unit 1 (Main).' },
    ],
    [
      'the first unit passed: learn the next',
      [{ unit: first, passed: 4 }],
      { href: '/play/t/main/learn/2', summary: 'Learn Unit 2 (Main).' },
    ],
  ] as [string, { unit: CourseUnit; passed: number }[], object][])('next unit, %s', (_name, studied, expected) => {
    expect(pick(nextUnit, pathWith(studied))).toMatchObject({ ready: true, ...expected });
  });

  it('next unit has nothing to start once every unit is passed', () => {
    const done = pathWith([
      { unit: first, passed: 4 },
      { unit: second, passed: 3 },
    ]);
    expect(pick(nextUnit, done)).toEqual({ ready: false, reason: 'Every unit is passed. The quiz keeps them fresh.' });
  });

  it.each([
    ['from the start of a new unit, learned', [], '/play/t/main/learn/1/1-3', 'Moves 1 to 3 of Unit 1 (Main).'],
    ['after the moves already sure, drilled', [{ unit: first, passed: 2 }], '/play/t/main/drill/1/3-4', 'Moves 3 to 4'],
    ['the last move alone', [{ unit: first, passed: 3 }], '/play/t/main/drill/1/4-4', 'Move 4 of Unit 1 (Main).'],
  ] as [string, { unit: CourseUnit; passed: number }[], string, string][])(
    'next three moves, %s',
    (_name, studied, href, summary) => {
      const picked = pick(nextMoves, pathWith(studied));
      expect(picked).toMatchObject({ ready: true, href });
      expect(picked.ready && picked.summary).toContain(summary);
    },
  );

  it('opening rush needs a passed unit, and then goes to Speed with this course set', () => {
    expect(pick(openingRush, pathWith([{ unit: first, passed: 2 }]))).toMatchObject({ ready: false });
    const ready = pick(openingRush, pathWith([{ unit: first, passed: 4 }]));
    expect(ready).toMatchObject({ ready: true, href: '/speed', summary: '1 passed unit to play.' });
  });
});

import { manifestOf } from './test-manifest';
import { describe, expect, it } from 'vitest';
import { reduceAttempt, startAttempt, type Attempt, type AttemptAction } from './attempt';
import { EASY_WITHIN_MS } from './constants';
import { autoGrade } from './grading';
import { parsePgn } from './pgn';
import { createScheduler, newCard, scheduleReview } from './scheduler';
import type { OpeningContent } from './schema/content';
import {
  cardDefinitions,
  cardId,
  introductionOrder,
  isQuizCard,
  planIntroductions,
  planSession,
  quizCardId,
  quizDefinitions,
  recordAnswer,
  recordQuizAnswer,
} from './training';
import { buildOpening } from './tree';

const NOW = new Date('2026-10-13T10:00:00.000Z');

describe('autoGrade', () => {
  it.each([
    [
      'correct, fast, no hint',
      { correct: true, wrongTries: 0, hintUsed: false, msToAnswer: EASY_WITHIN_MS - 1 },
      'easy',
    ],
    ['correct, slow, no hint', { correct: true, wrongTries: 0, hintUsed: false, msToAnswer: EASY_WITHIN_MS }, 'good'],
    ['correct after a hint', { correct: true, wrongTries: 0, hintUsed: true, msToAnswer: 1000 }, 'hard'],
    ['correct after one wrong try', { correct: true, wrongTries: 1, hintUsed: false, msToAnswer: 1000 }, 'hard'],
    ['wrong twice', { correct: false, wrongTries: 2, hintUsed: false, msToAnswer: 1000 }, 'again'],
    ['move shown', { correct: false, wrongTries: 0, hintUsed: false, msToAnswer: 1000 }, 'again'],
  ] as const)('%s is %s', (_name, summary, rating) => {
    expect(autoGrade(summary)).toBe(rating);
  });
});

const play = (actions: AttemptAction[], expected = 'e2e4'): Attempt =>
  actions.reduce((attempt, action) => reduceAttempt(attempt, action, expected), startAttempt());

describe('attempt', () => {
  it.each([
    ['first try, fast', [{ type: 'move', uci: 'e2e4', elapsedMs: 2000 }], 'easy'],
    ['first try, slow', [{ type: 'move', uci: 'e2e4', elapsedMs: 9000 }], 'good'],
    [
      'one wrong then right',
      [
        { type: 'move', uci: 'd2d4', elapsedMs: 1000 },
        { type: 'move', uci: 'e2e4', elapsedMs: 3000 },
      ],
      'hard',
    ],
    ['hint then right', [{ type: 'hint' }, { type: 'move', uci: 'e2e4', elapsedMs: 3000 }], 'hard'],
    [
      'wrong twice',
      [
        { type: 'move', uci: 'd2d4', elapsedMs: 1000 },
        { type: 'move', uci: 'c2c4', elapsedMs: 2000 },
        { type: 'move', uci: 'e2e4', elapsedMs: 4000 }, // the move is shown after two misses, then played
      ],
      'again',
    ],
    ['shown, then played', [{ type: 'show' }, { type: 'move', uci: 'e2e4', elapsedMs: 4000 }], 'again'],
  ] as [string, AttemptAction[], string][])('%s is rated %s', (_name, actions, rating) => {
    const attempt = play(actions);
    expect(attempt.status).toBe('done');
    expect(attempt.rating).toBe(rating);
  });

  it('stays open after one wrong move, reveals the move after two, and finishes only when it is played', () => {
    const one = play([{ type: 'move', uci: 'd2d4', elapsedMs: 1000 }]);
    expect(one).toMatchObject({ status: 'asking', wrongTries: 1, shown: false, rating: null });
    const two = reduceAttempt(one, { type: 'move', uci: 'c2c4', elapsedMs: 2000 }, 'e2e4');
    expect(two).toMatchObject({ status: 'asking', wrongTries: 2, shown: true, rating: null });
    const done = reduceAttempt(two, { type: 'move', uci: 'e2e4', elapsedMs: 3000 }, 'e2e4');
    expect(done).toMatchObject({ status: 'done', rating: 'again' });
    expect(reduceAttempt(done, { type: 'move', uci: 'a2a3', elapsedMs: 4000 }, 'e2e4')).toBe(done);
  });
});

const game = (moves: string, name: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "${name}"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]
${name === 'trap' ? '[Refutes "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4"]' : ''}

${moves}`);

const base = manifestOf({ name: 'T', lines: ['main', 'side'], traps: ['trap'] });
const withKinds = (side: 'sideline' | 'rare' | 'main', trap: 'for-us' | 'against-us', alternative = false) => ({
  ...base,
  lines: base.lines.map((line) => (line.file === 'side' ? { ...line, kind: side, alternative } : line)),
  traps: base.traps.map((entry) => ({ ...entry, kind: trap })),
});
const manifest = withKinds('sideline', 'against-us');

const content = (m = manifest): OpeningContent =>
  buildOpening('t', m, [
    { id: 'main', kind: 'line', game: game('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *', 'main'), source: 'main.pgn' },
    { id: 'side', kind: 'line', game: game('1. e4 e5 2. Nf3 Nf6 3. Nxe5 *', 'side'), source: 'side.pgn' },
    {
      id: 'trap',
      kind: 'refutation',
      game: game('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4 *', 'trap'),
      source: 'trap.pgn',
    },
  ]);

describe('cardDefinitions', () => {
  it('orders main line, then other lines, then refutation-only positions', () => {
    const cards = cardDefinitions(content());
    expect(cards.map((card) => card.expectedUci)).toEqual(['e2e4', 'g1f3', 'f1c4', 'f3e5', 'f3d4']);
    expect(cards[0]!.id).toBe(cardId('t', cards[0]!.epd));
  });

  it('leaves out rare lines, alternatives and traps we spring, unless rare lines are switched on', () => {
    const expected = (c: OpeningContent, options = {}) => cardDefinitions(c, options).map((card) => card.expectedUci);
    expect(expected(content(withKinds('rare', 'against-us')))).toEqual(['e2e4', 'g1f3', 'f1c4', 'f3d4']);
    expect(expected(content(withKinds('rare', 'against-us')), { includeRare: true })).toContain('f3e5');
    // An alternative never earns a card, even with rare lines on.
    expect(expected(content(withKinds('sideline', 'against-us', true)), { includeRare: true })).not.toContain('f3e5');
    // A trap we spring is shown and quizzed, never drilled: its own positions earn no card.
    expect(expected(content(withKinds('sideline', 'for-us')))).not.toContain('f3d4');
    expect(expected(content(withKinds('sideline', 'against-us')))).toContain('f3d4');
  });

  it('drops a sideline whose position too few games reach, and keeps unknown popularity and the main line', () => {
    const c = content();
    const sideNode = Object.values(c.nodes).find((node) => node.moves.some((move) => move.uci === 'f3e5'))!;
    const rare = { ...c, nodes: { ...c.nodes, [sideNode.epd]: { ...sideNode, popularity: 0.01 } } };
    expect(cardDefinitions(rare).map((card) => card.expectedUci)).not.toContain('f3e5');
    expect(cardDefinitions(c).map((card) => card.expectedUci)).toContain('f3e5');
    const rareMain = Object.values(c.nodes).find((node) => node.moves.some((move) => move.uci === 'e2e4'))!;
    const stillThere = { ...c, nodes: { ...c.nodes, [rareMain.epd]: { ...rareMain, popularity: 0 } } };
    expect(cardDefinitions(stillThere).map((card) => card.expectedUci)).toContain('e2e4');
  });
});

describe('planIntroductions', () => {
  it('introduces at most the quota, skips existing cards, and takes turns between openings', () => {
    const a = content();
    const b = { ...content(), opening: { ...content().opening, id: 'u' } };
    const existing = new Set([cardId('t', a.opening.rootEpd)]);
    const cards = planIntroductions(
      [
        { content: a, existing },
        { content: b, existing: new Set() },
      ],
      4,
      NOW,
    );
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.openingId)).toEqual(['t', 'u', 't', 'u']);
    expect(cards.every((card) => card.state === 'new' && Date.parse(card.due) <= NOW.getTime())).toBe(true);
    // Due times keep the introduction order, so a session studies them in that order.
    expect(planSession([...cards].reverse()).map((card) => card.id)).toEqual(cards.map((card) => card.id));
    expect(planIntroductions([{ content: a, existing }], 0, NOW)).toEqual([]);
  });

  it('stops when everything is introduced', () => {
    const a = content();
    expect(planIntroductions([{ content: a, existing: new Set() }], 100, NOW)).toHaveLength(cardDefinitions(a).length);
  });
});

describe('planSession', () => {
  const card = (id: string, state: 'new' | 'review', due: string) => ({
    ...newCard({ id, openingId: 't', epd: id, expectedUci: 'e2e4' }, NOW),
    state,
    due,
  });
  it('puts seen cards first by due date, then new ones, up to the size', () => {
    const planned = planSession(
      [
        card('n1', 'new', '2026-10-13T09:00:00.000Z'),
        card('r2', 'review', '2026-10-13T08:00:00.000Z'),
        card('r1', 'review', '2026-10-12T08:00:00.000Z'),
      ],
      3,
    );
    expect(planned.map((c) => c.id)).toEqual(['r1', 'r2', 'n1']);
    expect(planSession([card('a', 'new', NOW.toISOString()), card('b', 'new', NOW.toISOString())], 1)).toHaveLength(1);
  });
});

describe('scheduling a review', () => {
  const scheduler = createScheduler({ fuzz: false });
  const fresh = newCard({ id: 't:x', openingId: 't', epd: 'x', expectedUci: 'e2e4' }, NOW);

  it('moves a new card into FSRS state and later than now', () => {
    const next = scheduleReview(scheduler, fresh, 'good', NOW);
    expect(next.reps).toBe(1);
    expect(next.state).not.toBe('new');
    expect(next.lastReview).toBe(NOW.toISOString());
    expect(next.stability).toBeGreaterThan(0);
    expect(Date.parse(next.due)).toBeGreaterThan(NOW.getTime());
  });

  it('schedules an easy answer further out than a hard one, and a lapse back into relearning', () => {
    const reviewed = scheduleReview(
      scheduler,
      scheduleReview(scheduler, fresh, 'good', NOW),
      'good',
      new Date(Date.parse(NOW.toISOString()) + 86_400_000),
    );
    const later = new Date(Date.parse(reviewed.due));
    const easy = scheduleReview(scheduler, reviewed, 'easy', later);
    const hard = scheduleReview(scheduler, reviewed, 'hard', later);
    const lapse = scheduleReview(scheduler, reviewed, 'again', later);
    expect(Date.parse(easy.due)).toBeGreaterThan(Date.parse(hard.due));
    expect(lapse.lapses).toBe(reviewed.lapses + 1);
    expect(lapse.state).toBe('relearning');
  });

  it('survives being stored and loaded between reviews', () => {
    const once = scheduleReview(scheduler, fresh, 'good', NOW);
    const stored = JSON.parse(JSON.stringify(once));
    const day = new Date(Date.parse(once.due));
    expect(scheduleReview(scheduler, stored, 'good', day)).toEqual(scheduleReview(scheduler, once, 'good', day));
  });
});

describe('a ten-card session', () => {
  it('gives every card FSRS state and writes one review row per answer', () => {
    const scheduler = createScheduler({ fuzz: false });
    const cards = Array.from({ length: 10 }, (_, i) =>
      newCard({ id: `t:${i}`, openingId: 't', epd: `${i}`, expectedUci: 'e2e4' }, NOW),
    );
    const results = cards.map((card) => {
      const attempt = play([{ type: 'move', uci: 'e2e4', elapsedMs: 3000 }]);
      return recordAnswer(scheduler, card, attempt, 'session-1', NOW);
    });
    expect(results.every(({ card }) => card.reps === 1 && card.state !== 'new' && card.stability > 0)).toBe(true);
    expect(new Set(results.map(({ review }) => review.id)).size).toBe(10);
    expect(
      results.every(({ review }) => review.rating === 'easy' && review.sessionId === 'session-1' && !review.hintUsed),
    ).toBe(true);
  });

  it('records no played move when the answer was shown, and refuses an unfinished attempt', () => {
    const scheduler = createScheduler({ fuzz: false });
    const card = newCard({ id: 't:0', openingId: 't', epd: '0', expectedUci: 'e2e4' }, NOW);
    const shown = recordAnswer(
      scheduler,
      card,
      play([
        { type: 'move', uci: 'd2d4', elapsedMs: 1 },
        { type: 'show' },
        { type: 'move', uci: 'e2e4', elapsedMs: 2000 },
      ]),
      's',
      NOW,
    );
    expect(shown.review).toMatchObject({ rating: 'again', playedUci: null });
    expect(() => recordAnswer(scheduler, card, startAttempt(), 's', NOW)).toThrow();
  });
});

describe('quiz cards', () => {
  const withQuizzes = (): OpeningContent => {
    const base = content();
    const quiz = (id: string) => ({
      id,
      epd: base.opening.rootEpd,
      prompt: 'Why?',
      accept: [{ keywords: [['fork']], all: false, feedback: 'ok', partial: false }],
      reveal: 'Because.',
    });
    return { ...base, quizzes: [quiz('one'), quiz('two')] };
  };

  it('are cards with their own id and no expected move', () => {
    const defs = quizDefinitions(withQuizzes());
    expect(defs.map((def) => def.id)).toEqual([quizCardId('t', 'one'), quizCardId('t', 'two')]);
    expect(defs.every((def) => def.expectedUci === '' && isQuizCard(def))).toBe(true);
    expect(isQuizCard({ id: cardId('t', 'x') })).toBe(false);
  });

  it('arrive after every fourth move card, the rest at the end', () => {
    const order = introductionOrder(withQuizzes());
    const moves = cardDefinitions(withQuizzes());
    expect(order).toHaveLength(moves.length + 2);
    expect(order.slice(0, 4).every((def) => !isQuizCard(def))).toBe(true);
    expect(isQuizCard(order[4]!)).toBe(true);
    expect(order.filter(isQuizCard)).toHaveLength(2);
  });

  it('are introduced like any other card', () => {
    const c = withQuizzes();
    const cards = planIntroductions([{ content: c, existing: new Set() }], 100, NOW);
    expect(cards.filter(isQuizCard)).toHaveLength(2);
    expect(cards.filter((card) => !isQuizCard(card))).toHaveLength(cardDefinitions(c).length);
  });

  it('are graded matched or missed, with a review row and an attempt row', () => {
    const scheduler = createScheduler({ fuzz: false });
    const card = newCard({ id: quizCardId('t', 'one'), openingId: 't', epd: 'x', expectedUci: '' }, NOW);
    const right = recordQuizAnswer(scheduler, card, { matched: true, answer: 'a fork', msToAnswer: 4321.7 }, 's', NOW);
    expect(right.review).toMatchObject({
      rating: 'good',
      playedUci: null,
      hintUsed: false,
      cardId: card.id,
      msToAnswer: 4322,
    });
    expect(right.attempt).toMatchObject({ quizId: card.id, matched: true, answer: 'a fork' });
    expect(right.card.reps).toBe(1);
    const wrong = recordQuizAnswer(scheduler, card, { matched: false, answer: 'dunno', msToAnswer: 900 }, 's', NOW);
    expect(wrong.review.rating).toBe('again');
    expect(wrong.attempt.matched).toBe(false);
  });
});

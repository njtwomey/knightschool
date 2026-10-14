import {
  buildOpening,
  createScheduler,
  parsePgn,
  planIntroductions,
  planSession,
  recordAnswer,
  reduceAttempt,
  startAttempt,
  type AttemptAction,
} from '@knightschool/core';
import { testManifest } from '@/test-manifest';
import { openMemoryStorage } from '@knightschool/storage/testing';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-10-13T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const game = parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. a4 Ba7 *`);

const content = buildOpening('t', testManifest(), [{ id: 'main', kind: 'line', game, source: 'main.pgn' }]);

// What the learner does with each card: a spread of ratings so the cards are due at different times.
const ANSWERS: AttemptAction[][] = [
  [{ type: 'move', uci: '', elapsedMs: 2000 }], // easy
  [{ type: 'move', uci: '', elapsedMs: 9000 }], // good
  [{ type: 'hint' }, { type: 'move', uci: '', elapsedMs: 9000 }], // hard
  [{ type: 'show' }, { type: 'move', uci: '', elapsedMs: 9000 }], // again
];

describe('a training session against a real database', () => {
  it('schedules every card, writes one review each, and the due count a day later is what ts-fsrs scheduled', async () => {
    const { storage } = await openMemoryStorage();
    const scheduler = createScheduler({ fuzz: false });

    await storage.cards.insertMissing(planIntroductions([{ content, existing: new Set() }], 10, NOW));
    const queue = planSession(await storage.cards.due(NOW.toISOString()));
    expect(queue).toHaveLength(8); // White makes eight moves in this line

    const scheduled = [];
    for (const [i, card] of queue.entries()) {
      const actions = ANSWERS[i % ANSWERS.length]!.map((action) =>
        action.type === 'move' ? { ...action, uci: card.expectedUci } : action,
      );
      const attempt = actions.reduce((state, action) => reduceAttempt(state, action, card.expectedUci), startAttempt());
      const answer = recordAnswer(scheduler, card, attempt, 'session-1', NOW);
      await storage.reviews.record(answer.card, answer.review);
      scheduled.push(answer.card);
    }

    expect((await storage.stats()).reviews).toBe(8);
    expect(scheduled.every((card) => card.reps === 1 && card.state !== 'new' && card.stability > 0)).toBe(true);

    // Right after the session only a missed card (relearning, due in minutes) can still be due today.
    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    const dueLater = scheduled.filter((card) => Date.parse(card.due) <= later.getTime()).length;
    expect(await storage.cards.countDue(later.toISOString())).toBe(dueLater);

    for (const days of [1, 3, 10, 40]) {
      const at = new Date(NOW.getTime() + days * DAY).toISOString();
      const predicted = scheduled.filter((card) => card.due <= at).length;
      expect(await storage.cards.countDue(at), `${days} days later`).toBe(predicted);
    }
    // The easiest card comes back last.
    const dues = scheduled.map((card) => card.due).sort();
    expect(scheduled[0]!.due).toBe(dues.at(-1));
  });
});

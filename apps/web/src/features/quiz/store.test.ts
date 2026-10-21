import { buildOpening, cardId, newCard, parsePgn, type Card } from '@knightschool/core';
import type { BrowserStorage } from '@knightschool/storage';
import { openMemoryStorage } from '@knightschool/storage/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testManifest } from '@/test-manifest';
import { setEnrolled, setNewPerDay } from '@/data/training-settings';

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

let memory: BrowserStorage;
vi.mock('@/data/storage', () => ({
  whenStorageReady: () => Promise.resolve(memory),
  useStorage: { getState: () => ({ storage: memory }) },
}));
vi.mock('@/data/content', () => ({
  loadIndex: () => Promise.resolve([{ id: 't', name: 'T' }]),
  loadOpening: () => Promise.resolve(content),
}));

const { currentQuestion, useQuiz, DUE } = await import('./store');
const { saveConfig, savedConfig } = await import('@/data/practice-config');
const review = () => useQuiz.getState();
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function startSession({ newPerDay = 10, moves = 2 as 0 | 1 | 2 | 3 | 4 | 5 } = {}) {
  memory = (await openMemoryStorage()) as unknown as BrowserStorage;
  const now = new Date();
  await setEnrolled(memory.storage, ['t'], now);
  await setNewPerDay(memory.storage, newPerDay, now);
  useQuiz.setState({ phase: 'idle', scope: null });
  await review().start({ source: DUE, weighting: 'random', moves });
}

/** Answers the card being asked with its move and moves on. Returns the card's id. */
async function answer(): Promise<string> {
  const card = review().queue[review().index]!;
  review().submitMove(card.expectedUci);
  review().skip();
  await flush();
  return card.id;
}

describe('the quiz session', () => {
  beforeEach(() => review().stop());

  it('asks a follow-on that is also due later once, and records it once against its latest schedule', async () => {
    await startSession();
    expect(review().queue).toHaveLength(4); // the first unit: White's first four moves
    const asked: string[] = [];
    while (review().phase === 'asking') asked.push(await answer());
    // Each move is followed on to the next: the later copy in the queue is taken out, not asked again.
    expect(asked).toHaveLength(4);
    expect(new Set(asked).size).toBe(4);
    await flush();
    const reviews = await memory.storage.reviews.since('1970-01-01T00:00:00.000Z');
    expect(reviews.map((row) => row.cardId).sort()).toEqual([...asked].sort());
    for (const id of asked) expect((await memory.storage.cards.get(id))!.reps).toBe(1);
  });

  it('puts one follow-on next however often Skip is pressed while it loads', async () => {
    // Only the first card is introduced, so the follow-on is looked up in the database (and not saved).
    await startSession({ newPerDay: 1 });
    expect(review().queue).toHaveLength(1);
    const first = review().queue[0]!;
    review().submitMove(first.expectedUci);
    review().skip();
    review().skip();
    await flush();
    expect(review().index).toBe(1);
    expect(review().queue).toHaveLength(2);
    expect(review().queue[1]!.expectedUci).toBe('g1f3');
    expect(review().unsaved).toEqual([review().queue[1]!.id]);
  });

  it('leaves out a due card whose position or move the course no longer has', async () => {
    memory = (await openMemoryStorage()) as unknown as BrowserStorage;
    const past = new Date(Date.now() - 60_000);
    const gone = '8/8/8/8/8/8/8/K6k w - -';
    const stale: Card[] = [
      newCard({ id: cardId('t', gone), openingId: 't', epd: gone, expectedUci: 'a1a2' }, past),
      newCard(
        { id: cardId('t', content.opening.rootEpd), openingId: 't', epd: content.opening.rootEpd, expectedUci: 'a2a3' },
        past,
      ),
    ];
    await memory.storage.cards.insertMissing(stale);
    await setEnrolled(memory.storage, ['t'], past);
    await setNewPerDay(memory.storage, 0, past);
    useQuiz.setState({ phase: 'idle', scope: null });
    await review().start({ source: DUE, weighting: 'random', moves: 1 });
    expect(review().phase).toBe('summary');
    expect(review().queue).toEqual([]);
    // Asked anyway, such a card shows nothing rather than throwing.
    expect(currentQuestion({ queue: stale, index: 0, contents: { t: content } })).toBeNull();
    expect(currentQuestion({ queue: stale, index: 1, contents: { t: content } })).toBeNull();
  });

  it('keeps the session as it was set up when the set-up changes, until Start', async () => {
    await startSession({ moves: 1 });
    const { sessionId, queue } = review();
    expect(queue.length).toBeGreaterThan(1);
    // Changing the saved set-up (the card's Start saves it) does nothing to the session under way.
    saveConfig('quiz', { source: 'all', weighting: 'popular', moves: 3 });
    expect(savedConfig('quiz')).toEqual({ source: 'all', weighting: 'popular', moves: 3 });
    expect(review()).toMatchObject({ phase: 'asking', sessionId, index: 0, config: { source: DUE, moves: 1 } });
    // Its answers still go to the schedule.
    await answer();
    await flush();
    const saved = await memory.storage.reviews.since('1970-01-01T00:00:00.000Z');
    expect(saved).toHaveLength(1);
    expect(review().index).toBe(1);

    // Start begins a new session from the new set-up: free practice, which saves nothing.
    await review().start();
    expect(review().sessionId).not.toBe(sessionId);
    expect(review()).toMatchObject({ phase: 'asking', index: 0, config: { source: 'all', moves: 3 } });
    await answer();
    await flush();
    expect(await memory.storage.reviews.since('1970-01-01T00:00:00.000Z')).toHaveLength(1);
  });
});

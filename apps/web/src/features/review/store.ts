import {
  createScheduler,
  freePractice,
  isQuizCard,
  matchAnswer,
  recordQuizAnswer,
  type Quiz,
  nodeAt,
  pathTo,
  planIntroductions,
  planSession,
  reduceAttempt,
  recordAnswer,
  startAttempt,
  withPromotion,
  type Attempt,
  type Card,
  type LineEdge,
  type OpeningContent,
  type RatingName,
} from '@knightschool/core';
import type { Storage } from '@knightschool/storage';
import { create } from 'zustand';
import { loadIndex, loadOpening } from '@/data/content';
import { coursesFor, saveChoice, savedChoice } from '@/data/practice-source';
import { useStorage, whenStorageReady } from '@/data/storage';
import {
  addIntroducedToday,
  getEnrolled,
  getCardOptions,
  getIntroducedToday,
  getNewPerDay,
} from '@/data/training-settings';

const scheduler = createScheduler();
const SOURCE_KEY = 'knightschool.quiz.source';

/** "due" is the scheduled session; anything else is free practice from those courses. */
export const DUE = 'due';

/** Nothing waits for a click: a right answer shows a tick and the next card follows by itself. */
export const REVIEW_DELAYS = {
  afterCorrect: 700,
  wrongBadge: 900,
  quizRight: 2200,
} as const;

type Phase = 'idle' | 'loading' | 'asking' | 'summary' | 'error';

type ReviewState = {
  phase: Phase;
  error: string | null;
  queue: Card[];
  index: number;
  contents: Record<string, OpeningContent>;
  attempt: Attempt;
  sessionId: string;
  results: RatingName[];
  /** performance.now() when the current card was shown. */
  shownAt: number;
  badge: { square: string; kind: 'correct' | 'wrong' } | null;
  /** True between a finished answer and the next card, so the board does not take another move. */
  advancing: boolean;
  /** The result of the typed answer to the quiz being asked, shown until the next card. */
  quizResult: { matched: boolean; feedback: string | null; close: string | null; answer: string } | null;
  /** "due" (the review schedule), or where free practice draws from: learning, all, or a course id. */
  source: string;
  /** An earlier move of the position being asked, picked from the move table to look at; null shows the question. */
  viewing: number | null;
  /** True when an answer is shown and waits for Next: a miss has something to read. */
  holding: boolean;
  view: (index: number | null) => void;

  start: () => Promise<void>;
  setSource: (source: string) => void;
  /** Returns true when the move was the expected one. Illegal moves are ignored. */
  submitMove: (uci: string) => boolean;
  /** A typed answer to a quiz card. */
  submitAnswer: (answer: string) => void;
  /** Moves on early, after an answer has been shown. */
  skip: () => void;
  hint: () => void;
  show: () => void;
  stop: () => void;
};

let timers: ReturnType<typeof setTimeout>[] = [];
const later = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
const clearTimers = () => {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
};

const storageOrThrow = (): Storage => {
  const { storage } = useStorage.getState();
  if (!storage) throw new Error('Your data is not available, so reviews cannot be saved.');
  return storage.storage;
};

export const useReview = create<ReviewState>((set, get) => {
  function advance() {
    const { index, queue } = get();
    if (index + 1 >= queue.length)
      set({ phase: 'summary', badge: null, advancing: false, quizResult: null, holding: false });
    else
      set({
        index: index + 1,
        attempt: startAttempt(),
        badge: null,
        advancing: false,
        quizResult: null,
        viewing: null,
        holding: false,
        shownAt: performance.now(),
      });
  }

  return {
    phase: 'idle',
    error: null,
    queue: [],
    index: 0,
    contents: {},
    attempt: startAttempt(),
    sessionId: '',
    results: [],
    shownAt: 0,
    badge: null,
    advancing: false,
    quizResult: null,
    source: savedChoice(SOURCE_KEY, DUE),
    viewing: null,
    holding: false,
    view: (viewing) => set({ viewing }),

    setSource(source) {
      saveChoice(SOURCE_KEY, source);
      set({ source });
      void get().start();
    },

    async start() {
      // React runs effects twice in development; two sessions starting together would introduce cards twice.
      if (get().phase === 'loading') return;
      clearTimers();
      set({
        phase: 'loading',
        error: null,
        advancing: false,
        badge: null,
        quizResult: null,
        viewing: null,
        holding: false,
      });
      try {
        const storage = (await whenStorageReady()).storage;
        const now = new Date();
        const enrolled = await getEnrolled(storage);
        if (get().source !== DUE) {
          // Free practice: random questions, saved nowhere, so the schedule is untouched.
          const chosen = coursesFor(get().source, await loadIndex(), enrolled);
          const free = await Promise.all(chosen.map((course) => loadOpening(course.id)));
          const queue = freePractice(free, undefined, await getCardOptions(storage));
          set({
            queue,
            index: 0,
            contents: Object.fromEntries(free.map((content) => [content.opening.id, content])),
            results: [],
            sessionId: crypto.randomUUID(),
            attempt: startAttempt(),
            shownAt: performance.now(),
            phase: queue.length ? 'asking' : 'summary',
          });
          return;
        }
        const loaded = await Promise.all(enrolled.map((id) => loadOpening(id)));
        const contents = Object.fromEntries(loaded.map((content) => [content.opening.id, content]));

        const quota = Math.max(0, (await getNewPerDay(storage)) - (await getIntroducedToday(storage, now)));
        const openings = await Promise.all(
          loaded.map(async (content) => ({
            content,
            existing: new Set((await storage.cards.byOpening(content.opening.id)).map((card) => card.id)),
          })),
        );
        const fresh = planIntroductions(openings, quota, now, await getCardOptions(storage));
        await storage.cards.insertMissing(fresh);
        if (fresh.length) await addIntroducedToday(storage, fresh.length, now);

        const due = (await storage.cards.due(now.toISOString())).filter((card) => enrolled.includes(card.openingId));
        const queue = planSession(due);
        set({
          queue,
          index: 0,
          contents,
          results: [],
          sessionId: crypto.randomUUID(),
          attempt: startAttempt(),
          shownAt: performance.now(),
          phase: queue.length ? 'asking' : 'summary',
        });
      } catch (error) {
        set({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },

    submitMove(uci) {
      const { queue, index, contents, attempt, phase, advancing, shownAt } = get();
      const card = queue[index];
      if (phase !== 'asking' || advancing || !card || !contents[card.openingId]) return false;
      const played = withPromotion(card.epd, uci);
      if (!played) return false;

      const next = reduceAttempt(
        attempt,
        { type: 'move', uci: played, elapsedMs: performance.now() - shownAt },
        card.expectedUci,
      );
      const square = played.slice(2, 4);
      if (next.status !== 'done') {
        set({ attempt: next, badge: { square, kind: 'wrong' } });
        later(REVIEW_DELAYS.wrongBadge, () => set({ badge: null }));
        return false;
      }
      set((state) => ({
        attempt: next,
        badge: { square, kind: 'correct' },
        advancing: true,
        results: [...state.results, next.rating!],
      }));
      if (get().source === DUE) {
        const answer = recordAnswer(scheduler, card, next, get().sessionId, new Date());
        void storageOrThrow()
          .reviews.record(answer.card, answer.review)
          .catch((error: unknown) =>
            set({ phase: 'error', error: error instanceof Error ? error.message : String(error) }),
          );
      }
      // A right first time carries on by itself; a miss or a slip waits for Next so the explanation can be read.
      if (next.shown || next.wrongTries > 0) set({ holding: true });
      else later(REVIEW_DELAYS.afterCorrect, advance);
      return true;
    },

    submitAnswer(answer) {
      const { queue, index, contents, phase, advancing, shownAt } = get();
      const card = queue[index];
      const quiz = card && isQuizCard(card) ? quizFor(contents[card.openingId], card) : undefined;
      if (phase !== 'asking' || advancing || !card || !quiz || answer.trim() === '') return;
      const result = matchAnswer(quiz, answer);
      const done = recordQuizAnswer(
        scheduler,
        card,
        { matched: result.matched, answer, msToAnswer: performance.now() - shownAt },
        get().sessionId,
        new Date(),
      );
      set((state) => ({
        advancing: true,
        results: [...state.results, done.review.rating],
        quizResult: {
          matched: result.matched,
          feedback: result.matched ? result.feedback : null,
          close: !result.matched && result.close ? result.close : null,
          answer,
        },
      }));
      if (get().source === DUE)
        void storageOrThrow()
          .quizAttempts.record(done.card, done.review, done.attempt)
          .catch((error: unknown) =>
            set({ phase: 'error', error: error instanceof Error ? error.message : String(error) }),
          );
      if (result.matched) later(REVIEW_DELAYS.quizRight, advance);
      else set({ holding: true });
    },

    skip() {
      if (!get().advancing) return;
      clearTimers();
      advance();
    },

    hint: () => set((state) => ({ attempt: reduceAttempt(state.attempt, { type: 'hint' }, '') })),
    show: () => set((state) => ({ attempt: reduceAttempt(state.attempt, { type: 'show' }, '') })),
    stop: clearTimers,
  };
});

export const quizFor = (content: OpeningContent | undefined, card: Card): Quiz | undefined =>
  content?.quizzes.find((quiz) => card.id === `quiz:${content.opening.id}:${quiz.id}`);

export type MoveQuestion = {
  kind: 'move';
  card: Card;
  content: OpeningContent;
  /** The move that was just played to reach this position (the opponent's), if any. */
  lastEdge: LineEdge | undefined;
  /** How the position was reached, as moves from the start. */
  path: LineEdge[];
  expected: LineEdge;
};

export type QuizQuestion = { kind: 'quiz'; card: Card; content: OpeningContent; quiz: Quiz };

export type ReviewQuestion = MoveQuestion | QuizQuestion;

/** What the board and panel need for the card being asked. */
export function currentQuestion(state: Pick<ReviewState, 'queue' | 'index' | 'contents'>): ReviewQuestion | null {
  const card = state.queue[state.index];
  const content = card ? state.contents[card.openingId] : undefined;
  if (!card || !content) return null;
  if (isQuizCard(card)) {
    const quiz = quizFor(content, card);
    return quiz ? { kind: 'quiz', card, content, quiz } : null;
  }
  const expected = nodeAt(content, card.epd).moves.find((move) => move.uci === card.expectedUci)!;
  const path = card.epd === content.opening.rootEpd ? [] : pathTo(content, card.epd);
  return { kind: 'move', card, content, lastEdge: path.at(-1), path, expected };
}

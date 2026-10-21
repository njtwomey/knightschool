import {
  type Attempt,
  type Card,
  cardFits,
  createScheduler,
  followOn,
  freePractice,
  isQuizCard,
  type LineEdge,
  lineQuestions,
  matchAnswer,
  newCard,
  nodeAt,
  type OpeningContent,
  pathTo,
  planIntroductions,
  planSession,
  playUci,
  type Quiz,
  type RatingName,
  recordAnswer,
  recordQuizAnswer,
  reduceAttempt,
  shuffle,
  startAttempt,
  withPromotion,
} from '@knightschool/core';
import type { Storage } from '@knightschool/storage';
import { create } from 'zustand';
import type { BoardBadge } from '@/components/board/shapes';
import { loadIndex, loadOpening } from '@/data/content';
import { DUE, type QuizConfig, resolvePool, savedConfig } from '@/data/practice-config';
import { useStorage, whenStorageReady } from '@/data/storage';
import { missKey, type Miss } from './regret';
import {
  addIntroducedToday,
  getEnrolled,
  getCardOptions,
  getIntroducedToday,
  getNewPerDay,
} from '@/data/training-settings';
import { createTimers, FEEDBACK_DELAYS } from '@/lib/feedback';
import { errorText } from '@/lib/errors';
import { sessionLoader, type SessionPhase } from '@/lib/session';

const scheduler = createScheduler();

export { DUE };

type Phase = SessionPhase<'asking' | 'summary'>;

type QuizState = {
  phase: Phase;
  error: string | null;
  queue: Card[];
  index: number;
  contents: Record<string, OpeningContent>;
  attempt: Attempt;
  sessionId: string;
  results: RatingName[];
  /** Every wrong move of the session, in the order played, for the summary. Never saved. */
  misses: Miss[];
  /** performance.now() when the current card was shown. */
  shownAt: number;
  badge: BoardBadge | null;
  /** True between a finished answer and the next card, so the board does not take another move. */
  advancing: boolean;
  /** The result of the typed answer to the quiz being asked, shown until the next card. */
  quizResult: { matched: boolean; feedback: string | null; close: string | null; answer: string } | null;
  /**
   * How this session was set up (a copy taken when it started, so changing the saved set-up never touches it): its
   * source is "due" (the review schedule) or where free practice draws from; `moves` how far each question runs.
   */
  config: QuizConfig;
  /** Set on a line's Quiz tab: every question of that one line, shuffled, never saved. Overrides the source. */
  scope: LineScope | null;
  /** An earlier move of the position being asked, picked from the move table to look at; null shows the question. */
  viewing: number | null;
  /** True when an answer is shown and waits for Next: a miss has something to read. */
  holding: boolean;
  view: (index: number | null) => void;

  /** Starts a session set up as `config` (the saved set-up when none is given), throwing away any under way. */
  start: (config?: QuizConfig) => Promise<void>;
  /** Back to no session: the page shows the set-up card. */
  reset: () => void;
  /** The run of follow-on moves under way: how many more may follow, and the line they keep to. */
  chain: { left: number; line: string } | null;
  /** Follow-on questions whose card was never introduced: asked, but not written to the schedule. */
  unsaved: string[];
  /** True while a follow-on question is being put next, so Skip cannot put a second one. */
  following: boolean;
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

const timers = createTimers();
const later = timers.later;
const clearTimers = timers.clear;

const storageOrThrow = (): Storage => {
  const { storage } = useStorage.getState();
  if (!storage) throw new Error('Your data is not available, so reviews cannot be saved.');
  return storage.storage;
};

export type LineScope = { course: string; line: string };

export const useQuiz = create<QuizState>((set, get) => {
  /** Only the schedule's own session is saved; free practice and a line's quiz never touch it. */
  const saving = () => get().config.source === DUE && !get().scope;
  /** Whether this card's answer goes to the schedule. */
  const saves = (card: Card) => saving() && !get().unsaved.includes(card.id);
  function recordMiss(card: Card, content: OpeningContent, playedUci: string) {
    const key = missKey(card.epd, playedUci, card.expectedUci);
    if (get().misses.some((miss) => miss.key === key)) return;
    const miss: Miss = {
      key,
      cardId: card.id,
      openingId: card.openingId,
      courseName: content.opening.name,
      side: content.opening.side,
      epd: card.epd,
      playedUci,
      playedSan: playUci(card.epd, playedUci).san,
      expectedUci: card.expectedUci,
      expectedSan: playUci(card.epd, card.expectedUci).san,
    };
    set((state) => ({ misses: [...state.misses, miss] }));
  }
  /**
   * After a move question: carry on along its line for up to `config.moves` of your moves (the opponent's reply in
   * between is shown as the last move), then go on to the next question in the queue.
   */
  function advance() {
    const { index, queue, contents, chain, config } = get();
    const movesPerQuestion = config.moves;
    const card = queue[index];
    const content = card ? contents[card.openingId] : undefined;
    const left = chain ? chain.left : movesPerQuestion === 0 ? Number.POSITIVE_INFINITY : movesPerQuestion - 1;
    if (card && content && !isQuizCard(card) && left > 0) {
      const next = followOn(content, card.epd, card.expectedUci, chain?.line);
      if (next) {
        void askNext(next.definition, next.line, left - 1);
        return;
      }
    }
    set({ chain: null });
    nextInQueue();
  }
  /**
   * Puts a follow-on question next: the stored card when there is one, so its schedule carries on. A copy of it already
   * in the session is the latest (answers update every copy); a later copy is taken out, so it is asked once.
   */
  async function askNext(definition: Parameters<typeof newCard>[0], line: string, left: number) {
    const session = get().sessionId;
    set({ following: true });
    let card = newCard(definition, new Date());
    let unsaved = false;
    if (saving()) {
      let stored: Card | undefined;
      try {
        stored =
          get().queue.find((candidate) => candidate.id === definition.id) ??
          (await storageOrThrow().cards.get(definition.id));
      } catch (error) {
        set({ phase: 'error', error: errorText(error), following: false });
        return;
      }
      if (stored && stored.expectedUci === definition.expectedUci) card = stored;
      else unsaved = true; // never introduce a card outside the path, nor overwrite another answer's schedule
    }
    if (get().sessionId !== session) return; // a new session started meanwhile
    set((state) => ({
      queue: [
        ...state.queue.slice(0, state.index + 1),
        card,
        ...state.queue.slice(state.index + 1).filter((candidate) => candidate.id !== card.id),
      ],
      chain: { left, line },
      unsaved: unsaved ? [...state.unsaved, card.id] : state.unsaved,
      following: false,
    }));
    nextInQueue();
  }
  function nextInQueue() {
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

  const load = sessionLoader(get, set, 'first');

  return {
    phase: 'idle',
    error: null,
    queue: [],
    index: 0,
    contents: {},
    attempt: startAttempt(),
    sessionId: '',
    results: [],
    misses: [],
    shownAt: 0,
    badge: null,
    advancing: false,
    quizResult: null,
    config: savedConfig('quiz'),
    scope: null,
    chain: null,
    unsaved: [],
    following: false,
    viewing: null,
    holding: false,
    view: (viewing) => set({ viewing }),

    reset() {
      clearTimers();
      set({ phase: 'idle', error: null, queue: [], index: 0, results: [], misses: [], chain: null, holding: false });
    },

    async start(config = savedConfig('quiz')) {
      const reset = {
        config,
        chain: null,
        unsaved: [],
        following: false,
        advancing: false,
        badge: null,
        quizResult: null,
        viewing: null,
        holding: false,
      };
      await load(reset, async () => {
        clearTimers();
        const storage = (await whenStorageReady()).storage;
        const now = new Date();
        const index = await loadIndex();
        const scope = get().scope;
        if (scope) {
          const content = await loadOpening(scope.course);
          // Shuffled, so the quiz is not the line played again in order.
          const questions = shuffle(lineQuestions(content, scope.line));
          const queue = questions.map((definition) => newCard(definition, now));
          set({
            queue,
            index: 0,
            contents: { [content.opening.id]: content },
            results: [],
            misses: [],
            sessionId: crypto.randomUUID(),
            attempt: startAttempt(),
            shownAt: performance.now(),
            phase: queue.length ? 'asking' : 'summary',
          });
          return;
        }
        if (config.source !== DUE) {
          // Free practice: random questions, saved nowhere, so the schedule is untouched.
          const chosen = await resolvePool(config.source, index);
          const free = await Promise.all(chosen.map((course) => loadOpening(course.id)));
          const queue = freePractice(
            free,
            undefined,
            await getCardOptions(storage),
            Math.random,
            new Date(),
            config.weighting,
          );
          set({
            queue,
            index: 0,
            contents: Object.fromEntries(free.map((content) => [content.opening.id, content])),
            results: [],
            misses: [],
            sessionId: crypto.randomUUID(),
            attempt: startAttempt(),
            shownAt: performance.now(),
            phase: queue.length ? 'asking' : 'summary',
          });
          return;
        }
        const enrolled = await getEnrolled(
          storage,
          index.map((course) => course.id),
        );
        const loaded = await Promise.all(enrolled.map((id) => loadOpening(id)));
        const contents = Object.fromEntries(loaded.map((content) => [content.opening.id, content]));

        // New cards come from each course's path: its open units in order, never ahead of what is passed.
        const quota = Math.max(0, (await getNewPerDay(storage)) - (await getIntroducedToday(storage, now)));
        const courses = await Promise.all(
          loaded.map(async (content) => ({
            content,
            cards: await storage.cards.byOpening(content.opening.id),
            reviews: await storage.reviews.byOpening(content.opening.id),
          })),
        );
        const fresh = planIntroductions(courses, quota, now, await getCardOptions(storage));
        await storage.cards.insertMissing(fresh);
        if (fresh.length) await addIntroducedToday(storage, fresh.length, now);

        // A card whose position or move its course no longer has (a line cut short or rewritten) cannot be asked.
        const due = (await storage.cards.due(now.toISOString())).filter(
          (card) => enrolled.includes(card.openingId) && cardFits(contents[card.openingId], card),
        );
        const queue = planSession(due);
        set({
          queue,
          index: 0,
          contents,
          results: [],
          misses: [],
          sessionId: crypto.randomUUID(),
          attempt: startAttempt(),
          shownAt: performance.now(),
          phase: queue.length ? 'asking' : 'summary',
        });
      });
    },

    submitMove(uci) {
      const { queue, index, contents, attempt, phase, advancing, shownAt } = get();
      const card = queue[index];
      if (phase !== 'asking' || advancing || !card || !contents[card.openingId]) return false;
      const played = withPromotion(card.epd, uci);
      if (!played) return false;
      // A guess, kept for the summary even if the right move follows; not one played after the answer was shown.
      if (played !== card.expectedUci && !attempt.shown) recordMiss(card, contents[card.openingId]!, played);

      const next = reduceAttempt(
        attempt,
        { type: 'move', uci: played, elapsedMs: performance.now() - shownAt },
        card.expectedUci,
      );
      const square = played.slice(2, 4);
      if (next.status !== 'done') {
        set({ attempt: next, badge: { square, kind: 'wrong' } });
        later(FEEDBACK_DELAYS.wrongBadge, () => set({ badge: null }));
        return false;
      }
      set((state) => ({
        attempt: next,
        badge: { square, kind: 'correct' },
        advancing: true,
        results: [...state.results, next.rating!],
      }));
      if (saves(card)) {
        const answer = recordAnswer(scheduler, card, next, get().sessionId, new Date());
        // Every copy in the session takes the new schedule, so a later answer builds on this one.
        set((state) => ({
          queue: state.queue.map((candidate) => (candidate.id === answer.card.id ? answer.card : candidate)),
        }));
        void storageOrThrow()
          .reviews.record(answer.card, answer.review)
          .catch((error: unknown) => set({ phase: 'error', error: errorText(error) }));
      }
      // A right first time carries on by itself; a miss or a slip waits for Next so the explanation can be read.
      if (next.shown || next.wrongTries > 0) set({ holding: true });
      else later(FEEDBACK_DELAYS.nextCard, advance);
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
      if (saving())
        void storageOrThrow()
          .quizAttempts.record(done.card, done.review, done.attempt)
          .catch((error: unknown) => set({ phase: 'error', error: errorText(error) }));
      if (result.matched) later(FEEDBACK_DELAYS.quizRight, advance);
      else set({ holding: true });
    },

    skip() {
      if (!get().advancing || get().following) return;
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

type SessionQuestion = MoveQuestion | QuizQuestion;

/** What the board and panel need for the card being asked. */
export function currentQuestion(state: Pick<QuizState, 'queue' | 'index' | 'contents'>): SessionQuestion | null {
  const card = state.queue[state.index];
  const content = card ? state.contents[card.openingId] : undefined;
  if (!card || !content || !cardFits(content, card)) return null;
  if (isQuizCard(card)) {
    const quiz = quizFor(content, card);
    return quiz ? { kind: 'quiz', card, content, quiz } : null;
  }
  const expected = nodeAt(content, card.epd).moves.find((move) => move.uci === card.expectedUci)!;
  const path = card.epd === content.opening.rootEpd ? [] : pathTo(content, card.epd);
  return { kind: 'move', card, content, lastEdge: path.at(-1), path, expected };
}

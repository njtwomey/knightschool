import {
  checkpointRef,
  dayKey,
  drillScope,
  activityDays,
  dueCards,
  introducedOn,
  newLeftToday,
  practiceStreak,
  puzzleCardId,
  scopePositions,
  type ActivityDayFacts,
  type Card,
  type ItemState,
  type MoveCardDefinition,
  type ChosenScope,
  type StreakFacts,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { loadCatalog, loadFacts, loadOpening, loadPuzzles, type Catalog, type ShippedPuzzle } from '@/data/content';
import { learnerStore, whenWritesSettled } from '@/data/learner';
import type { AttemptRow, LearnerStore, ReviewRow } from '@/data/learner-store';
import { getSetting, whenSettingsReady } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { stepStates } from '@/features/learn/model';
import { withRepertoire } from './chosen';

/*
 * The learner's progress, worked out from the log on arrival (docs/v2/hooks/use-progress.md): what is due, what is
 * new today, each opening's steps and checkpoints, and the streak. Today, the practice hub and Review read it.
 */

/** Attempts read for the streak and the checkpoints; enough for years of daily practice. */
const LOG_LIMIT = 20_000;

export type CheckpointInfo = {
  variation: string;
  name: string;
  positions: number;
  /** Cleared when the latest attempt passed; open when every step is known; else locked. */
  state: 'locked' | 'open' | 'cleared';
  /** "9 of 10", from the latest attempt. */
  score?: string;
};

export type OpeningProgress = {
  entry: Catalog['openings'][number];
  opening: BuiltOpening;
  facts?: OpeningFacts;
  cards: MoveCardDefinition[];
  stepStates: Map<string, ItemState>;
  stepCounts: Map<string, { mine: number; known: number; inReviews: number }>;
  /** Some of its cards are in the learner's reviews. */
  started: boolean;
  due: number;
  checkpoints: CheckpointInfo[];
  /**
   * The step being learned: its Try begun (some of its moves in reviews, not all) and not finished; the most recently
   * answered when there are several. `index` counts from 0 in the opening's steps.
   */
  inProgress?: { index: number; at: string };
  /** On a repertoire view of the opening (`LearnerProgress.chosen`): what is ticked; everything above is cut to it. */
  scope?: ChosenScope;
};

export type LearnerProgress = {
  catalog: Catalog;
  openings: OpeningProgress[];
  store: LearnerStore;
  cards: Card[];
  reviews: ReviewRow[];
  attempts: AttemptRow[];
  /** The openings with something ticked, each cut to what is ticked (features/practice/chosen.ts); empty when none. */
  chosen: OpeningProgress[];
  /** Every card due now, the most overdue first, whatever is ticked. */
  allDue: Card[];
  /** The opening and line of each due puzzle card, by card id: what tells whether it is in the repertoire. */
  duePuzzles: ReadonlyMap<string, { opening: string; line?: string | null }>;
  /** Every card due now in the repertoire (all of them when nothing is ticked), the most overdue first. */
  due: Card[];
  dueByKind: { moves: number; puzzles: number; questions: number };
  /** The soonest card of the repertoire not yet due. */
  nextDue?: Date;
  /** New moves and questions met today, from any mode (a step's Try as well as Review). */
  introducedToday: number;
  newLeft: number;
  /** Every day practised, oldest first, for the activity calendar. */
  activity: ActivityDayFacts[];
  streak: StreakFacts;
  /** Average time per answer, for the due card's estimate. */
  msPerAnswer: number;
};

/** The openings the learner is on: what they have ticked, or, with nothing ticked, the ones started. */
export const startedOpenings = (progress: LearnerProgress) =>
  progress.chosen.length ? progress.chosen : progress.openings.filter((one) => one.started);

/** The openings practice draws from: the repertoire, or every opening when nothing is ticked or started. */
export const practiceOpenings = (progress: LearnerProgress) =>
  startedOpenings(progress).length ? startedOpenings(progress) : progress.openings;

/** The latest checkpoint attempt for each variation, by its ref. */
export function latestCheckpoints(attempts: readonly AttemptRow[]): Map<string, AttemptRow> {
  const latest = new Map<string, AttemptRow>();
  for (const attempt of attempts) {
    if (attempt.mode !== 'checkpoint' || !attempt.ref.startsWith('checkpoint:')) continue;
    const seen = latest.get(attempt.ref);
    if (!seen || seen.at < attempt.at) latest.set(attempt.ref, attempt);
  }
  return latest;
}

/** A checkpoint attempt's score in words: its tries are one per exercise. */
export const checkpointScore = (attempt: AttemptRow) =>
  `${attempt.tries.filter((one) => one.outcome === 'right').length} of ${attempt.tries.length}`;

/** Each variation's checkpoint state from its steps' states and the latest attempt. */
export function checkpointsOf(
  opening: BuiltOpening,
  states: ReadonlyMap<string, ItemState>,
  latest: ReadonlyMap<string, AttemptRow>,
): CheckpointInfo[] {
  return opening.variations.map((variation) => {
    const steps = opening.steps.filter((step) => step.variation === variation.id);
    const known = steps.length > 0 && steps.every((step) => ['known', 'mastered'].includes(states.get(step.id) ?? ''));
    const attempt = latest.get(checkpointRef(opening.id, variation.id));
    return {
      variation: variation.id,
      name: variation.name ?? variation.id,
      positions: scopePositions(drillScope(opening, variation.id)).length,
      state: attempt?.result === 'right' ? 'cleared' : known ? 'open' : 'locked',
      ...(attempt ? { score: checkpointScore(attempt) } : {}),
    };
  });
}

/** The step whose Try is begun and not finished, the latest answered first (see `OpeningProgress.inProgress`). */
export function inProgressOf(
  opening: BuiltOpening,
  cards: readonly MoveCardDefinition[],
  counts: ReadonlyMap<string, { mine: number; inReviews: number }>,
  reviews: readonly ReviewRow[],
): Pick<OpeningProgress, 'inProgress'> {
  const lastAt = new Map<string, string>();
  for (const review of reviews) if ((lastAt.get(review.cardId) ?? '') < review.at) lastAt.set(review.cardId, review.at);
  let found: OpeningProgress['inProgress'];
  opening.steps.forEach((step, index) => {
    const count = counts.get(step.id);
    if (!count || count.inReviews === 0 || count.inReviews >= count.mine) return;
    const at = cards
      .filter((card) => card.step === step.id)
      .map((card) => lastAt.get(card.id) ?? '')
      .reduce((a, b) => (a > b ? a : b), '');
    if (!found || at > found.at) found = { index, at };
  });
  return found ? { inProgress: found } : {};
}

/**
 * The learner's progress across every opening. `factsFor` says whose facts (the engine's evaluations and the band's
 * counts, an opening's largest file) to load: every opening, one, or none; the rest have `facts` undefined.
 */
export async function loadProgress(
  now = new Date(),
  factsFor: 'all' | string | null = 'all',
): Promise<LearnerProgress> {
  // Answers still being saved are part of the picture: read once they have landed.
  await whenWritesSettled();
  const [catalog, store] = await Promise.all([loadCatalog(), learnerStore(), whenSettingsReady()]);
  const [cards, attempts] = await Promise.all([store.cards.all(), store.attempts.recent(LOG_LIMIT)]);
  const reviews = await store.reviews.forCards(cards.map((card) => card.id));
  const have = new Set(cards.map((card) => card.id));
  const due = dueCards(cards, now);
  const dueIds = new Set(due.map((card) => card.id));
  const latest = latestCheckpoints(attempts);
  const openings = await Promise.all(
    catalog.openings.map(async (entry): Promise<OpeningProgress> => {
      const wanted = factsFor === 'all' || factsFor === entry.id;
      const [opening, facts] = await Promise.all([
        loadOpening(entry.id),
        wanted ? loadFacts(entry.id).catch(() => undefined) : undefined,
      ]);
      const progress = stepStates(opening, cards, reviews, attempts);
      return {
        entry,
        opening,
        facts,
        cards: progress.cards,
        stepStates: progress.states,
        stepCounts: progress.counts,
        started: progress.cards.some((card) => have.has(card.id)),
        due: progress.cards.filter((card) => dueIds.has(card.id)).length,
        checkpoints: checkpointsOf(opening, progress.states, latest),
        ...inProgressOf(opening, progress.cards, progress.counts, reviews),
      };
    }),
  );
  const later = cards
    .filter((card) => !dueIds.has(card.id))
    .map((card) => new Date(card.due))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const introducedToday = introducedOn(reviews, dayKey(now));
  const answered = attempts.filter((attempt) => attempt.ms > 0).slice(0, 200);
  const whole: LearnerProgress = {
    catalog,
    openings,
    chosen: [],
    allDue: due,
    duePuzzles: await duePuzzlesOf(due, catalog),
    store,
    cards,
    reviews,
    attempts,
    due,
    dueByKind: {
      moves: due.filter((card) => card.id.startsWith('move:')).length,
      puzzles: due.filter((card) => card.id.startsWith('puzzle:')).length,
      questions: due.filter((card) => card.id.startsWith('quiz:')).length,
    },
    ...(later ? { nextDue: later } : {}),
    introducedToday,
    newLeft: newLeftToday(introducedToday, getSetting('review.newPerDay')),
    activity: activityDays(attempts),
    streak: practiceStreak(
      attempts.map((attempt) => attempt.at),
      now,
    ),
    msPerAnswer: answered.length ? answered.reduce((sum, one) => sum + one.ms, 0) / answered.length : 10_000,
  };
  return withRepertoire(whole, getSetting('repertoire'), now);
}

/** Who each due puzzle card belongs to; the puzzle files are read only when one is due and something is ticked. */
async function duePuzzlesOf(due: readonly Card[], catalog: Catalog): Promise<LearnerProgress['duePuzzles']> {
  const owners = new Map<string, { opening: string; line?: string | null }>();
  if (!due.some((card) => card.id.startsWith('puzzle:')) || !getSetting('repertoire').length) return owners;
  const lists = await Promise.all(catalog.openings.map((entry) => puzzlesOf(entry.id).catch(() => [])));
  lists.forEach((list, i) => {
    for (const puzzle of list) {
      const id = puzzleCardId(puzzle.id);
      if (!owners.has(id)) owners.set(id, { opening: catalog.openings[i]!.id, line: puzzle.line });
    }
  });
  return owners;
}

/** About how many minutes `count` answers take. */
export const minutesFor = (count: number, msPerAnswer: number) =>
  count ? Math.max(1, Math.round((count * msPerAnswer) / 60_000)) : 0;

/** When a time falls, in words: "in 3 hours", "tomorrow", "on 4 November". */
export function whenWords(date: Date, now = new Date()): string {
  const ms = date.getTime() - now.getTime();
  if (ms <= 60_000) return 'now';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.round(minutes / 60);
  if (dayKey(date) === dayKey(now)) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (dayKey(date) === dayKey(tomorrow)) return 'tomorrow';
  return `on ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
}

/** The shipped puzzles of an opening, whichever shape the file has. */
export async function puzzlesOf(opening: string): Promise<ShippedPuzzle[]> {
  const file = await loadPuzzles(opening);
  return Array.isArray(file) ? file : file.puzzles;
}

/** One puzzle for Today: the learner's side solves it, matched as closely as can be, not yet answered. */
export function pickPuzzle(puzzles: readonly ShippedPuzzle[], have: ReadonlySet<string>): ShippedPuzzle | undefined {
  const levels = siteConfig.puzzles.levels as readonly string[];
  const fresh = puzzles.filter((puzzle) => puzzle.mine !== false && !have.has(puzzleCardId(puzzle.id)));
  return [...fresh].sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level))[0];
}

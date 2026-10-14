import {
  gradeGuess,
  guessPoints,
  guessSuggestions,
  guessTargets,
  guessWeight,
  lastResults,
  newId,
  searchAt,
  type Family,
  type GuessResult,
  type GuessTargets,
  type OpeningIndexEntry,
  type SearchIndex,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadFamilies, loadIndex, loadSearchIndex } from '@/data/content';
import { whenStorageReady } from '@/data/storage';

/** Positions in one sitting, as a review session has cards. */
export const SESSION_LENGTH = 10;

/** Nothing waits for a click: the answer is shown for a few seconds, then the next position comes up. */
export const GUESS_DELAYS = { full: 2600, partial: 5000, miss: 6500 } as const;

/** A place a position comes from, to link to once it has been answered. */
export type Source = { course: string; family: string; line: string; name: string; trap: boolean };

export type Question = {
  epd: string;
  side: 'white' | 'black';
  targets: GuessTargets;
  sources: Source[];
};

type Phase = 'idle' | 'loading' | 'asking' | 'answered' | 'summary' | 'error';

export type Outcome = { question: Question; result: GuessResult; answer: string };

type GuessState = {
  phase: Phase;
  error: string | null;
  question: Question | null;
  answer: string;
  graded: { result: GuessResult; matched?: string; answer: string } | null;
  /** Every answer this session, in order. */
  outcomes: Outcome[];
  shownAt: number;

  start: () => Promise<void>;
  stop: () => void;
  setAnswer: (answer: string) => void;
  submit: () => void;
  giveUp: () => void;
  next: () => void;
};

type Deck = {
  courses: OpeningIndexEntry[];
  families: Family[];
  search: SearchIndex;
  /** How each position went last time, so missed ones come back sooner. */
  history: Map<string, GuessResult>;
};
let deck: Deck | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** One candidate per distinct position: transpositions share it, and the first line to reach it names the side. */
function candidates(from: Deck) {
  const seen = new Map<string, { epd: string; side: 'white' | 'black'; weight: number }>();
  for (const course of from.courses) {
    for (const line of course.lines) {
      line.epds.forEach((epd, i) => {
        if (seen.has(epd)) return;
        // Very early and very late positions are asked a little less: the middle is where openings differ.
        const depth = i >= 1 && i <= 8 ? 1 : 0.5;
        seen.set(epd, { epd, side: course.side, weight: depth * guessWeight(from.history.get(epd)) });
      });
    }
  }
  return [...seen.values()];
}

function pick(from: Deck, asked: Set<string>): Question | null {
  const pool = candidates(from).filter((candidate) => !asked.has(candidate.epd));
  for (let attempt = 0; attempt < 30 && pool.length > 0; attempt++) {
    let roll = Math.random() * pool.reduce((sum, candidate) => sum + candidate.weight, 0);
    const chosen = pool.find((candidate) => (roll -= candidate.weight) < 0) ?? pool[pool.length - 1]!;
    const targets = guessTargets(from.search, chosen.epd, from.courses, from.families);
    if (targets.openings.length === 0) continue;
    const found = searchAt(from.search, chosen.epd, 'both');
    const sources: Source[] = [];
    for (const hit of found?.lines ?? []) {
      const owner = from.courses.find((candidate) => candidate.id === hit.course);
      const named = owner?.lines.find((candidate) => candidate.id === hit.line);
      if (!owner || !named || sources.some((s) => s.course === hit.course && s.line === hit.line)) continue;
      sources.push({
        course: owner.id,
        family: owner.family ?? owner.id,
        line: named.id,
        name: named.name,
        trap: named.kind === 'refutation',
      });
    }
    return { epd: chosen.epd, side: chosen.side, targets, sources };
  }
  return null;
}

export const useGuess = create<GuessState>((set, get) => {
  function show() {
    clearTimeout(timer);
    const { outcomes } = get();
    if (outcomes.length >= SESSION_LENGTH) return set({ phase: 'summary', question: null });
    const question = deck ? pick(deck, new Set(outcomes.map((outcome) => outcome.question.epd))) : null;
    if (!question) {
      return outcomes.length > 0
        ? set({ phase: 'summary', question: null })
        : set({ phase: 'error', error: 'There are no positions to ask about yet.' });
    }
    set({ phase: 'asking', question, answer: '', graded: null, shownAt: performance.now() });
  }

  function finish(answer: string) {
    const { question, shownAt, outcomes } = get();
    if (!question || get().phase !== 'asking') return;
    const grade = gradeGuess(answer, question.targets);
    set({
      phase: 'answered',
      graded: { ...grade, answer },
      outcomes: [...outcomes, { question, result: grade.result, answer }],
    });
    void whenStorageReady()
      .then(({ storage }) =>
        storage.guessAttempts.append({
          id: newId(),
          at: new Date().toISOString(),
          epd: question.epd,
          answer,
          result: grade.result,
          msToAnswer: Math.round(performance.now() - shownAt),
        }),
      )
      .catch(() => undefined); // the game still works if the answer cannot be saved
    clearTimeout(timer);
    timer = setTimeout(show, GUESS_DELAYS[grade.result]);
  }

  return {
    phase: 'idle',
    error: null,
    question: null,
    answer: '',
    graded: null,
    outcomes: [],
    shownAt: 0,

    async start() {
      if (get().phase === 'loading') return;
      set({ phase: 'loading', error: null });
      try {
        const [courses, families, search] = await Promise.all([loadIndex(), loadFamilies(), loadSearchIndex()]);
        const history = await whenStorageReady()
          .then(({ storage }) => storage.guessAttempts.since('1970-01-01T00:00:00.000Z'))
          .then(lastResults)
          .catch(() => new Map<string, GuessResult>());
        deck = { courses, families, search, history };
        set({ outcomes: [] });
        show();
      } catch (error) {
        set({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },
    stop() {
      clearTimeout(timer);
    },
    setAnswer: (answer) => set({ answer }),
    submit() {
      const { answer } = get();
      if (answer.trim()) finish(answer);
    },
    giveUp: () => finish(''),
    next: show,
  };
});

/** Every name worth suggesting while typing, built once the openings have loaded. */
export function allSuggestions(): string[] {
  return deck ? guessSuggestions(deck.courses, deck.families) : [];
}

/** Points scored so far this session, for the progress line. */
export const sessionPoints = (outcomes: Outcome[]) => outcomes.reduce((sum, o) => sum + guessPoints(o.result), 0);

import {
  gradeGuess,
  guessPoints,
  type GuessResult,
  guessSuggestions,
  guessTargets,
  type GuessTargets,
  guessWeight,
  lastResults,
  lineSteps,
  newId,
  type OpeningIndexEntry,
  pickWeighted,
  practiceWeight,
  searchAt,
  type SearchIndex,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadIndex, loadOpening, loadSearchIndex } from '@/data/content';
import { whenStorageReady } from '@/data/storage';
import { type NameItConfig, resolvePool, savedConfig } from '@/data/practice-config';
import { createTimers, FEEDBACK_DELAYS } from '@/lib/feedback';
import { sessionLoader, type SessionPhase } from '@/lib/session';

/** A place a position comes from, to link to once it has been answered. */
export type Source = {
  course: string;
  line: string;
  name: string;
  trap: boolean;
  /** The moves (UCI) from the start to the guessed position along this line, once worked out: the link opens there. */
  moves?: string[];
};

export type Question = {
  epd: string;
  side: 'white' | 'black';
  targets: GuessTargets;
  sources: Source[];
};

type Phase = SessionPhase<'asking' | 'answered' | 'summary'>;

export type Outcome = { question: Question; result: GuessResult; answer: string };

type NameItState = {
  phase: Phase;
  error: string | null;
  question: Question | null;
  answer: string;
  graded: { result: GuessResult; matched?: string; answer: string } | null;
  /** Every answer this session, in order. */
  outcomes: Outcome[];
  shownAt: number;
  /**
   * How this session was set up (a copy taken when it started): which courses the positions come from (answers are
   * always judged against every course), how they are picked, and how many there are.
   */
  config: NameItConfig;

  /** Starts a session set up as `config` (the saved set-up when none is given). */
  start: (config?: NameItConfig) => Promise<void>;
  /** Back to no session: the page shows the set-up card. */
  reset: () => void;
  stop: () => void;
  setAnswer: (answer: string) => void;
  submit: () => void;
  giveUp: () => void;
  next: () => void;
};

type Deck = {
  courses: OpeningIndexEntry[];
  /** The courses positions are asked from (all of them, unless the source narrows it). */
  pool: OpeningIndexEntry[];
  search: SearchIndex;
  /** How positions are picked: at random, or by the share of games that reach them (`practiceWeight`). */
  weighting: NameItConfig['weighting'];
  /** How many games reach each position (0 to 1), when the questions are weighted by popularity. */
  reach: Map<string, number>;
  /** How each position went last time, so missed ones come back sooner. */
  history: Map<string, GuessResult>;
};
let deck: Deck | null = null;
const timers = createTimers();

/** One candidate per distinct position: transpositions share it, and the first line to reach it names the side. */
function candidates(from: Deck) {
  const seen = new Map<string, { epd: string; side: 'white' | 'black'; weight: number }>();
  for (const course of from.pool) {
    for (const line of course.lines) {
      line.epds.forEach((epd, i) => {
        if (seen.has(epd)) return;
        // Very early and very late positions are asked a little less: the middle is where openings differ.
        const depth = i >= 1 && i <= 8 ? 1 : 0.5;
        seen.set(epd, {
          epd,
          side: course.side,
          weight: depth * guessWeight(from.history.get(epd)) * practiceWeight(from.weighting, from.reach.get(epd)),
        });
      });
    }
  }
  return [...seen.values()];
}

function pick(from: Deck, asked: Set<string>): Question | null {
  const pool = candidates(from).filter((candidate) => !asked.has(candidate.epd));
  for (let attempt = 0; attempt < 30 && pool.length > 0; attempt++) {
    const chosen = pickWeighted(pool, (candidate) => candidate.weight, 1)[0]!;
    const targets = guessTargets(from.search, chosen.epd, from.courses);
    if (targets.openings.length === 0) continue;
    const found = searchAt(from.search, chosen.epd, 'both');
    const sources: Source[] = [];
    for (const hit of found?.lines ?? []) {
      const owner = from.courses.find((candidate) => candidate.id === hit.course);
      const named = owner?.lines.find((candidate) => candidate.id === hit.line);
      if (!owner || !named || sources.some((s) => s.course === hit.course && s.line === hit.line)) continue;
      sources.push({
        course: owner.id,
        line: named.id,
        name: named.name,
        trap: named.kind === 'refutation',
      });
    }
    return { epd: chosen.epd, side: chosen.side, targets, sources };
  }
  return null;
}

export const useNameIt = create<NameItState>((set, get) => {
  /** Works out, for each source line, the moves that reach the guessed position, so its link can open right there. */
  async function attachMoves(question: Question) {
    const sources = await Promise.all(
      question.sources.slice(0, 8).map(async (source) => {
        try {
          const content = await loadOpening(source.course);
          const steps = lineSteps(content, source.line);
          const at = steps.findIndex((step) => step.edge.to === question.epd);
          return at < 0 ? source : { ...source, moves: steps.slice(0, at + 1).map((step) => step.edge.uci) };
        } catch {
          return source;
        }
      }),
    );
    const current = get().question;
    if (current?.epd === question.epd)
      set({ question: { ...current, sources: [...sources, ...question.sources.slice(8)] } });
  }

  function show() {
    timers.clear();
    const { outcomes } = get();
    if (outcomes.length >= get().config.positions) return set({ phase: 'summary', question: null });
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
    void attachMoves(question);
    timers.clear();
    // A right answer moves on by itself; anything else waits, because there is something to read.
    if (grade.result === 'full') timers.later(FEEDBACK_DELAYS.guessFull, show);
  }

  const load = sessionLoader(get, set, 'first');

  return {
    phase: 'idle',
    error: null,
    question: null,
    answer: '',
    graded: null,
    outcomes: [],
    shownAt: 0,
    config: savedConfig('name-it'),

    reset() {
      timers.clear();
      set({ phase: 'idle', error: null, question: null, outcomes: [], graded: null });
    },

    async start(config = savedConfig('name-it')) {
      await load({ config }, async () => {
        timers.clear();
        const [courses, search] = await Promise.all([loadIndex(), loadSearchIndex()]);
        const history = await whenStorageReady()
          .then(({ storage }) => storage.guessAttempts.since('1970-01-01T00:00:00.000Z'))
          .then(lastResults)
          .catch(() => new Map<string, GuessResult>());
        const pool = await resolvePool(config.source, courses);
        // A position's popularity belongs to the position, so any course that has counted it will do.
        const reach = new Map<string, number>();
        if (config.weighting === 'popular') {
          for (const content of await Promise.all(pool.map((course) => loadOpening(course.id)))) {
            for (const node of Object.values(content.nodes))
              if (node.popularity !== undefined && !reach.has(node.epd)) reach.set(node.epd, node.popularity);
          }
        }
        deck = { courses, pool, weighting: config.weighting, reach, search, history };
        set({ outcomes: [] });
        show();
      });
    },
    stop() {
      timers.clear();
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
  return deck ? guessSuggestions(deck.courses) : [];
}

/** Points scored so far this session, for the progress line. */
export const sessionPoints = (outcomes: Outcome[]) => outcomes.reduce((sum, o) => sum + guessPoints(o.result), 0);

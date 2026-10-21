import {
  courseUnits,
  pathSteps,
  lineSteps,
  unitStretches,
  type CourseUnit,
  type UnitStretch,
  pathFromUcis,
  nextBranchMove,
  nodeAt,
  RESERVED_LINE_ID,
  type Rng,
  reduceAttempt,
  startAttempt,
  playUci,
  withPromotion,
  type Attempt,
  type LineStep,
  type OpeningContent,
  type RatingName,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadOpening } from '@/data/content';
import { whenStorageReady } from '@/data/storage';
import { getCardOptions } from '@/data/training-settings';
import { introduceStep, recordStep } from './record';
import type { UnitRef } from '@/router/hrefs';

export type PlayMode = 'learn' | 'drill' | 'branches';

/** The line id that means "every branch" in routes and in `variantId`. */
export const ALL_BRANCHES = RESERVED_LINE_ID;

let random: Rng = Math.random;
/** Replaces the random source, so a branch drill can be replayed in tests. */
export const setRandom = (rng: Rng) => {
  random = rng;
};

/**
 * How long things stay on screen. Nothing waits for a click: a tick shows while play carries on, and the computer
 * answers by itself.
 */
export const DELAYS = { afterCorrect: 350, opponent: 500, wrongBadge: 900 } as const;

type Phase = 'idle' | 'loading' | 'playing' | 'complete' | 'error';

/**
 * Learn or Drill scoped to a unit of the study path: its stretches (one, or one per short branch of a side unit), played
 * one after another. Each starts part-way along: the moves before `from` are already on the board.
 */
export type PlayScope = { unit: CourseUnit; ref: UnitRef; parts: UnitStretch[]; part: number };

/** A step off the line, played while exploring in Learn. */
export type Explored = { uci: string; san: string; epd: string };

export type PlayState = {
  phase: Phase;
  error: string | null;
  mode: PlayMode;
  content: OpeningContent | null;
  variantId: string | null;
  steps: LineStep[];
  /** Moves played so far; also the index of the move being asked for or about to be played. */
  index: number;
  attempt: Attempt;
  /** A tick or cross, shown briefly on a square. */
  badge: { square: string; kind: 'correct' | 'wrong' } | null;
  /** True while the computer is about to play the other side's move. */
  opponentThinking: boolean;
  results: { index: number; rating: RatingName }[];
  /** Learn only: moves played off the line to see what happens. Null while following the line. */
  explore: Explored[] | null;
  sessionId: string;
  startedAt: number;
  /** Set when playing one unit of the study path rather than a whole line. */
  scope: PlayScope | null;
  /** Where the current run starts: 0 for a whole line, a stretch's `from` in a unit. */
  firstIndex: number;

  /**
   * `moves` (UCI) are the moves already played, from a saved URL: the line carries on from there. `unit` plays one unit
   * of the course's path instead of the whole line, from its part `part`.
   */
  start: (
    courseId: string,
    variantId: string,
    mode: PlayMode,
    moves?: string[],
    unit?: UnitRef,
    part?: number,
  ) => Promise<void>;
  setMode: (mode: PlayMode) => void;
  restart: () => void;
  submitMove: (uci: string) => boolean;
  /** Learn: plays any legal move from where the board is, leaving the line (or carrying on off it). */
  exploreMove: (uci: string) => boolean;
  /** Learn: takes back one explored move; the last one takes you back to the line. */
  exploreBack: () => void;
  /** Learn: drops the exploration and returns to the line where it was left. */
  leaveExplore: () => void;
  /** Learn only: jumps to a point in the line (0 is the start), to go back over moves or forward again. */
  goTo: (index: number) => void;
  hint: () => void;
  show: () => void;
  /** Cancels timers when leaving the page. */
  stop: () => void;
};

let timers: ReturnType<typeof setTimeout>[] = [];
/** How many times `start` has been called: each call's number, so a slower earlier one can tell it was overtaken. */
let runs = 0;
const later = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
const clearTimers = () => {
  for (const timer of timers) clearTimeout(timer);
  timers = [];
};

/** Is the learner asked for this step, or does the computer play it? */
const asked = (mode: PlayMode, step: LineStep) => mode === 'learn' || step.ours;

const isDrill = (mode: PlayMode) => mode !== 'learn';

const FRESH = {
  attempt: startAttempt(),
  badge: null,
  opponentThinking: false,
  results: [] as PlayState['results'],
  explore: null as Explored[] | null,
};

export const usePlay = create<PlayState>((set, get) => {
  /** After a move: finish the line, ask the learner, or let the computer reply after a short pause. */
  function proceed() {
    const { content, mode } = get();
    let { steps, index } = get();
    // In a branch drill the line is not fixed: the next move comes from the course tree, the opponent's chosen at random.
    if (index >= steps.length && mode === 'branches' && content) {
      const fromEpd = steps.at(-1)?.edge.to ?? content.opening.rootEpd;
      const next = nextBranchMove(nodeAt(content, fromEpd), random);
      if (next) {
        steps = [...steps, { fromEpd, edge: next.edge, ours: next.ours }];
        set({ steps });
      }
    }
    index = get().index;
    const scope = get().scope;
    if (index >= steps.length && scope && content && scope.part + 1 < scope.parts.length) {
      // A side unit: on to its next short branch, after a pause to see the end of this one.
      set({ opponentThinking: true });
      later(DELAYS.opponent * 2, () => {
        const part = scope.part + 1;
        const stretch = scope.parts[part]!;
        set({
          scope: { ...scope, part },
          steps: pathSteps(content, stretch.moves),
          index: stretch.from,
          firstIndex: stretch.from,
          badge: null,
        });
        proceed();
      });
      return;
    }
    if (index >= steps.length) {
      set({ phase: 'complete', opponentThinking: false });
      return;
    }
    if (asked(mode, steps[index]!)) {
      set({ opponentThinking: false, attempt: startAttempt(), startedAt: performance.now() });
      return;
    }
    set({ opponentThinking: true });
    later(DELAYS.opponent, () => {
      set((state) => ({ index: state.index + 1, badge: null }));
      proceed();
    });
  }

  function saveAnswer(step: LineStep, attempt: Attempt) {
    const { content, mode, sessionId } = get();
    if (!content) return;
    // Waits for the database if the page was opened directly and it is still opening.
    void whenStorageReady()
      .then(({ storage }) =>
        isDrill(mode) ? recordStep(storage, content, step, attempt, sessionId) : introduceStep(storage, content, step),
      )
      .catch((error: unknown) => set({ error: error instanceof Error ? error.message : String(error) }));
  }

  function begin(mode: PlayMode, from?: { steps: LineStep[]; index: number }) {
    clearTimers();
    // A unit starts again from its first part.
    const { scope, content } = get();
    const first =
      scope && content && !from
        ? { steps: pathSteps(content, scope.parts[0]!.moves), index: scope.parts[0]!.from }
        : null;
    if (scope && first) set({ scope: { ...scope, part: 0 }, firstIndex: first.index });
    // A new run of every branch draws its own line, so the old steps are dropped; a fixed line keeps its steps.
    set({
      ...FRESH,
      mode,
      index: from?.index ?? first?.index ?? 0,
      steps: from?.steps ?? first?.steps ?? (mode === 'branches' ? [] : get().steps),
      phase: 'playing',
      sessionId: crypto.randomUUID(),
      startedAt: performance.now(),
    });
    proceed();
  }

  return {
    phase: 'idle',
    error: null,
    mode: 'drill',
    content: null,
    variantId: null,
    steps: [],
    index: 0,
    ...FRESH,
    sessionId: '',
    startedAt: 0,
    scope: null,
    firstIndex: 0,

    async start(courseId, variantId, mode, moves = [], unit, part = 0) {
      // Only the latest start may set the page up: an earlier one still loading (a quick change of unit) gives way.
      const run = ++runs;
      clearTimers();
      set({ phase: 'loading', error: null, ...FRESH, scope: null, firstIndex: 0 });
      try {
        const content = await loadOpening(courseId);
        if (run !== runs) return;
        if (unit && mode !== 'branches') {
          const scope = await scopeFor(content, variantId, unit, part);
          if (run !== runs) return;
          const stretch = scope.parts[scope.part]!;
          const resumed = resumeStretch(content, stretch, moves);
          set({ content, variantId, scope, firstIndex: stretch.from, steps: resumed.steps });
          begin(mode, resumed);
          return;
        }
        // Every branch has no fixed line: the steps are chosen as the drill goes.
        const resumed = resumeFrom(content, variantId, mode, moves);
        set({ content, variantId, steps: resumed.steps });
        begin(mode, resumed);
      } catch (error) {
        if (run === runs) set({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },

    setMode: (mode) => {
      if (get().content) begin(mode);
    },
    restart: () => begin(get().mode),

    exploreMove(uci) {
      const { mode, explore, steps, index, content } = get();
      if (mode !== 'learn' || !content) return false;
      // Off the line, from the last explored move; or from the line's own position, which may be its very end.
      const from = explore?.at(-1)?.epd ?? steps[index]?.fromEpd ?? steps.at(-1)?.edge.to ?? content.opening.rootEpd;
      const played = withPromotion(from, uci);
      if (!played) return false;
      try {
        const move = playUci(from, played);
        clearTimers();
        set({ explore: [...(explore ?? []), { uci: played, san: move.san, epd: move.epd }], badge: null });
        return true;
      } catch {
        return false;
      }
    },

    exploreBack() {
      const { explore } = get();
      set({ explore: explore && explore.length > 1 ? explore.slice(0, -1) : null });
    },

    leaveExplore: () => set({ explore: null }),

    submitMove(uci) {
      const { phase, steps, index, attempt, content, startedAt } = get();
      const step = steps[index];
      // Learning: once off the line, or at its end, or playing something other than the move shown, the move is a
      // question to the engine rather than an answer, so it is explored instead of marked wrong.
      if (get().mode === 'learn' && (get().explore || !step || withPromotion(step.fromEpd, uci) !== step.edge.uci)) {
        return get().exploreMove(uci);
      }
      if (phase !== 'playing' || !step || !content || !asked(get().mode, step)) return false;
      const played = withPromotion(step.fromEpd, uci);
      if (!played) return false;

      const next = reduceAttempt(
        attempt,
        { type: 'move', uci: played, elapsedMs: performance.now() - startedAt },
        step.edge.uci,
      );
      if (next.status === 'done') {
        saveAnswer(step, next);
        set((state) => ({
          attempt: startAttempt(),
          index: state.index + 1,
          badge: { square: played.slice(2, 4), kind: 'correct' },
          results: [...state.results, { index, rating: next.rating! }],
        }));
        later(DELAYS.afterCorrect, proceed);
        return true;
      }
      set({ attempt: next, badge: { square: played.slice(2, 4), kind: 'wrong' } });
      later(DELAYS.wrongBadge, () => set({ badge: null }));
      return false;
    },

    goTo(target) {
      const { mode, steps, phase } = get();
      if (mode !== 'learn' || (phase !== 'playing' && phase !== 'complete')) return;
      clearTimers();
      const index = Math.max(get().firstIndex, Math.min(target, steps.length));
      const scope = get().scope;
      // The end of one branch of a side unit is not the end of the unit: carry on to its next branch, as playing does.
      const morePartsAfter = index >= steps.length && scope !== null && scope.part + 1 < scope.parts.length;
      set((state) => ({
        index,
        phase: index >= steps.length && !morePartsAfter ? 'complete' : 'playing',
        ...FRESH,
        results: state.results.filter((result) => result.index < index),
        startedAt: performance.now(),
      }));
      if (morePartsAfter) proceed();
    },

    hint: () => set((state) => ({ attempt: reduceAttempt(state.attempt, { type: 'hint' }, '') })),
    show: () => set((state) => ({ attempt: reduceAttempt(state.attempt, { type: 'show' }, '') })),

    stop() {
      clearTimers();
    },
  };
});

/** What the board and panel need, derived from the state. */
export function playView(state: Pick<PlayState, 'content' | 'steps' | 'index' | 'mode' | 'attempt'>) {
  const { content, steps, index, mode, attempt } = state;
  if (!content) return null;
  const upcoming = steps[index];
  const lastEdge = steps[index - 1]?.edge;
  const epd = lastEdge?.to ?? content.opening.rootEpd;
  const expected = upcoming && asked(mode, upcoming) ? upcoming.edge : undefined;
  return {
    epd,
    lastEdge,
    upcoming,
    expected,
    showExpected: expected !== undefined && (mode === 'learn' || attempt.shown),
    hintSquare: expected && attempt.hintUsed ? expected.uci.slice(0, 2) : null,
  };
}

/**
 * Where a run starts when it is resumed from the moves in a URL. A fixed line resumes after however many of its own
 * moves match; every branch rebuilds the branch that was being played, as far as the course knows it. Nothing matching
 * starts from the beginning.
 */
export function resumeFrom(
  content: OpeningContent,
  variantId: string,
  mode: PlayMode,
  moves: string[],
): { steps: LineStep[]; index: number } {
  if (mode === 'branches') {
    const edges = pathFromUcis(content, moves);
    const steps = edges.map((edge, i) => {
      const fromEpd = i === 0 ? content.opening.rootEpd : edges[i - 1]!.to;
      return { fromEpd, edge, ours: nodeAt(content, fromEpd).isOurTurn };
    });
    return { steps, index: steps.length };
  }
  const steps = lineSteps(content, variantId);
  let index = 0;
  while (index < moves.length && index < steps.length && steps[index]!.edge.uci === moves[index]) index++;
  return { steps, index };
}

/** A stretch resumed after the moves of it already played (from a saved URL); never before its own start. */
export function resumeStretch(
  content: OpeningContent,
  stretch: UnitStretch,
  moves: string[],
): { steps: LineStep[]; index: number } {
  const steps = pathSteps(content, stretch.moves);
  let index = 0;
  while (index < moves.length && index < steps.length && steps[index]!.edge.uci === moves[index]) index++;
  return { steps, index: Math.max(stretch.from, index) };
}

/** The unit a Learn or Drill address names, cut with the learner's card settings as the Path tab cuts it. */
async function scopeFor(content: OpeningContent, line: string, ref: UnitRef, part: number): Promise<PlayScope> {
  const options = await whenStorageReady()
    .then(({ storage }) => getCardOptions(storage))
    .catch(() => ({}));
  const unit = courseUnits(content, options).find((candidate) => candidate.line === line && candidate.n === ref.n);
  if (!unit)
    throw new Error(`${content.opening.name} has no unit ${ref.n} of this line now. Pick one from the course's path.`);
  const parts = unitStretches(unit, ref.first, ref.last);
  return { unit, ref, parts, part: Math.min(Math.max(0, part), parts.length - 1) };
}

import {
  cutToMove,
  decidingIndex,
  decidingPosition,
  lineSteps,
  type LineStep,
  newId,
  type OpeningContent,
  pathSteps,
  pickWeighted,
  practiceWeight,
  type Weighting,
  withPromotion,
} from '@knightschool/core';
import { create } from 'zustand';
import type { BoardBadge } from '@/components/board/shapes';
import { loadIndex, loadOpening } from '@/data/content';
import { isPassed, loadCoursePath } from '@/data/course-path';
import { resolvePool, rushCourse, savedConfig, type SpeedConfig } from '@/data/practice-config';
import { whenStorageReady } from '@/data/storage';
import { createTimers, FEEDBACK_DELAYS } from '@/lib/feedback';
import { sessionLoader, type SessionPhase } from '@/lib/session';

/** A timed run keeps lines coming; this many is far more than anyone gets through in two minutes. */
const TIMED_QUEUE = 40;

type LineResult = {
  courseId: string;
  courseName: string;
  lineId: string;
  lineName: string;
  moves: number;
  errors: number;
  hints: number;
  totalMs: number;
  slowestMs: number;
};

type Queued = { content: OpeningContent; lineId: string; lineName: string; steps: LineStep[] };

type Phase = SessionPhase<'playing' | 'between' | 'summary'>;

type SpeedState = {
  phase: Phase;
  error: string | null;
  /** How this run was set up: a copy taken when it started, so changing the saved set-up never touches it. */
  config: SpeedConfig;
  queue: Queued[];
  lineIndex: number;
  /** performance.now() when the pause before the next line ends. */
  betweenEndsAt: number;
  /** Where we are in the current line's steps. The opponent's steps are skipped the instant they come up. */
  stepIndex: number;
  /** When the current move of yours began, to time it. */
  turnStartedAt: number;
  /** Timed runs: when the clock runs out (a performance.now() value). */
  deadline: number;
  /** Time taken on each of your moves in this line, and the wrong tries so far. */
  times: number[];
  errors: number;
  /** Hints asked for in this line, and how far the hint for the current move has gone: 1 marks the piece, 2 the move. */
  hints: number;
  hintLevel: 0 | 1 | 2;
  /** The last move you made and how long it took, shown big. */
  lastMs: number | null;
  badge: BoardBadge | null;
  results: LineResult[];

  /** Back to no run: the page shows the set-up card. */
  reset: () => void;
  /**
   * Builds a run set up as `config` (the saved set-up when none is given), then counts down to its first line, whose
   * name shows meanwhile.
   */
  start: (config?: SpeedConfig) => Promise<void>;
  /** Skips the rest of the countdown before a line. */
  startNow: () => void;
  submitMove: (uci: string) => boolean;
  /** Marks the piece to move (the first step of a hint). */
  hint: () => void;
  /** Draws the move (the second step); straight from nothing it counts as both steps. */
  show: () => void;
  stop: () => void;
};

/** The countdown before a line, a timed run's clock, and the tick or cross on a move: each cleared on its own. */
const countdown = createTimers();
const clock = createTimers();
const badges = createTimers();
const clearAll = () => {
  countdown.clear();
  clock.clear();
  badges.clear();
};

/** The index of the next step the learner has to play, skipping (instantly) the opponent's moves. */
function nextOurs(steps: LineStep[], from: number): number {
  let i = from;
  while (i < steps.length && !steps[i]!.ours) i++;
  return i;
}

export const useSpeed = create<SpeedState>((set, get) => {
  function startLine(lineIndex: number) {
    const queued = get().queue[lineIndex];
    if (!queued) return endRun();
    set({
      phase: 'playing',
      lineIndex,
      stepIndex: nextOurs(queued.steps, 0),
      times: [],
      errors: 0,
      hints: 0,
      hintLevel: 0,
      lastMs: null,
      badge: null,
      turnStartedAt: performance.now(),
    });
  }

  /** The line as played so far, as a result: finished lines and the one cut off when time runs out both use this. */
  function currentResult(): LineResult | null {
    const { queue, lineIndex, times, errors, hints } = get();
    const queued = queue[lineIndex];
    if (!queued || times.length === 0) return null;
    return {
      courseId: queued.content.opening.id,
      courseName: queued.content.opening.name,
      lineId: queued.lineId,
      lineName: queued.lineName,
      moves: times.length,
      errors,
      hints,
      totalMs: Math.round(times.reduce((sum, ms) => sum + ms, 0)),
      slowestMs: Math.round(Math.max(0, ...times)),
    };
  }

  function record(result: LineResult) {
    void whenStorageReady()
      .then(({ storage }) =>
        storage.speedAttempts.append({
          id: newId(),
          at: new Date().toISOString(),
          courseId: result.courseId,
          lineId: result.lineId,
          moves: result.moves,
          errors: result.errors,
          hints: result.hints,
          totalMs: result.totalMs,
          slowestMs: result.slowestMs,
        }),
      )
      .catch(() => undefined); // a run still works when it cannot be saved
  }

  function endRun() {
    clearAll();
    set({ phase: 'summary' });
  }

  /** The first line starts, and a timed run's clock with it. */
  function launch() {
    const { config } = get();
    if (config.run === 'timed') {
      const deadline = performance.now() + config.seconds * 1000;
      set({ deadline });
      clock.clear();
      clock.later(config.seconds * 1000, timeUp);
    }
    startLine(0);
  }

  function finishLine() {
    const { queue, lineIndex, results, config } = get();
    const result = currentResult();
    if (result) {
      record(result);
      set({ results: [...results, result] });
    }
    if (lineIndex + 1 >= queue.length) return endRun();
    if (config.run === 'timed') return startLine(lineIndex + 1); // no pause: the clock is running
    set({ phase: 'between', betweenEndsAt: performance.now() + FEEDBACK_DELAYS.betweenLines });
    countdown.clear();
    countdown.later(FEEDBACK_DELAYS.betweenLines, () => startLine(lineIndex + 1));
  }

  /** Time is up in a timed run: the line in progress counts for the moves already made in it. */
  function timeUp() {
    if (get().phase !== 'playing') return;
    const result = currentResult();
    if (result) {
      record(result);
      set({ results: [...get().results, result] });
    }
    endRun();
  }

  const load = sessionLoader(get, set, 'first');

  return {
    phase: 'idle',
    error: null,
    config: savedConfig('speed'),
    queue: [],
    lineIndex: 0,
    betweenEndsAt: 0,
    stepIndex: 0,
    turnStartedAt: 0,
    deadline: 0,
    times: [],
    errors: 0,
    hints: 0,
    hintLevel: 0,
    lastMs: null,
    badge: null,
    results: [],

    reset() {
      clearAll();
      set({ phase: 'idle', error: null, results: [], queue: [] });
    },

    async start(config = savedConfig('speed')) {
      await load(
        {
          config,
          results: [],
          queue: [],
          stepIndex: 0,
          times: [],
          errors: 0,
          hints: 0,
          hintLevel: 0,
          lastMs: null,
          badge: null,
        },
        async () => {
          clearAll();
          const wanted = config.run === 'timed' ? TIMED_QUEUE : config.lines;
          const rush = rushCourse(config.source);
          const queue = rush ? await rushQueue(rush, wanted, config.weighting) : await linesQueue(config, wanted);
          // lineIndex -1 means "before the first line", so the countdown shows queue[0] as the one up next.
          set({
            queue,
            phase: 'between',
            lineIndex: -1,
            betweenEndsAt: performance.now() + FEEDBACK_DELAYS.betweenLines,
          });
          countdown.clear();
          countdown.later(FEEDBACK_DELAYS.betweenLines, launch);
        },
      );
    },

    startNow() {
      if (get().phase !== 'between') return;
      countdown.clear();
      const next = get().lineIndex + 1;
      if (next === 0) launch();
      else startLine(next);
    },

    submitMove(uci) {
      const { phase, queue, lineIndex, stepIndex, turnStartedAt, times, errors } = get();
      const queued = queue[lineIndex];
      const step = queued?.steps[stepIndex];
      if (phase !== 'playing' || !queued || !step) return false;
      const played = withPromotion(step.fromEpd, uci);
      if (!played) return false;
      if (played !== step.edge.uci) {
        set({ errors: errors + 1, badge: { square: played.slice(2, 4), kind: 'wrong' } });
        badges.clear();
        badges.later(FEEDBACK_DELAYS.wrongBadge, () => set({ badge: null }));
        return false;
      }
      const ms = performance.now() - turnStartedAt;
      const next = nextOurs(queued.steps, stepIndex + 1);
      set({
        times: [...times, ms],
        lastMs: ms,
        stepIndex: next,
        hintLevel: 0,
        badge: { square: played.slice(2, 4), kind: 'correct' },
        turnStartedAt: performance.now(),
      });
      badges.clear();
      badges.later(FEEDBACK_DELAYS.correctBadge, () => set({ badge: null }));
      if (next >= queued.steps.length) finishLine();
      return true;
    },

    hint() {
      const { phase, hintLevel, hints } = get();
      if (phase !== 'playing' || hintLevel > 0) return;
      set({ hintLevel: 1, hints: hints + 1 });
    },

    show() {
      const { phase, hintLevel, hints } = get();
      if (phase !== 'playing' || hintLevel === 2) return;
      // Each step of the hint is counted, as when the piece was asked for first.
      set({ hintLevel: 2, hints: hints + 2 - hintLevel });
    },

    stop() {
      clearAll();
    },
  };
});

/**
 * An opening rush: lines made of the passed units of one course, each from the start to the end of the unit (the moves
 * before it belong to the units it grew from, passed before it). The whole stretch is played, whatever the depth. With
 * fewer passed units than lines wanted, they come round again.
 */
export async function rushQueue(course: string, wanted: number, weighting: Weighting): Promise<Queued[]> {
  const content = await loadOpening(course);
  const path = await loadCoursePath(content);
  const candidates = path.units
    .filter((unit) => isPassed(path.progress.get(unit.id)))
    .flatMap((unit) => unit.stretches.map((stretch) => ({ unit, stretch })));
  if (candidates.length === 0)
    throw new Error(`No unit of ${content.opening.name} is passed yet. Pass one on the course's path first.`);
  // A unit is decided where it begins: the games that reach the start of its own moves.
  const weight = ({ stretch }: (typeof candidates)[number]) => {
    const positions = [content.opening.rootEpd, ...pathSteps(content, stretch.moves).map((step) => step.edge.to)];
    return practiceWeight(
      weighting,
      content.nodes[positions[decidingIndex(positions, { from: stretch.from })]!]?.popularity,
    );
  };
  const picked: typeof candidates = [];
  while (picked.length < wanted) picked.push(...pickWeighted(candidates, weight, wanted - picked.length));
  const names = new Map(content.opening.variants.map((variant) => [variant.id, variant.name]));
  return picked.map(({ unit, stretch }) => ({
    content,
    lineId: unit.line,
    lineName: `${names.get(unit.line) ?? unit.line}, unit ${unit.index + 1}`,
    steps: pathSteps(content, stretch.moves),
  }));
}

/**
 * A run's lines from a source of courses: drawn without repeats, at random or each as likely as the games that go its
 * way (`decidingPosition`: where it parts from the lines before it in its course, no deeper than the run goes).
 */
async function linesQueue(config: SpeedConfig, wanted: number): Promise<Queued[]> {
  const pool = await resolvePool(config.source, await loadIndex());
  const candidates = pool.flatMap((course) =>
    course.lines.filter((line) => line.kind === 'line').map((line) => ({ course: course.id, line })),
  );
  // Weighing by popularity needs every course of the pool; a plain draw only the ones picked.
  const contents = new Map(
    (config.weighting === 'popular'
      ? await Promise.all([...new Set(candidates.map(({ course }) => course))].map(loadOpening))
      : []
    ).map((content) => [content.opening.id, content]),
  );
  const plies = config.depth === 0 ? undefined : config.depth * 2;
  const weight = ({ course, line }: (typeof candidates)[number]) => {
    const content = contents.get(course);
    return content
      ? practiceWeight('popular', content.nodes[decidingPosition(content, line.id, plies)]?.popularity)
      : 1;
  };
  const picked = pickWeighted(candidates, weight, wanted);
  if (picked.length === 0) throw new Error('There are no lines to play from that choice.');
  return Promise.all(
    picked.map(async ({ course, line }) => {
      const content = await loadOpening(course);
      return {
        content,
        lineId: line.id,
        lineName: line.name,
        steps: cutToMove(lineSteps(content, line.id), config.depth),
      };
    }),
  );
}

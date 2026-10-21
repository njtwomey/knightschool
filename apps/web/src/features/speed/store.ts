import {
  lineSteps,
  cutToMove,
  pathSteps,
  SPEED_DEPTHS,
  type SpeedDepth,
  newId,
  pickWeighted,
  popularityWeight,
  withPromotion,
  type LineStep,
  type OpeningContent,
  type Weighting,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadIndex, loadOpening } from '@/data/content';
import { isPassed, loadCoursePath } from '@/data/course-path';
import { whenStorageReady } from '@/data/storage';
import { getEnrolled } from '@/data/training-settings';
import { oneOf, type PrefSchema, readPrefs, writePrefs } from '@/lib/local-prefs';
import { createTimers, FEEDBACK_DELAYS } from '@/lib/feedback';
import { sessionLoader } from '@/lib/session';

/** How a run is set up: a fixed number of lines, or as many moves as you can make before the time is up. */
export type SpeedConfig = {
  mode: 'lines' | 'timed';
  /** Lines in a fixed run. */
  lines: 3 | 5 | 10;
  /** Seconds in a timed run. */
  seconds: 30 | 60 | 120;
  /**
   * Where the lines come from: the courses you are learning, everything, one course by id, or an opening rush: the
   * passed units of one course (`rush:<id>`, see `rushSource`).
   */
  source: 'learning' | 'all' | (string & {});
  /** How lines are picked: at random, or favouring the ones more games reach. */
  weighting: Weighting;
  /** How deep each line goes: up to this move number, or the whole line (0). */
  depth: SpeedDepth;
};

const DEFAULT_CONFIG: SpeedConfig = {
  mode: 'lines',
  lines: 5,
  seconds: 60,
  source: 'learning',
  weighting: 'random',
  depth: 10,
};
const CONFIG_KEY = 'knightschool.speed';

const RUSH = 'rush:';
/** The source for an opening rush on one course: lines made of the units of its path already passed. */
export const rushSource = (course: string) => `${RUSH}${course}`;
/** The course of an opening rush source, or undefined for any other source. */
export const rushCourse = (source: string) => (source.startsWith(RUSH) ? source.slice(RUSH.length) : undefined);

const CONFIG_SCHEMA: PrefSchema<SpeedConfig> = {
  mode: oneOf(['lines', 'timed']),
  lines: oneOf([3, 5, 10]),
  seconds: oneOf([30, 60, 120]),
  source: (value) => typeof value === 'string' && value !== '',
  weighting: oneOf(['random', 'popular']),
  depth: oneOf(SPEED_DEPTHS),
};

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

type Phase = 'idle' | 'setup' | 'loading' | 'ready' | 'playing' | 'between' | 'summary' | 'error';

type SpeedState = {
  phase: Phase;
  error: string | null;
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
  badge: { square: string; kind: 'correct' | 'wrong' } | null;
  results: LineResult[];

  /** Opens the set-up. */
  openSetup: () => void;
  setConfig: (config: SpeedConfig) => void;
  /** Builds the run from the set-up and shows its first line. */
  prepare: () => Promise<void>;
  begin: () => void;
  startNow: () => void;
  submitMove: (uci: string) => boolean;
  hint: () => void;
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
    if (config.mode === 'timed') {
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
    if (config.mode === 'timed') return startLine(lineIndex + 1); // no pause: the clock is running
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
    config: readPrefs(CONFIG_KEY, CONFIG_SCHEMA, DEFAULT_CONFIG),
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

    openSetup() {
      clearAll();
      set({ phase: 'setup', error: null, results: [], queue: [] });
    },

    setConfig(config) {
      set({ config });
      writePrefs(CONFIG_KEY, CONFIG_SCHEMA, config);
    },

    async prepare() {
      await load({ results: [], queue: [] }, async () => {
        clearAll();
        const { config } = get();
        const rush = rushCourse(config.source);
        if (rush) {
          const queue = await rushQueue(rush, config.mode === 'timed' ? TIMED_QUEUE : config.lines, config.weighting);
          set({ queue, lineIndex: 0, phase: 'ready' });
          return;
        }
        const index = await loadIndex();
        const enrolled =
          config.source === 'learning'
            ? await whenStorageReady()
                .then(({ storage }) => getEnrolled(storage))
                .catch(() => [] as string[])
            : [];
        // "Learning" falls back to everything when nothing is enrolled: a run is about moves you have met.
        const pool = index.filter((course) =>
          config.source === 'all'
            ? true
            : config.source === 'learning'
              ? !enrolled.length || enrolled.includes(course.id)
              : course.id === config.source,
        );
        const candidates = pool.flatMap((course) =>
          course.lines.filter((line) => line.kind === 'line').map((line) => ({ course: course.id, line })),
        );
        const contents = new Map<string, OpeningContent>();
        const need = config.weighting === 'popular' ? candidates.map(({ course }) => course) : [];
        for (const course of new Set(need)) contents.set(course, await loadOpening(course));
        // A line is as popular as the position its first eight moves reach.
        const reach = ({ course, line }: (typeof candidates)[number]) => {
          const content = contents.get(course)!;
          const steps = lineSteps(content, line.id);
          const last = steps[Math.min(steps.length, 8) - 1];
          return popularityWeight(last ? content.nodes[last.edge.to]?.popularity : undefined);
        };
        const picked = pickWeighted(
          candidates,
          config.weighting === 'popular' ? reach : () => 1,
          config.mode === 'timed' ? TIMED_QUEUE : config.lines,
        );
        if (picked.length === 0) throw new Error('There are no lines to play from that choice.');
        for (const { course } of picked) if (!contents.has(course)) contents.set(course, await loadOpening(course));
        const queue = picked.map(({ course, line }) => {
          const content = contents.get(course)!;
          return {
            content,
            lineId: line.id,
            lineName: line.name,
            steps: cutToMove(lineSteps(content, line.id), config.depth),
          };
        });
        set({ queue, lineIndex: 0, phase: 'ready' });
      });
    },

    /** Skips the rest of the countdown before a line. */
    startNow() {
      if (get().phase !== 'between') return;
      countdown.clear();
      const next = get().lineIndex + 1;
      if (next === 0) launch();
      else startLine(next);
    },

    /** Start pressed: the first line's name and a countdown, then the run (and, if timed, its clock) begins. */
    begin() {
      if (get().phase !== 'ready') return;
      // lineIndex -1 means "before the first line", so the countdown shows queue[0] as the one up next.
      set({ phase: 'between', lineIndex: -1, betweenEndsAt: performance.now() + FEEDBACK_DELAYS.betweenLines });
      countdown.clear();
      countdown.later(FEEDBACK_DELAYS.betweenLines, launch);
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
      if (phase !== 'playing' || hintLevel === 2) return;
      set({ hintLevel: hintLevel === 0 ? 1 : 2, hints: hints + 1 });
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
  const end = ({ stretch }: (typeof candidates)[number]) => {
    const steps = pathSteps(content, stretch.moves);
    return popularityWeight(content.nodes[steps.at(-1)?.edge.to ?? '']?.popularity);
  };
  const picked: typeof candidates = [];
  while (picked.length < wanted)
    picked.push(...pickWeighted(candidates, weighting === 'popular' ? end : () => 1, wanted - picked.length));
  const names = new Map(content.opening.variants.map((variant) => [variant.id, variant.name]));
  return picked.map(({ unit, stretch }) => ({
    content,
    lineId: unit.line,
    lineName: `${names.get(unit.line) ?? unit.line}, unit ${unit.index + 1}`,
    steps: pathSteps(content, stretch.moves),
  }));
}

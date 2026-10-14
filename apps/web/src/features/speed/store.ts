import { lineSteps, newId, withPromotion, type LineStep, type OpeningContent } from '@knightschool/core';
import { create } from 'zustand';
import { loadIndex, loadOpening } from '@/data/content';
import { whenStorageReady } from '@/data/storage';
import { getEnrolled } from '@/data/training-settings';

/** How a run is set up: a fixed number of lines, or as many moves as you can make before the time is up. */
export type SpeedConfig = {
  mode: 'lines' | 'timed';
  /** Lines in a fixed run. */
  lines: 3 | 5 | 10;
  /** Seconds in a timed run. */
  seconds: 30 | 60 | 120;
  /** Where the lines come from: the courses you are learning, everything, or one course by id. */
  source: 'learning' | 'all' | (string & {});
};

export const DEFAULT_CONFIG: SpeedConfig = { mode: 'lines', lines: 5, seconds: 60, source: 'learning' };
const CONFIG_KEY = 'knightschool.speed';

function savedConfig(): SpeedConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SpeedConfig>;
    return {
      mode: parsed.mode === 'timed' ? 'timed' : 'lines',
      lines: parsed.lines === 3 || parsed.lines === 10 ? parsed.lines : 5,
      seconds: parsed.seconds === 30 || parsed.seconds === 120 ? parsed.seconds : 60,
      source: typeof parsed.source === 'string' && parsed.source ? parsed.source : 'learning',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** A timed run keeps lines coming; this many is far more than anyone gets through in two minutes. */
const TIMED_QUEUE = 40;

/** How long the next line's name is held up before it begins (fixed runs), and how long a wrong-move cross shows. */
export const SPEED_DELAYS = { betweenLines: 5000, wrongBadge: 600 } as const;

export type LineResult = {
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

let timer: ReturnType<typeof setTimeout> | undefined;
let deadlineTimer: ReturnType<typeof setTimeout> | undefined;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

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
    clearTimeout(timer);
    clearTimeout(deadlineTimer);
    set({ phase: 'summary' });
  }

  /** The first line starts, and a timed run's clock with it. */
  function launch() {
    const { config } = get();
    if (config.mode === 'timed') {
      const deadline = performance.now() + config.seconds * 1000;
      set({ deadline });
      clearTimeout(deadlineTimer);
      deadlineTimer = setTimeout(timeUp, config.seconds * 1000);
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
    set({ phase: 'between', betweenEndsAt: performance.now() + SPEED_DELAYS.betweenLines });
    clearTimeout(timer);
    timer = setTimeout(() => startLine(lineIndex + 1), SPEED_DELAYS.betweenLines);
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

  return {
    phase: 'idle',
    error: null,
    config: savedConfig(),
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
      clearTimeout(timer);
      clearTimeout(deadlineTimer);
      set({ phase: 'setup', error: null, results: [], queue: [] });
    },

    setConfig(config) {
      set({ config });
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      } catch {
        // the choice just is not remembered
      }
    },

    async prepare() {
      if (get().phase === 'loading') return;
      clearTimeout(timer);
      clearTimeout(deadlineTimer);
      const { config } = get();
      set({ phase: 'loading', error: null, results: [], queue: [] });
      try {
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
        const picked = shuffle(candidates).slice(0, config.mode === 'timed' ? TIMED_QUEUE : config.lines);
        if (picked.length === 0) throw new Error('There are no lines to play from that choice.');
        const contents = new Map<string, OpeningContent>();
        for (const { course } of picked) if (!contents.has(course)) contents.set(course, await loadOpening(course));
        const queue = picked.map(({ course, line }) => {
          const content = contents.get(course)!;
          return { content, lineId: line.id, lineName: line.name, steps: lineSteps(content, line.id) };
        });
        set({ queue, lineIndex: 0, phase: 'ready' });
      } catch (error) {
        set({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },

    /** Skips the rest of the countdown before a line. */
    startNow() {
      if (get().phase !== 'between') return;
      clearTimeout(timer);
      const next = get().lineIndex + 1;
      if (next === 0) launch();
      else startLine(next);
    },

    /** Start pressed: the first line's name and a countdown, then the run (and, if timed, its clock) begins. */
    begin() {
      if (get().phase !== 'ready') return;
      // lineIndex -1 means "before the first line", so the countdown shows queue[0] as the one up next.
      set({ phase: 'between', lineIndex: -1, betweenEndsAt: performance.now() + SPEED_DELAYS.betweenLines });
      clearTimeout(timer);
      timer = setTimeout(launch, SPEED_DELAYS.betweenLines);
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
        setTimeout(() => set({ badge: null }), SPEED_DELAYS.wrongBadge);
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
      setTimeout(() => set({ badge: null }), 250);
      if (next >= queued.steps.length) finishLine();
      return true;
    },

    hint() {
      const { phase, hintLevel, hints } = get();
      if (phase !== 'playing' || hintLevel === 2) return;
      set({ hintLevel: hintLevel === 0 ? 1 : 2, hints: hints + 1 });
    },

    stop() {
      clearTimeout(timer);
      clearTimeout(deadlineTimer);
    },
  };
});

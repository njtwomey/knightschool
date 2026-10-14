import { lineSteps, newId, withPromotion, type LineStep, type OpeningContent } from '@knightschool/core';
import { create } from 'zustand';
import { loadIndex, loadOpening } from '@/data/content';
import { whenStorageReady } from '@/data/storage';
import { getEnrolled } from '@/data/training-settings';

/** How many lines make a run. */
export const LINES_PER_RUN = 5;

/** How long a finished line stays up before the next begins, and how long a wrong-move cross shows. */
export const SPEED_DELAYS = { betweenLines: 1300, wrongBadge: 600 } as const;

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

type Phase = 'idle' | 'loading' | 'ready' | 'playing' | 'between' | 'summary' | 'error';

type SpeedState = {
  phase: Phase;
  error: string | null;
  queue: Queued[];
  lineIndex: number;
  /** Where we are in the current line's steps. The opponent's steps are skipped the instant they come up. */
  stepIndex: number;
  /** When the current move of yours began, to time it. */
  turnStartedAt: number;
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

  load: () => Promise<void>;
  begin: () => void;
  submitMove: (uci: string) => boolean;
  /** First press marks the piece to move, the second shows the move. Each press is counted. */
  hint: () => void;
  stop: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;

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
    if (!queued) return set({ phase: 'summary' });
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

  function finishLine() {
    const { queue, lineIndex, times, errors, hints, results } = get();
    const queued = queue[lineIndex]!;
    const totalMs = Math.round(times.reduce((sum, ms) => sum + ms, 0));
    const result: LineResult = {
      courseId: queued.content.opening.id,
      courseName: queued.content.opening.name,
      lineId: queued.lineId,
      lineName: queued.lineName,
      moves: times.length,
      errors,
      hints,
      totalMs,
      slowestMs: Math.round(Math.max(0, ...times)),
    };
    set({ results: [...results, result], phase: lineIndex + 1 >= queue.length ? 'summary' : 'between' });
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
    if (lineIndex + 1 < queue.length) {
      clearTimeout(timer);
      timer = setTimeout(() => startLine(lineIndex + 1), SPEED_DELAYS.betweenLines);
    }
  }

  return {
    phase: 'idle',
    error: null,
    queue: [],
    lineIndex: 0,
    stepIndex: 0,
    turnStartedAt: 0,
    times: [],
    errors: 0,
    hints: 0,
    hintLevel: 0,
    lastMs: null,
    badge: null,
    results: [],

    async load() {
      if (get().phase === 'loading') return;
      clearTimeout(timer);
      set({ phase: 'loading', error: null, results: [], queue: [] });
      try {
        const index = await loadIndex();
        const enrolled = await whenStorageReady()
          .then(({ storage }) => getEnrolled(storage))
          .catch(() => [] as string[]);
        // Lines from the courses you are learning, else from everything: a run is about moves you have met.
        const pool = index.filter((course) => !enrolled.length || enrolled.includes(course.id));
        const candidates = pool.flatMap((course) =>
          course.lines.filter((line) => line.kind === 'line').map((line) => ({ course: course.id, line })),
        );
        const picked = shuffle(candidates).slice(0, LINES_PER_RUN);
        if (picked.length === 0) throw new Error('There are no lines to play yet.');
        const contents = new Map<string, OpeningContent>();
        for (const { course } of picked) if (!contents.has(course)) contents.set(course, await loadOpening(course));
        const queue = picked.map(({ course, line }) => {
          const content = contents.get(course)!;
          return { content, lineId: line.id, lineName: line.name, steps: lineSteps(content, line.id) };
        });
        set({ queue, phase: 'ready' });
      } catch (error) {
        set({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },

    begin() {
      if (get().phase === 'ready') startLine(0);
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
    },
  };
});

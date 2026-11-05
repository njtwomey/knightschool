import { STATE_INFO, type ProgressState } from '@/components/progress/states';

/** The overlays the map can draw over its pills (docs/v2/components/map-tree.md). */
export type MapOverlay = 'lines' | 'progress' | 'gaps' | 'mistakes' | 'coverage' | 'puzzles';

export const OVERLAYS: readonly MapOverlay[] = ['progress', 'gaps', 'mistakes', 'coverage', 'puzzles', 'lines'];

/** What the learner knows of a move: the progress states, less locked (a move is never locked). */
export type MoveState = Exclude<ProgressState, 'locked'>;

export const MOVE_STATES: readonly MoveState[] = ['open', 'learning', 'known', 'mastered'];

/** Each state's word, from the one table of progress states. */
export const STATE_NAME = Object.fromEntries(MOVE_STATES.map((state) => [state, STATE_INFO[state].word])) as Record<
  MoveState,
  string
>;

/** A learner's move pill under Progress, filled in its state's colour; the legend draws the same samples. */
export const PILL_FILL: Record<MoveState, string> = {
  open: 'border-state-open bg-background',
  learning: 'border-state-learning bg-state-learning/25',
  known: 'border-state-known bg-state-known/25',
  mastered: 'border-state-mastered bg-state-mastered text-background',
};

/** A reply players at the band make that no line answers, off the learner's move it follows. */
export type MapGap = { san: string; share: number };

/** A common mistake by the opponent, on the move before it, with its symbol's grade. */
export type MapMistake = { share: number; practised: boolean; grade?: 'mistake' | 'blunder'; san?: string };

/** Everything the overlays draw, keyed by a move's key (the UCIs up to it). */
export type MapOverlayData = {
  states?: Record<string, MoveState>;
  gaps?: Record<string, MapGap[]>;
  mistakes?: Record<string, MapMistake>;
  /** Games at the band reaching the position after the move. */
  games?: Record<string, number>;
  puzzles?: Record<string, number>;
  /** How often the band plays the move where it is played, 0 to 1, for a reply that starts a branch. */
  shares?: Record<string, number>;
  /** The author's mark on a move: !, !!, !?, ?!, ?, ??. */
  marks?: Record<string, string>;
};

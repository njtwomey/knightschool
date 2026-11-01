/** The overlays the map can draw over its pills (docs/v2/components/map-tree.md). */
export type MapOverlay = 'lines' | 'progress' | 'gaps' | 'mistakes' | 'coverage' | 'puzzles';

export const OVERLAYS: readonly MapOverlay[] = ['progress', 'gaps', 'mistakes', 'coverage', 'puzzles', 'lines'];

/** What the learner knows of a move: the state-badge colours. */
export type MoveState = 'open' | 'learning' | 'known' | 'mastered';

export const MOVE_STATES: readonly MoveState[] = ['open', 'learning', 'known', 'mastered'];

export const STATE_NAME: Record<MoveState, string> = {
  open: 'Open',
  learning: 'Learning',
  known: 'Known',
  mastered: 'Mastered',
};

/** A reply players at the band make that no line answers, off the learner's move it follows. */
export type MapGap = { san: string; share: number };

/** A common mistake by the opponent, on their move. */
export type MapMistake = { share: number; practised: boolean };

/** Everything the overlays draw, keyed by a move's key (the UCIs up to it). */
export type MapOverlayData = {
  states?: Record<string, MoveState>;
  gaps?: Record<string, MapGap[]>;
  mistakes?: Record<string, MapMistake>;
  /** Games at the band reaching the position after the move. */
  games?: Record<string, number>;
  puzzles?: Record<string, number>;
};

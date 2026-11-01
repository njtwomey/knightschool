import type { Score } from '@knightschool/core';

/**
 * How the engine talks to Stockfish: lines of UCI text each way. A Worker in the browser, a child process in scripts,
 * a scripted fake in tests. Only text crosses it, which keeps Stockfish (GPL-3.0) a separate program.
 */
export interface UciTransport {
  post(line: string): void;
  onLine(listener: (line: string) => void): void;
  /** The engine could not start or stopped working (a Worker that failed to load). */
  onError?(listener: (error: Error) => void): void;
  terminate?(): void;
}

/** One line of the engine's analysis: its score from White's point of view and the moves, in UCI. */
export type EngineLine = { score: Score; pv: string[] };

export type Evaluation = {
  epd: string;
  /** The depth every line reached. */
  depth: number;
  /** How many lines were asked for; a position with fewer legal moves gives fewer. */
  multipv: number;
  /** Best line first (multipv 1), then the alternatives. */
  lines: EngineLine[];
  engine: string;
  /** The search was stopped before it finished; never stored. */
  partial?: boolean;
  /** Read from a cache rather than searched now. */
  cached?: boolean;
};

export type SearchOptions = { depth?: number; multipv?: number; movetimeMs?: number };

export type AnalysisOptions = {
  multipv?: number;
  /** Stop on reaching this depth; searches until stopped when left out. */
  maxDepth?: number;
};

/**
 * A continuous analysis: yields an evaluation each time every line reaches a new depth, and ends when the position
 * changes (another search), `stop()` is called, the signal aborts or `maxDepth` is reached.
 */
export interface Analysis extends AsyncIterable<Evaluation> {
  stop(): void;
  /** The deepest evaluation every line completed, once the analysis has ended; undefined if none did. */
  readonly done: Promise<Evaluation | undefined>;
}

export interface Engine {
  /** Starts the engine (downloading it the first time) and waits until it answers. */
  ready(): Promise<void>;
  /** One finished search. A search for a different position stops this one, which resolves `partial`. */
  evaluate(epd: string, opts?: SearchOptions, signal?: AbortSignal): Promise<Evaluation>;
  analyse(epd: string, opts?: AnalysisOptions, signal?: AbortSignal): Analysis;
  /** Stops whatever is running. */
  stop(): void;
  dispose(): void;
}

/** Evaluations kept so a position is searched once. `get` answers with one at least this deep and this wide. */
export interface EvalCache {
  get(epd: string, depth: number, multipv?: number): Promise<Evaluation | undefined>;
  set(evaluation: Evaluation): Promise<void>;
}

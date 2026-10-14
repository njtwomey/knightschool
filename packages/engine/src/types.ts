/** One line of engine analysis. Scores are from White's point of view, in centipawns or moves to mate. */
export type EngineLine = { cp?: number; mate?: number; pv: string[] };

export type Evaluation = {
  epd: string;
  depth: number;
  /** Best line first (multipv 1), then the alternatives. */
  lines: EngineLine[];
  engine: string;
  /** The search was stopped before it reached the depth asked for. */
  partial?: boolean;
};

export type SearchOptions = { depth?: number; movetimeMs?: number; multipv?: number };

/** How the engine talks to Stockfish: lines of UCI text each way. A Worker in the browser, a fake in tests. */
export interface UciTransport {
  send(line: string): void;
  onLine(listener: (line: string) => void): void;
  terminate(): void;
}

export interface Engine {
  /** Starts the engine (downloading it the first time) and waits until it answers. */
  ready(): Promise<void>;
  /** One search at a time: a new one with a different position stops the old, which resolves as `partial`. */
  evaluate(epd: string, opts?: SearchOptions, signal?: AbortSignal): Promise<Evaluation>;
  /** Evaluates each position in turn, yielding as each finishes. */
  measureLine(epds: string[], opts?: SearchOptions, signal?: AbortSignal): AsyncIterable<Evaluation>;
  stop(): void;
  dispose(): void;
}

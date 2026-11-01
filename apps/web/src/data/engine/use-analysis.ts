import { gameOver, replay, type Played, type Score } from '@knightschool/core';
import { analyseCached, type Evaluation } from '@knightschool/engine';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { engineStatus, evalCache, startEngine, subscribeEngine, type EngineStatus } from './store';

/** How far a line is written out: the first moves matter, the rest is the engine guessing a long way ahead. */
const SHOWN_MOVES = 12;

export type AnalysisLine = {
  /** From White's point of view. */
  score: Score;
  /** The engine's moves, in UCI. */
  pv: string[];
  /** The first moves of the line, in SAN. */
  san: string[];
  /** The same moves played out: UCI, SAN and the position after each, for a move run. */
  moves: Played[];
};

export type AnalysisState = {
  /** The engine's own state: off until something asks, then starting, ready, or failed. */
  status: EngineStatus;
  error: string | null;
  /** The position analysed. */
  epd: string;
  /** The depth every line has reached, 0 before the first. */
  depth: number;
  lines: AnalysisLine[];
  /** Still searching deeper. */
  thinking: boolean;
  /** The first result came from this visit's cache. */
  cached: boolean;
};

/** A stored evaluation may have more lines than asked for: only those asked for are shown. */
const toLines = (epd: string, evaluation: Evaluation, count: number): AnalysisLine[] =>
  evaluation.lines.slice(0, count).map((line) => {
    const moves = replay(epd, line.pv.slice(0, SHOWN_MOVES));
    return { score: line.score, pv: line.pv, san: moves.map((move) => move.san), moves };
  });

type Result = Omit<AnalysisState, 'status' | 'error'>;

const empty = (epd: string): Result => ({ epd, depth: 0, lines: [], thinking: false, cached: false });

/**
 * Live analysis of one position: the engine starts when asked, deepens up to `maxDepth` (or until the position
 * changes), and the state updates each time every line reaches a new depth. A position already over is scored without
 * the engine. Only one analysis runs at a time in the whole app; a newer one, anywhere, ends this one.
 */
export function useAnalysis(
  epd: string,
  { lines = 1, enabled = true, maxDepth }: { lines?: number; enabled?: boolean; maxDepth?: number } = {},
): AnalysisState {
  const engine = useSyncExternalStore(subscribeEngine, engineStatus, engineStatus);
  const [result, setResult] = useState<Result>(() => empty(epd));

  useEffect(() => {
    if (!enabled) return;
    const over = gameOver(epd);
    if (over) {
      setResult({ ...empty(epd), lines: [{ score: { over }, pv: [], san: [], moves: [] }] });
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setResult({ ...empty(epd), thinking: true });
    (async () => {
      try {
        const running = await startEngine();
        if (signal.aborted) return;
        let first = true;
        for await (const evaluation of analyseCached(running, evalCache, epd, { multipv: lines, maxDepth }, signal)) {
          if (signal.aborted) break;
          setResult({
            epd,
            depth: evaluation.depth,
            lines: toLines(epd, evaluation, lines),
            thinking: true,
            cached: first && Boolean(evaluation.cached),
          });
          first = false;
        }
      } catch {
        // A failed start is in the engine's status.
      } finally {
        if (!signal.aborted) setResult((current) => (current.epd === epd ? { ...current, thinking: false } : current));
      }
    })();
    return () => controller.abort();
  }, [epd, lines, enabled, maxDepth]);

  const shown = enabled && result.epd === epd ? result : empty(epd);
  return { status: engine.status, error: engine.error, ...shown };
}

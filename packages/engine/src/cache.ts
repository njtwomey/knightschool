import type { AnalysisOptions, Engine, EvalCache, Evaluation, SearchOptions } from './types';
import { DEFAULT_DEPTH } from './engine';

/** Does a stored evaluation answer a request this deep and this wide? */
export const satisfies = (stored: Evaluation, depth: number, multipv = 1): boolean =>
  !stored.partial && stored.depth >= depth && stored.multipv >= multipv;

/**
 * Evaluations held in memory for this visit: per position, only those no other entry beats on both depth and width,
 * deepest first.
 */
export function memoryCache(): EvalCache {
  const entries = new Map<string, Evaluation[]>();
  return {
    async get(epd, depth, multipv = 1) {
      return entries.get(epd)?.find((stored) => satisfies(stored, depth, multipv));
    },
    async set(evaluation) {
      if (evaluation.partial) return;
      const { cached: _cached, ...stored } = evaluation;
      const kept = (entries.get(stored.epd) ?? []).filter(
        (other) => !(stored.depth >= other.depth && stored.multipv >= other.multipv),
      );
      if (kept.some((other) => satisfies(other, stored.depth, stored.multipv))) return;
      entries.set(
        stored.epd,
        [...kept, stored].sort((a, b) => b.depth - a.depth),
      );
    },
  };
}

/** One finished search, read from the cache first; a finished search is stored, a partial one never. */
export async function evaluateCached(
  engine: Engine,
  cache: EvalCache,
  epd: string,
  opts: SearchOptions = {},
  signal?: AbortSignal,
): Promise<Evaluation> {
  const depth = opts.depth ?? DEFAULT_DEPTH;
  const hit = await cache.get(epd, depth, opts.multipv ?? 1);
  if (hit) return { ...hit, cached: true };
  const result = await engine.evaluate(epd, opts, signal);
  if (!result.partial) await cache.set(result);
  return result;
}

/**
 * A continuous analysis that starts from the cache: what is stored is yielded at once, live results only once they
 * are deeper, and the deepest depth every line completed is stored when the analysis ends. A stored result already
 * at `maxDepth` is all there is.
 */
export async function* analyseCached(
  engine: Engine,
  cache: EvalCache,
  epd: string,
  opts: AnalysisOptions = {},
  signal?: AbortSignal,
): AsyncGenerator<Evaluation> {
  const multipv = opts.multipv ?? 1;
  const hit = await cache.get(epd, 1, multipv);
  if (signal?.aborted) return;
  if (hit) {
    yield { ...hit, cached: true };
    if (opts.maxDepth && hit.depth >= opts.maxDepth) return;
  }
  const analysis = engine.analyse(epd, opts, signal);
  try {
    for await (const evaluation of analysis) {
      if (!hit || evaluation.depth > hit.depth) yield evaluation;
    }
  } finally {
    // Leaving the loop early (the caller moved on) stops the search too.
    analysis.stop();
    const deepest = await analysis.done;
    if (deepest && (!hit || deepest.depth > hit.depth)) await cache.set(deepest);
  }
}

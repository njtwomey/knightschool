import type { EvalCache } from '@knightschool/core/schema';
import { ENGINE_ID } from './engine';
import type { Engine, Evaluation, SearchOptions } from './types';

/** Where evaluations are remembered. The web app backs this with the EvalCache table. */
export interface EvalStore {
  get(epd: string, depth: number, engine: string): Promise<Evaluation | undefined>;
  put(evaluation: Evaluation): Promise<void>;
}

export type CachedEvaluation = Evaluation & { cached: boolean };

/** Looks in the store first, so a position is searched once however often it is asked about. */
export async function evaluateCached(
  engine: Engine,
  store: EvalStore,
  epd: string,
  opts: SearchOptions & { depth: number },
  signal?: AbortSignal,
): Promise<CachedEvaluation> {
  const wanted = opts.multipv ?? 1;
  const hit = await store.get(epd, opts.depth, ENGINE_ID);
  if (hit && hit.lines.length >= wanted) return { ...hit, cached: true };
  const fresh = await engine.evaluate(epd, opts, signal);
  // Only finished searches are worth keeping: a stopped one stands for a shallower depth than its key says.
  if (!fresh.partial && fresh.depth >= opts.depth) await store.put({ ...fresh, depth: opts.depth });
  return { ...fresh, cached: false };
}

/** Evaluates a line position by position, reading the store first. Yields each result as it arrives. */
export async function* measureLineCached(
  engine: Engine,
  store: EvalStore,
  epds: string[],
  opts: SearchOptions & { depth: number },
  signal?: AbortSignal,
): AsyncGenerator<CachedEvaluation> {
  for (const epd of epds) {
    signal?.throwIfAborted();
    const result = await evaluateCached(engine, store, epd, opts, signal);
    yield result;
    if (result.partial) return;
  }
}

const joined = (pv: string[]) => pv.join(' ');

/** One EvalCache row per engine line. */
export function toRows(evaluation: Evaluation, at: string): EvalCache[] {
  return evaluation.lines.map((line, index) => ({
    epd: evaluation.epd,
    depth: evaluation.depth,
    multipv: index + 1,
    cp: line.cp ?? null,
    mate: line.mate ?? null,
    pv: joined(line.pv),
    engine: evaluation.engine,
    at,
  }));
}

export function fromRows(rows: EvalCache[]): Evaluation | undefined {
  const first = rows[0];
  if (!first) return undefined;
  return {
    epd: first.epd,
    depth: first.depth,
    engine: first.engine,
    lines: [...rows]
      .sort((a, b) => a.multipv - b.multipv)
      .map((row) => ({
        ...(row.mate !== null ? { mate: row.mate } : {}),
        ...(row.cp !== null ? { cp: row.cp } : {}),
        pv: row.pv ? row.pv.split(' ') : [],
      })),
  };
}

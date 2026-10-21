import { AnalysisFile } from '@knightschool/core';
import type { Evaluation, EvalStore } from '@knightschool/engine';
import { contentUrl } from './fetch-content';

/** Engine ids of baked evaluations start with this, so a result says where it came from. */
export const BAKED_PREFIX = 'baked: ';

export const isBaked = (evaluation: { engine: string }) => evaluation.engine.startsWith(BAKED_PREFIX);

/**
 * The evaluation shipped in analysis.json for a position, if it was searched to at least `minDepth`. A shallower one is
 * ignored so the browser engine can improve on it. Baked lines are all from White's point of view, like live ones.
 */
export function bakedEvaluation(file: AnalysisFile | undefined, epd: string, minDepth: number): Evaluation | undefined {
  const entry = file?.positions[epd];
  if (!file || !entry || entry.depth < minDepth || entry.lines.length === 0) return undefined;
  return {
    epd,
    depth: entry.depth,
    engine: `${BAKED_PREFIX}${file.engine}`,
    lines: [...entry.lines]
      .sort((a, b) => a.multipv - b.multipv)
      .map((line) => ({
        ...(line.cp !== undefined ? { cp: line.cp } : {}),
        ...(line.mate !== undefined ? { mate: line.mate } : {}),
        pv: line.pv,
      })),
  };
}

/** Reads the baked analysis first and falls back to `inner`; puts go to `inner` only. */
export function bakedFirstStore(file: AnalysisFile | undefined, inner: EvalStore): EvalStore {
  return {
    get: async (epd, depth, engine) => bakedEvaluation(file, epd, depth) ?? inner.get(epd, depth, engine),
    put: (evaluation) => inner.put(evaluation),
  };
}

let loading: Promise<AnalysisFile | undefined> | undefined;

/** Written by `pnpm content:build` from content/analysis; absent (or unreadable) just means nothing is baked. */
export function loadAnalysis(): Promise<AnalysisFile | undefined> {
  loading ??= (async () => {
    try {
      const response = await fetch(contentUrl('analysis.json'));
      if (!response.ok) return undefined;
      const parsed = AnalysisFile.safeParse(await response.json());
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  })();
  return loading;
}

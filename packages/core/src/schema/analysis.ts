import { z } from 'zod';

/** One engine line. Scores are from White's point of view, as everywhere else: centipawns or moves to mate. */
export const AnalysisLine = z.object({
  multipv: z.number().int().min(1),
  cp: z.number().int().optional(),
  mate: z.number().int().optional(),
  /** UCI moves, the first few only. */
  pv: z.array(z.string()),
});
export type AnalysisLine = z.infer<typeof AnalysisLine>;

export const AnalysisEntry = z.object({ depth: z.number().int().min(0), lines: z.array(AnalysisLine) });
export type AnalysisEntry = z.infer<typeof AnalysisEntry>;

/** content/analysis/analysis.json: native Stockfish run offline by `pnpm analyse`, shipped with the app. */
export const AnalysisFile = z.object({
  /** The engine's `id name` reply, e.g. "Stockfish 17.1". */
  engine: z.string(),
  threads: z.number().int().min(1),
  hash: z.number().int().min(1),
  /** ISO date of the last write. */
  date: z.string(),
  positions: z.record(z.string(), AnalysisEntry),
});
export type AnalysisFile = z.infer<typeof AnalysisFile>;

/** Keeps the deeper entry for each position; on equal depth the entry in `incoming` wins. */
export function mergeAnalysis(
  existing: Record<string, AnalysisEntry>,
  incoming: Record<string, AnalysisEntry>,
): Record<string, AnalysisEntry> {
  const merged = { ...existing };
  for (const [epd, entry] of Object.entries(incoming)) {
    const old = merged[epd];
    if (!old || entry.depth >= old.depth) merged[epd] = entry;
  }
  return merged;
}

/** Only the positions in `epds`, for the file that ships with the site. */
export function restrictAnalysis(file: AnalysisFile, epds: Iterable<string>): AnalysisFile {
  const positions: Record<string, AnalysisEntry> = {};
  for (const epd of epds) {
    const entry = file.positions[epd];
    if (entry) positions[epd] = entry;
  }
  return { ...file, positions };
}

/**
 * Minified JSON with one position per line, sorted by EPD: a re-run that changes some positions changes only those
 * lines, so git diffs stay readable, and the file is still plain JSON.
 */
export function serializeAnalysis(file: AnalysisFile): string {
  const { positions, ...header } = file;
  const rows = Object.keys(positions)
    .sort()
    .map((epd) => `${JSON.stringify(epd)}:${JSON.stringify(positions[epd])}`);
  const head = JSON.stringify(header).slice(0, -1); // drop the closing brace to append "positions"
  return `${head},"positions":{\n${rows.join(',\n')}\n}}\n`;
}

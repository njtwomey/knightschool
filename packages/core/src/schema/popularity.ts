import { z } from 'zod';
import { ExplorerMove } from './user';

/** What the Lichess explorer said about one position, and the day it was asked. */
export const PopularityEntry = z.object({
  white: z.number().int(),
  draws: z.number().int(),
  black: z.number().int(),
  /** The moves played from here, as the explorer lists them (its top twelve). */
  moves: z.array(ExplorerMove),
  /** ISO date this position was fetched. */
  at: z.string(),
});
export type PopularityEntry = z.infer<typeof PopularityEntry>;

/**
 * content/popularity/popularity.json: how often real players reach each position and play each move, fetched offline
 * by `pnpm popularity` and committed. `pnpm content:build` reads it and never asks the network. The band (speeds and
 * ratings) is part of the file, so data fetched for a different band is never mixed in.
 */
export const PopularityFile = z.object({
  speeds: z.array(z.string()),
  ratings: z.array(z.number().int()),
  /** ISO date of the last write. */
  date: z.string(),
  positions: z.record(z.string(), PopularityEntry),
});
export type PopularityFile = z.infer<typeof PopularityFile>;

/** `existing` with `incoming` laid over it; the newer fetch of a position wins. */
export function mergePopularity(
  existing: Record<string, PopularityEntry>,
  incoming: Record<string, PopularityEntry>,
): Record<string, PopularityEntry> {
  const merged = { ...existing };
  for (const [epd, entry] of Object.entries(incoming)) {
    const old = merged[epd];
    if (!old || entry.at >= old.at) merged[epd] = entry;
  }
  return merged;
}

/** Minified JSON, one position per line, sorted by EPD, so a re-run changes only the lines that changed. */
export function serializePopularity(file: PopularityFile): string {
  const { positions, ...header } = file;
  const rows = Object.keys(positions)
    .sort()
    .map((epd) => `${JSON.stringify(epd)}:${JSON.stringify(positions[epd])}`);
  const head = JSON.stringify(header).slice(0, -1);
  return `${head},"positions":{\n${rows.join(',\n')}\n}}\n`;
}

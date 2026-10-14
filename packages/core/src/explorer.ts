import { z } from 'zod';
import { EXPLORER_BAND } from './constants';
import type { ExplorerCache, ExplorerMove } from './schema/user';
import type { OpeningContent } from './schema/content';

/** What the Lichess explorer says about one position (a subset of its response). */
export type ExplorerPosition = { white: number; draws: number; black: number; moves: ExplorerMove[] };

const total = (p: { white: number; draws: number; black: number }) => p.white + p.draws + p.black;

/**
 * Writes `popularity` on every position: the share of games at the explorer's band that reach it, from the
 * start position. A position reached by several moves keeps the largest share. `lookup` returns undefined for
 * positions the explorer has not seen; those and everything below them are left without a value.
 * Returns a new content object.
 */
export function applyPopularity(
  content: OpeningContent,
  lookup: (epd: string) => ExplorerPosition | undefined,
): OpeningContent {
  const reach = new Map<string, number>([[content.opening.rootEpd, 1]]);
  const queue = [content.opening.rootEpd];
  while (queue.length) {
    const epd = queue.shift()!;
    const share = reach.get(epd)!;
    const stats = lookup(epd);
    const games = stats ? total(stats) : 0;
    if (!stats || games === 0) continue;
    for (const edge of content.nodes[epd]!.moves) {
      const played = stats.moves.find((move) => move.uci === edge.uci);
      const childShare = share * (played ? total(played) / games : 0);
      if (childShare > (reach.get(edge.to) ?? -1)) {
        reach.set(edge.to, childShare);
        queue.push(edge.to);
      }
    }
  }
  const nodes = Object.fromEntries(
    Object.entries(content.nodes).map(([epd, node]) => {
      const popularity = reach.get(epd);
      return [epd, popularity === undefined ? node : { ...node, popularity: Math.min(1, popularity) }];
    }),
  );
  return { ...content, nodes };
}

/** The part of a Lichess explorer reply we use. Anything else in the reply is ignored. */
export const ExplorerResponse = z.object({
  white: z.number().int(),
  draws: z.number().int(),
  black: z.number().int(),
  moves: z.array(
    z.object({
      uci: z.string(),
      san: z.string(),
      white: z.number().int(),
      draws: z.number().int(),
      black: z.number().int(),
    }),
  ),
  opening: z.object({ eco: z.string(), name: z.string() }).nullish(),
});
export type ExplorerResponse = z.infer<typeof ExplorerResponse>;

/** One position asked at one rating band and speed: the cache key, so each is asked at most once a month. */
export const explorerKey = (epd: string, db: 'lichess' | 'masters' = 'lichess') =>
  `${epd}|${db}|${EXPLORER_BAND.speeds.join(',')}|${EXPLORER_BAND.ratings.join(',')}`;

/** How long a cached explorer answer is trusted. */
export const EXPLORER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function toExplorerCache(epd: string, response: ExplorerResponse, now: Date): ExplorerCache {
  return {
    key: explorerKey(epd),
    epd,
    db: 'lichess',
    speeds: EXPLORER_BAND.speeds.join(','),
    ratings: EXPLORER_BAND.ratings.join(','),
    white: response.white,
    draws: response.draws,
    black: response.black,
    moves: response.moves,
    openingName: response.opening?.name ?? null,
    fetchedAt: now.toISOString(),
  };
}

/**
 * The positions whose popularity is worth fetching: every position reached through the lines that earn cards or are
 * drilled, side variations included (branch practice samples the opponent's replies there). Rare lines and
 * alternatives are left out unless `everything` is set, so a fetch skips the long tail. Positions are keyed by EPD, so
 * one that several courses reach is listed once.
 */
export function popularityTargets(contents: OpeningContent[], everything = false): string[] {
  const epds = new Set<string>();
  for (const content of contents) {
    const wanted = new Set(
      content.opening.variants
        .filter((variant) => everything || !(variant.alternative || variant.weight === 'rare'))
        .map((variant) => variant.id),
    );
    const seen = new Set([content.opening.rootEpd]); // per course: another course reaching a position says nothing here
    const queue = [content.opening.rootEpd];
    while (queue.length) {
      const node = content.nodes[queue.shift()!];
      for (const edge of node?.moves ?? []) {
        if (!edge.variants.some((id) => wanted.has(id)) || seen.has(edge.to)) continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
    for (const epd of seen) epds.add(epd);
  }
  return [...epds].sort();
}

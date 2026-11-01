import type { SiteConfig } from '../config/site-config';

/** How a puzzle is tied to a position, strongest first (docs/v2/puzzles.md): `puzzles.levels` in config. */
export type PuzzleLevel = SiteConfig['puzzles']['levels'][number];

/** The shipping filter: `puzzles.select` in config, plus an optional cap on the rating deviation. */
export type PuzzleFilter = SiteConfig['puzzles']['select'] & { maxDeviation?: number };

/** A puzzle found at one level for one position: what the filter and the ranking read. */
export type PuzzleCandidate = {
  id: string;
  gameId: string;
  rating: number;
  deviation: number;
  popularity: number;
  plays: number;
  level: PuzzleLevel;
  /** Plies from the matched position to the puzzle's start, when the game is known to pass through it. */
  plies?: number | null;
  /** How often the matched position is reached (explorer games), when known. */
  reach?: number | null;
  /** What it was matched by (a position, a tag, a structure): a level's share is spread across these in turn. */
  group?: string;
};

export function passesFilter(puzzle: Omit<PuzzleCandidate, 'level'>, filter: PuzzleFilter): boolean {
  return (
    puzzle.rating >= filter.minRating &&
    puzzle.rating <= filter.maxRating &&
    puzzle.popularity >= filter.minPopularity &&
    puzzle.plays >= filter.minPlays &&
    (filter.maxDeviation === undefined || puzzle.deviation <= filter.maxDeviation)
  );
}

/**
 * The order within one level: soon after the position before later (unknown last), positions reached more often
 * before rarer, then popularity, then plays, then the id so the order is stable.
 */
export function compareCandidates(a: PuzzleCandidate, b: PuzzleCandidate): number {
  if ((a.plies == null) !== (b.plies == null)) return a.plies == null ? 1 : -1;
  if (a.plies != null && b.plies != null && a.plies !== b.plies) return a.plies - b.plies;
  return (
    (b.reach ?? 0) - (a.reach ?? 0) ||
    b.popularity - a.popularity ||
    b.plays - a.plays ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * Chooses what to ship from every match: those that pass the filter, each puzzle at the strongest level it matched (its
 * best match there), one puzzle per game, ranked, and at most `perOpening` in all. The levels share the cap: each takes
 * up to its share of what is left, and what one leaves unused goes to the levels after it. Within a level the groups
 * (what each was matched by) take turns, in the order of their best puzzle, so one busy position or tag cannot fill the
 * level alone. The result is in level order.
 */
export function choosePuzzles<T extends PuzzleCandidate>(
  candidates: readonly T[],
  options: { levels: readonly PuzzleLevel[]; perOpening: number; filter: PuzzleFilter },
): T[] {
  const rank = new Map(options.levels.map((level, index) => [level, index]));
  const order = (a: T, b: T) => rank.get(a.level)! - rank.get(b.level)! || compareCandidates(a, b);
  const sorted = candidates.filter((c) => rank.has(c.level) && passesFilter(c, options.filter)).sort(order);
  const seenPuzzles = new Set<string>();
  const seenGames = new Set<string>();
  const byLevel = new Map<PuzzleLevel, T[]>();
  for (const candidate of sorted) {
    if (seenPuzzles.has(candidate.id) || seenGames.has(candidate.gameId)) continue;
    seenPuzzles.add(candidate.id);
    seenGames.add(candidate.gameId);
    const list = byLevel.get(candidate.level) ?? [];
    list.push(candidate);
    byLevel.set(candidate.level, list);
  }
  const chosen: T[] = [];
  options.levels.forEach((level, index) => {
    const left = options.perOpening - chosen.length;
    const share = Math.ceil(left / (options.levels.length - index));
    chosen.push(...takeTurns(byLevel.get(level) ?? []).slice(0, share));
  });
  return chosen;
}

/** Ranked candidates reordered so their groups take turns: the first of each group, then the second of each, ... */
function takeTurns<T extends PuzzleCandidate>(ranked: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const candidate of ranked) {
    const key = candidate.group ?? '';
    const list = groups.get(key) ?? [];
    list.push(candidate);
    groups.set(key, list);
  }
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let turn = 0; out.length < ranked.length; turn += 1) {
    for (const list of lists) if (turn < list.length) out.push(list[turn]!);
  }
  return out;
}

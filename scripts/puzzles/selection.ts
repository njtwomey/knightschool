/**
 * Choosing an opening's puzzles (docs/v2/puzzles.md, the select job), shared by `select.ts` (one opening or a move
 * list) and `run.ts` (every opening). Walks the opening's positions and asks the index at every level the data
 * supports: through and after (expanded games), named variation and family (opening tags), structure (pawns), idea
 * (themes of the opening's ideas). Then core's `choosePuzzles` filters, keeps one puzzle per game, ranks and caps.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { format, resolveConfig } from 'prettier';
import {
  choosePuzzles,
  pawnStructure,
  type PuzzleFilter,
  type PuzzleLevel,
  type SiteConfig,
} from '../../packages/core/src/index.ts';
import { root } from './db.ts';
import type { MatchInput } from './lines.ts';
import type { Match, Matcher } from './match.ts';

/** Per level, how many puzzles to ask the index for at each position, tag or theme before filtering by game. */
const ASK = 400;

/** The script default for the rating deviation cap, which config does not set. */
export const DEFAULT_MAX_DEVIATION = 100;

export type SelectionResult = {
  selection: ReturnType<typeof toSelection>;
  positions: number;
  found: Record<PuzzleLevel, number>;
};

export function selectPuzzles(
  input: MatchInput,
  matcher: Matcher,
  config: SiteConfig,
  filter: PuzzleFilter,
  source: string,
): SelectionResult {
  const candidates: Match[] = [];

  // Every position from the opening's start on, once (the first line through it names it), and the lines' ends.
  const positions = new Map<string, { line: string; end: boolean }>();
  for (const line of input.lines) {
    line.played.forEach((move, index) => {
      if (index + 1 < Math.max(input.startPly, 1)) return;
      const end = index === line.played.length - 1;
      const known = positions.get(move.epd);
      if (!known) positions.set(move.epd, { line: line.id, end });
      else if (end) known.end = true;
    });
  }
  for (const { epd, line } of input.extra) if (!positions.has(epd)) positions.set(epd, { line, end: false });

  // Through and after, from expanded games. Each puzzle keeps its deepest position (fewest plies to the puzzle); a
  // line's end makes it "after the line".
  if (matcher.hasGames) {
    const deepest = new Map<string, Match>();
    for (const [epd, at] of positions) {
      const level = at.end ? 'after' : 'through';
      for (const match of matcher.through(epd, level, ASK, { line: at.line, reach: input.reach.get(epd) ?? null })) {
        const known = deepest.get(match.id);
        if (!known || (match.plies ?? Infinity) < (known.plies ?? Infinity)) deepest.set(match.id, match);
      }
    }
    candidates.push(...deepest.values());
  }

  // Named variation and family: the deepest named position on each line.
  const askedTags = new Set<string>();
  for (const line of input.lines) {
    const named = matcher.deepestNamed(line.played.map((move) => move.epd));
    if (!named) continue;
    const extra = { line: line.id, reach: input.reach.get(named.epd) ?? null };
    for (const [level, tag] of [
      ['variation', named.variation],
      ['family', named.family],
    ] as const) {
      if (askedTags.has(tag)) continue;
      askedTags.add(tag);
      candidates.push(...matcher.tagged(tag, level, named.epd, ASK, extra));
    }
  }

  // Structure: the pawns at the end of each line.
  const askedStructures = new Set<string>();
  for (const line of input.lines) {
    const end = line.played.at(-1);
    if (!end) continue;
    const structure = pawnStructure(end.epd);
    if (askedStructures.has(structure)) continue;
    askedStructures.add(structure);
    candidates.push(...matcher.structure(structure, end.epd, ASK, { line: line.id }));
  }

  // Idea: each theme of the opening's ideas asked on its own, so a common one (mate) cannot crowd out the rest.
  const startEpd = input.lines[0]?.played[Math.max(input.startPly, 1) - 1]?.epd ?? '';
  for (const theme of input.themes) {
    candidates.push(...matcher.themed([theme], startEpd, ASK).map((match) => ({ ...match, group: theme })));
  }

  const chosen = choosePuzzles(candidates, {
    levels: config.puzzles.levels,
    perOpening: config.puzzles.perOpening,
    filter,
  });
  return {
    selection: toSelection(input, chosen, config, filter, source),
    positions: positions.size,
    found: countLevels(candidates, config.puzzles.levels),
  };
}

const countLevels = (list: Match[], levels: readonly PuzzleLevel[]) =>
  Object.fromEntries(
    levels.map((level) => [level, new Set(list.filter((m) => m.level === level).map((m) => m.id)).size]),
  ) as Record<PuzzleLevel, number>;

function toSelection(input: MatchInput, chosen: Match[], config: SiteConfig, filter: PuzzleFilter, source: string) {
  return {
    opening: input.id,
    source,
    filter,
    perOpening: config.puzzles.perOpening,
    counts: countLevels(chosen, config.puzzles.levels),
    puzzles: chosen.map((match) => ({
      id: match.id,
      fen: match.fen,
      moves: match.moves,
      rating: match.rating,
      popularity: match.popularity,
      plays: match.plays,
      themes: match.themes,
      solver: match.solver,
      ...(input.side ? { mine: match.solver === input.side } : {}),
      level: match.level,
      position: match.position,
      ...(match.line ? { line: match.line } : {}),
      ...(match.plies == null ? {} : { plies: match.plies }),
      ...(match.by ? { by: match.by } : {}),
      game: `${match.gameId}#${match.ply}`,
    })),
  };
}

export const selectionPath = (id: string) => join(root, 'content/puzzles', `${id}.json`);

/** Writes a selection as Prettier would format it, so `make check` passes on the committed file. */
export async function writeSelection(path: string, selection: SelectionResult['selection']): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  const prettier = (await resolveConfig(path)) ?? {};
  writeFileSync(path, await format(JSON.stringify(selection), { ...prettier, filepath: path }));
}

/** One line per opening: puzzles chosen per level, then the total and where they went. */
export function summary(result: SelectionResult, path: string, levels: readonly PuzzleLevel[]): string {
  const { counts, puzzles, opening } = result.selection;
  const perLevel = levels.map((level) => `${level} ${counts[level]}/${result.found[level]}`).join(', ');
  return `${opening}: ${puzzles.length} puzzles from ${result.positions} positions (chosen/found: ${perLevel}) to ${relative(root, path)}`;
}

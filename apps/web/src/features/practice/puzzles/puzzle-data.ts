import {
  drawPuzzles,
  fenToEpd,
  moveCards,
  puzzleCardId,
  puzzleSolver,
  replay,
  type Card,
  type Exercise,
  type Side,
} from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import type { Idea } from '@/components/chess/idea-badge';
import type { PracticeConfig, PracticeSource } from '@/components/practice/practice-config';
import { loadCatalog, loadOpening, loadPuzzles, type Catalog, type ShippedPuzzle } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { whenSettingsReady } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { writeBoardHash } from '@/pages/board/board-hash';
import { to } from '@/router/location';
import { firstPlyOf } from '@knightschool/core';

export const puzzlesHref = (opening?: string, variation?: string) =>
  to(`/practice/puzzles${opening ? `/${opening}` : ''}${variation ? `/${variation}` : ''}`);
export const puzzleHref = (id: string) => to(`/practice/puzzle/${id}`);

/** A shipped puzzle with the opening it was chosen for. */
export type SessionPuzzle = ShippedPuzzle & { opening: string; solver: Side };

export type PuzzleData = {
  catalog: Catalog;
  openings: BuiltOpening[];
  puzzles: SessionPuzzle[];
  /** The learner's cards: puzzles already met, and which openings they are learning. */
  cards: Card[];
  /** Our ideas by the Lichess theme they match (content/ideas.yaml `themes`). */
  ideas: Record<string, Idea>;
};

/** Every opening's shipped puzzles (each kept once, for the first opening that ships it) and the learner's cards. */
export async function loadPuzzleData(): Promise<PuzzleData> {
  const catalog = await loadCatalog();
  const [openings, shipped, store] = await Promise.all([
    Promise.all(catalog.openings.map((entry) => loadOpening(entry.id))),
    Promise.all(catalog.openings.map((entry) => loadPuzzles(entry.id))),
    learnerStore(),
    // The set-up reads the puzzle rating and who solves from the settings once this resolves.
    whenSettingsReady(),
  ]);
  const seen = new Set<string>();
  const puzzles: SessionPuzzle[] = [];
  openings.forEach((opening, i) => {
    const file = shipped[i]!;
    for (const puzzle of Array.isArray(file) ? file : file.puzzles) {
      if (seen.has(puzzle.id)) continue;
      seen.add(puzzle.id);
      puzzles.push({ ...puzzle, opening: opening.id, solver: puzzle.solver ?? puzzleSolver(puzzle) });
    }
  });
  const ideas: Record<string, Idea> = {};
  for (const idea of catalog.ideas) {
    for (const theme of idea.themes)
      ideas[theme] ??= { id: idea.id, name: idea.name, kind: idea.kind, summary: idea.summary };
  }
  return { catalog, openings, puzzles, cards: await store.cards.all(), ideas };
}

export const openingSource = (id: string) => `opening:${id}`;
export const variationSource = (opening: string, variation: string) => `variation:${opening}/${variation}`;

/** The puzzles a source holds, before the solver filter and the draw. */
export function puzzlesFrom(data: PuzzleData, source: string): SessionPuzzle[] {
  const [kind, rest = ''] = source.split(/:(.*)/s);
  if (kind === 'opening') return data.puzzles.filter((puzzle) => puzzle.opening === rest);
  if (kind === 'variation') {
    const [openingId, variationId] = rest.split('/');
    const lines = data.openings.find((o) => o.id === openingId)?.variations.find((v) => v.id === variationId)?.lines;
    return data.puzzles.filter((puzzle) => puzzle.opening === openingId && puzzle.line && lines?.includes(puzzle.line));
  }
  if (source === 'hardest') {
    const met = new Map(data.cards.filter((card) => card.id.startsWith('puzzle:')).map((card) => [card.id, card]));
    return data.puzzles
      .filter((puzzle) => (met.get(puzzleCardId(puzzle.id))?.lapses ?? 0) > 0)
      .sort((a, b) => met.get(puzzleCardId(b.id))!.difficulty - met.get(puzzleCardId(a.id))!.difficulty);
  }
  if (source === 'repertoire') {
    const learning = new Set(data.cards.map((card) => card.id));
    const mine = data.openings.filter((opening) => moveCards(opening).some((card) => learning.has(card.id)));
    const ids = new Set((mine.length ? mine : data.openings).map((opening) => opening.id));
    return data.puzzles.filter((puzzle) => ids.has(puzzle.opening));
  }
  return data.puzzles;
}

/** Whose puzzles: the opening's side solving, the other side (a danger to see coming), or both. */
export function bySolver(data: PuzzleData, puzzles: readonly SessionPuzzle[], solver: PracticeConfig['solver']) {
  if (solver === 'both') return [...puzzles];
  const side = new Map(data.openings.map((opening) => [opening.id, opening.side]));
  return puzzles.filter((puzzle) => (puzzle.solver === side.get(puzzle.opening)) === (solver === 'you'));
}

/** One session's puzzles from the set-up (docs/v2/pages/puzzles.md): new ones in range first, the opening's own first. */
export function sessionPuzzles(data: PuzzleData, config: PracticeConfig): SessionPuzzle[] {
  const pool = bySolver(data, puzzlesFrom(data, config.source), config.solver);
  return drawPuzzles(pool, {
    count: config.puzzleCount,
    rating: config.rating,
    falloff: siteConfig.puzzles.ratingFalloff,
    levels: siteConfig.puzzles.levels,
    weighting: config.weighting,
    seen: new Set(data.cards.filter((card) => card.id.startsWith('puzzle:')).map((card) => card.id.slice(7))),
    random: Math.random,
  });
}

/** The set-up card's sources: each opening and variation with how many puzzles it holds for this solver. */
export function puzzleSources(data: PuzzleData, solver: PracticeConfig['solver']): PracticeSource[] {
  const count = (source: string) => bySolver(data, puzzlesFrom(data, source), solver).length;
  return data.openings.flatMap((opening) => [
    {
      id: openingSource(opening.id),
      name: opening.name,
      group: 'opening' as const,
      count: count(openingSource(opening.id)),
    },
    ...opening.variations.map((variation) => ({
      id: variationSource(opening.id, variation.id),
      name: variation.name ?? variation.id,
      group: 'variation' as const,
      opening: opening.name,
      count: count(variationSource(opening.id, variation.id)),
    })),
  ]);
}

/**
 * A puzzle as an exercise (docs/v2/library/exercise.md): from the row's FEN, the opponent's first move plays itself,
 * then the solver finds the rest; the exact move counts, and so does any mate. Its id is the puzzle's card.
 */
export const puzzleExercise = (puzzle: Pick<ShippedPuzzle, 'id' | 'fen' | 'moves'>): Exercise => ({
  id: puzzleCardId(puzzle.id),
  mode: 'puzzle',
  start: fenToEpd(puzzle.fen),
  startPly: firstPlyOf(puzzle.fen),
  side: puzzleSolver(puzzle),
  grader: { kind: 'exact', anyMate: true },
  responder: { kind: 'scripted', script: [...puzzle.moves] },
});

/** The puzzle and its solution on the Board page, at the position the solver faced. */
export const puzzleBoardHref = (puzzle: Pick<ShippedPuzzle, 'fen' | 'moves'>, solver: Side) =>
  `/board${writeBoardHash({ fen: puzzle.fen, moves: [...puzzle.moves], ply: 1, side: solver })}`;

/** The puzzle's game on Lichess at the puzzle's start, when the build shipped it. */
export const puzzleGameHref = (puzzle: Pick<ShippedPuzzle, 'game'>) =>
  puzzle.game ? `https://lichess.org/${puzzle.game}` : undefined;

const LEVEL_WORDS: Record<string, string> = {
  through: 'through your position',
  after: 'after your line',
  variation: 'by variation',
  family: 'by opening',
  structure: 'by pawn structure',
  idea: 'by idea',
};
export const levelWords = (level: string) => LEVEL_WORDS[level] ?? level;

/** The weakest level a session's puzzles were matched at, for the bar ("matched by pawn structure"). */
export function weakestLevel(puzzles: readonly SessionPuzzle[]): string | undefined {
  const levels = siteConfig.puzzles.levels as readonly string[];
  return puzzles.reduce<string | undefined>(
    (worst, puzzle) =>
      worst === undefined || levels.indexOf(puzzle.level) > levels.indexOf(worst) ? puzzle.level : worst,
    undefined,
  );
}

const tagWords = (tag: string) => tag.replace(/_/g, ' ');

/** Why a puzzle was chosen, in words: "From a game in the Italian Game Paris Defense, the opening of your Legal Mate line". */
export function matchedWhy(puzzle: SessionPuzzle, data: Pick<PuzzleData, 'openings' | 'ideas'>): string {
  const opening = data.openings.find((o) => o.id === puzzle.opening);
  const line = opening?.lines.find((l) => l.id === puzzle.line);
  const lineName = line ? `your ${line.name ?? line.id.replace(/-/g, ' ')} line` : undefined;
  const move = puzzle.game ? Number(puzzle.game.split('#')[1]) : NaN;
  const when = Number.isFinite(move) && move > 0 ? `, move ${Math.ceil(move / 2)} of the game` : '';
  switch (puzzle.level) {
    case 'through':
      return `From a game that went through ${lineName ?? 'your opening'}${when}`;
    case 'after':
      return `From a game that reached the end of ${lineName ?? 'your line'}${when}`;
    case 'variation':
    case 'family':
      return `From a game in the ${puzzle.by ? tagWords(puzzle.by) : (opening?.name ?? 'opening')}${when}`;
    case 'structure':
      return `The same pawns as ${lineName ? `the end of ${lineName}` : 'your opening'}, from any opening`;
    case 'idea': {
      const idea = puzzle.by ? data.ideas[puzzle.by] : undefined;
      return `Practises ${idea ? idea.name.toLowerCase() : puzzle.by ? tagWords(puzzle.by) : 'an idea'}, an idea of the ${opening?.name ?? 'opening'}`;
    }
    default:
      return `Matched ${levelWords(puzzle.level)}`;
  }
}

/** The position the solver faces, after the opponent's first move. */
export function solverPosition(puzzle: Pick<ShippedPuzzle, 'fen' | 'moves'>) {
  const first = replay(fenToEpd(puzzle.fen), puzzle.moves.slice(0, 1))[0];
  return first ? { epd: first.epd, lastMove: { from: first.uci.slice(0, 2), to: first.uci.slice(2, 4) } } : null;
}

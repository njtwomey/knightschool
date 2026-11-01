/**
 * make puzzles-lookup: asks the puzzle index by hand. The position is the end of --moves; each level is asked in turn
 * (or only --level) until --limit puzzles are found, and printed with their Lichess links.
 *
 *   pnpm puzzles:lookup --moves "e4 e5 Nf3 Nc6 Bc4 Bc5" [--level family] [--rating 800-1400] [--theme fork]
 *     [--solver white] [--limit 10] [--loose]
 *
 * --loose drops the popularity and plays minimums of `puzzles.select`; the rating band defaults to its band.
 */
import { parseArgs } from 'node:util';
import { pawnStructure, puzzleUrl, type PuzzleLevel, type Side } from '../../packages/core/src/index.ts';
import { openIndex } from './db.ts';
import { linesFromMoves } from './lines.ts';
import { createMatcher, loadConfig, parseBand, type Match } from './match.ts';

const { values } = parseArgs({
  options: {
    moves: { type: 'string', default: '' },
    level: { type: 'string' },
    rating: { type: 'string' },
    theme: { type: 'string' },
    solver: { type: 'string' },
    limit: { type: 'string', default: '10' },
    loose: { type: 'boolean', default: false },
  },
});

const config = loadConfig();
const levels = config.puzzles.levels;
if (values.level && !levels.includes(values.level as PuzzleLevel)) {
  console.error(`--level is one of ${levels.join(', ')}`);
  process.exit(1);
}
if (values.solver && values.solver !== 'white' && values.solver !== 'black') {
  console.error('--solver is white or black');
  process.exit(1);
}
const limit = Number(values.limit);
const filter = {
  ...config.puzzles.select,
  ...(values.rating ? parseBand(values.rating) : {}),
  ...(values.loose ? { minPopularity: -100, minPlays: 0 } : {}),
};
const line = linesFromMoves(values.moves).lines[0]!;
const epds = line.played.map((move) => move.epd);
const epd = epds.at(-1) ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const db = openIndex({ readOnly: true });
// Lookup asks the expanded games too when there are any (a hand check, not a selection).
const matcher = createMatcher(
  db,
  filter,
  {
    ...(values.theme ? { theme: values.theme } : {}),
    ...(values.solver ? { solver: values.solver as Side } : {}),
  },
  { games: true },
);
const named = matcher.deepestNamed(epds);

function ask(level: PuzzleLevel, wanted: number): Match[] {
  switch (level) {
    case 'through':
    case 'after':
      return matcher.through(epd, level, wanted);
    case 'variation':
      return named ? matcher.tagged(named.variation, 'variation', named.epd, wanted) : [];
    case 'family':
      return named ? matcher.tagged(named.family, 'family', named.epd, wanted) : [];
    case 'structure':
      return matcher.structure(pawnStructure(epd), epd, wanted);
    case 'idea':
      return values.theme ? matcher.themed([values.theme], epd, wanted) : [];
  }
}

console.log(`Position after ${line.played.length} plies${named ? `, named ${named.name}` : ''}`);
if (!matcher.hasGames) console.log('No expanded games yet: through and after find nothing.');
const shown = new Set<string>();
// "after" asks the same position as "through" here (the moves are the line), so lookup skips it unless asked.
for (const level of values.level ? [values.level as PuzzleLevel] : levels.filter((l) => l !== 'after')) {
  if (shown.size >= limit) break;
  const found = ask(level, limit * 3).filter((match) => !shown.has(match.id));
  for (const match of found.slice(0, limit - shown.size)) {
    shown.add(match.id);
    const plies = match.plies == null ? '' : ` +${match.plies}`;
    console.log(
      `${level.padEnd(9)} ${match.id} ${match.rating} ${match.solver} solves${plies}  ${match.themes.join(' ')}  ${puzzleUrl(match.id)}`,
    );
  }
}
if (!shown.size) console.log('No puzzles found.');
db.close();

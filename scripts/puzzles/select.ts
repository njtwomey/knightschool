/**
 * make puzzles-select: chooses puzzles for one opening JSON or a move list and writes them to content/puzzles/ (see
 * selection.ts for the levels and rules). `make puzzles` does this for every opening in content/openings.
 *
 *   pnpm puzzles:select [--opening <built or fixture JSON>] [--reach <JSON>] [--moves "e4 e5 ..."] [--out <file>]
 *     [--max-rd 100] [--themes fork,pin] [--games]
 *
 * --games also uses expanded games already in the index (the through and after levels); expansion is parked.
 *
 * Without --opening or --moves it selects for the Italian (the built opening if content:build has run, else the
 * example fixture).
 */
import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { parseArgs } from 'node:util';
import { openIndex, root, seconds } from './db.ts';
import { BUILT_ITALIAN, FIXTURE_ITALIAN, linesFromMoves, linesFromOpening, loadReach } from './lines.ts';
import { createMatcher, loadConfig } from './match.ts';
import { DEFAULT_MAX_DEVIATION, selectionPath, selectPuzzles, summary, writeSelection } from './selection.ts';

const { values } = parseArgs({
  options: {
    opening: { type: 'string' },
    reach: { type: 'string', multiple: true },
    moves: { type: 'string' },
    out: { type: 'string' },
    'max-rd': { type: 'string', default: String(DEFAULT_MAX_DEVIATION) },
    themes: { type: 'string' },
    games: { type: 'boolean', default: false },
  },
});

const started = Date.now();
const config = loadConfig();
const openingPath = values.opening ?? (existsSync(BUILT_ITALIAN) ? BUILT_ITALIAN : FIXTURE_ITALIAN);
const input = values.moves ? linesFromMoves(values.moves) : linesFromOpening(openingPath, values.reach ?? []);
for (const [epd, games] of loadReach()) if (!input.reach.has(epd)) input.reach.set(epd, games);
if (values.themes) input.themes = values.themes.split(',').map((theme) => theme.trim());
const filter = { ...config.puzzles.select, maxDeviation: Number(values['max-rd']) };
const db = openIndex({ readOnly: true });
const matcher = createMatcher(db, filter, {}, { games: values.games });
const result = selectPuzzles(input, matcher, config, filter, values.moves ? 'moves' : relative(root, openingPath));
db.close();
const out = values.out ?? selectionPath(input.id);
await writeSelection(out, result.selection);
console.log(summary(result, out, config.puzzles.levels));
console.log(seconds(started));

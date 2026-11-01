/**
 * pnpm analyse [--depth N] [--replies 0.03] [--force]
 *
 * Runs the native Stockfish (env STOCKFISH, else `stockfish` on the PATH) over every position of every opening, and
 * the positions after the moves players at the band play there (each played in at least --replies of the games, from
 * content/popularity), so the common wrong moves are judged before anyone plays them. Stores the results in
 * content/analysis/analysis.jsonl (committed; White's point of view; three lines each). One engine, one thread, one
 * position at a time; resumable (a position already at the depth is skipped); saved every 10 positions and on Ctrl-C.
 */
import { gameOver, playMove } from '../../packages/core/src/index.ts';
import { loadContent } from '../content/load.ts';
import { readAnalysis, readPopularity, writeAnalysis, type AnalysisEntry } from '../data-files.ts';
import { startEngine } from './uci.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const content = loadContent();
const depth = Number(flag('depth') ?? content.config.engine.bakedDepth);
const minShare = Number(flag('replies') ?? content.config.coverage.analyseShare);
const force = args.includes('--force');

type Entry = AnalysisEntry;
const read = readAnalysis();
const stored: { engine: string; threads: number; hash: number; date: string; positions: Record<string, Entry> } = {
  engine: read.meta?.engine ?? '',
  threads: 1,
  hash: 256,
  date: read.meta?.date ?? '',
  positions: read.byEpd,
};
const popularity = readPopularity().byEpd;

// What to analyse: every position of every opening, then the positions after the band's popular moves there.
const targets = new Set<string>();
for (const opening of content.openings) {
  for (const [epd, position] of Object.entries(opening.positions)) {
    targets.add(epd);
    for (const move of position.moves) targets.add(move.to);
    for (const refutation of position.refutations ?? []) {
      const after = playMove(epd, refutation.uci);
      if (after) targets.add(after.epd);
    }
    const counts = popularity[epd];
    if (!counts) continue;
    const games = counts.white + counts.draws + counts.black;
    for (const move of counts.moves) {
      const share = (move.white + move.draws + move.black) / games;
      if (share < minShare) continue;
      const after = playMove(
        epd,
        move.uci
          .replace(/^e1h1$/, 'e1g1')
          .replace(/^e1a1$/, 'e1c1')
          .replace(/^e8h8$/, 'e8g8')
          .replace(/^e8a8$/, 'e8c8'),
      );
      if (after) targets.add(after.epd);
    }
  }
}
const todo = [...targets].filter((epd) => !gameOver(epd) && (force || (stored.positions[epd]?.depth ?? 0) < depth));
console.log(`analyse: ${targets.size} positions, ${todo.length} to search at depth ${depth}`);

const engine = startEngine(process.env.STOCKFISH ?? 'stockfish', { threads: 1, hash: 256, multipv: 3 });
const save = async () => {
  stored.engine = await engine.name;
  stored.date = new Date().toISOString().slice(0, 10);
  writeAnalysis(
    { kind: 'analysis', engine: stored.engine, threads: 1, hash: 256, date: stored.date },
    stored.positions,
  );
};
process.on('SIGINT', async () => {
  await save();
  engine.quit();
  console.log('\nanalyse: stopped and saved');
  process.exit(130);
});
const started = Date.now();
for (const [i, epd] of todo.entries()) {
  stored.positions[epd] = await engine.analyse(epd, depth);
  if ((i + 1) % 10 === 0) {
    await save();
    const each = (Date.now() - started) / (i + 1);
    console.log(
      `analyse: ${i + 1}/${todo.length}, about ${Math.round(((todo.length - i - 1) * each) / 60000)} min left`,
    );
  }
}
await save();
engine.quit();
console.log(`analyse: done in ${Math.round((Date.now() - started) / 1000)} s`);

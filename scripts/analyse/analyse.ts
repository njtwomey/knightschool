/**
 * pnpm analyse [--opening id] [--minutes N] [--depth N] [--replies 0.03] [--force]
 *
 * Runs the native Stockfish (env STOCKFISH, else `stockfish` on the PATH) over every position of every opening, and
 * the positions after the moves players at the band play there (each played in at least --replies of the games, from
 * content/popularity), so the common wrong moves are judged before anyone plays them. Stores the results in
 * content/analysis/analysis.jsonl (committed; White's point of view; three lines each). Then the punishing lines:
 * every position of an authored refutation, and for each common reply that is not the opening's move, the engine's best
 * line after it for `judge.refutationPlies` plies when it is common enough to be a follow-up (`coverage.minShare`) and
 * the engine grades it a mistake or a blunder (what a follow-up plays and shows), so no position a learner steps
 * through is left without an evaluation. One engine, one thread, one position at a time; resumable (a position already
 * at the depth is skipped); saved every 10 positions and on Ctrl-C.
 */
import { gameOver, gradeOf, moveCost, playMove, sideToMove, type Score } from '../../packages/core/src/index.ts';
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
// One opening's positions, and a time limit: long analysis runs in chunks, so others can take their turn with the engine.
const only = flag('opening');
const openings = only ? content.openings.filter((opening) => opening.id === only) : content.openings;
if (only && !openings.length) throw new Error(`No opening called "${only}"`);
const minutes = flag('minutes');
const deadline = minutes === undefined ? Infinity : Date.now() + Number(minutes) * 60000;

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
/** Positions after a common reply the opening does not play, with where it was played from and how often. */
const replies = new Map<string, { parent: string; share: number }>();
for (const opening of openings) {
  for (const [epd, position] of Object.entries(opening.positions)) {
    targets.add(epd);
    for (const move of position.moves) targets.add(move.to);
    for (const refutation of position.refutations ?? []) {
      // The mistake and the whole punishing line as written.
      let at = epd;
      for (const uci of [refutation.uci, ...refutation.then.map((move) => move.uci)]) {
        const next = playMove(at, uci);
        if (!next) break;
        targets.add(next.epd);
        at = next.epd;
      }
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
      if (after) {
        targets.add(after.epd);
        if (!position.moves.some((book) => book.to === after.epd)) replies.set(after.epd, { parent: epd, share });
      }
    }
  }
}
const needs = (epd: string) => !gameOver(epd) && (force || (stored.positions[epd]?.depth ?? 0) < depth);
const todo = [...targets].filter(needs);
console.log(`analyse: ${targets.size} positions, ${todo.length} to search at depth ${depth}`);

const scoreOf = (epd: string): Score | undefined => {
  const best = stored.positions[epd]?.lines[0];
  return best ? (best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 }) : undefined;
};

/** A reply a follow-up teaches: common enough, and graded a mistake or a blunder against the best move there. */
function isFollowUp(epd: string): boolean {
  const reply = replies.get(epd);
  if (!reply || reply.share < content.config.coverage.minShare) return false;
  const before = scoreOf(reply.parent);
  const after = scoreOf(epd);
  if (!before || !after) return false;
  // The parent's best line is the better move's score; the reply's is the move played.
  const grade = gradeOf(moveCost(before, after, sideToMove(reply.parent)), content.config.judge.grades);
  return grade === 'mistake' || grade === 'blunder';
}

/** The positions along the stored best line after each follow-up reply, `plies` deep, that still need searching. */
function lineTargets(plies: number): string[] {
  const out = new Set<string>();
  for (const epd of replies.keys()) {
    if (!isFollowUp(epd)) continue;
    let at = epd;
    for (const uci of stored.positions[epd]?.lines[0]?.pv?.slice(0, plies) ?? []) {
      const next = playMove(at, uci);
      if (!next) break;
      at = next.epd;
      if (!targets.has(at) && needs(at)) out.add(at);
    }
  }
  return [...out];
}

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
// The punishing lines need the replies searched first; positions already deep enough are walked now.
todo.push(...lineTargets(content.config.judge.refutationPlies).filter((epd) => !todo.includes(epd)));
let searched = 0;
for (let i = 0; i < todo.length && Date.now() < deadline; i++) {
  const epd = todo[i]!;
  stored.positions[epd] = await engine.analyse(epd, depth);
  searched++;
  // A reply just searched adds its best line.
  if (replies.has(epd))
    for (const more of lineTargets(content.config.judge.refutationPlies)) if (!todo.includes(more)) todo.push(more);
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
const left = todo.length - searched;
console.log(
  `analyse: ${left ? `stopped with ${left} left` : 'done'} in ${Math.round((Date.now() - started) / 1000)} s`,
);

/**
 * pnpm course:eval [opening-id[/variant-id] ...] [--depth 14] [--multipv 3] [--lose 100] [--line-floor -50] [--gambit-floor -150] [--refute-min 150]
 *                  [--no-cache] [--quiet] [--dir <course-folder>] [--threads 2] [--wasm]
 *
 * `--dir` evaluates one course folder by path. The real Stockfish is used when it is
 * installed (STOCKFISH or PATH or Homebrew), with `--threads` threads; `--wasm` forces the browser build.
 *
 * Evaluates whole courses offline with the same Stockfish build the app uses (stockfish-19-lite-single from
 * node_modules, run as a child process and spoken to in UCI text; it is never imported). For each variant it prints the
 * evaluation after every move, in pawns from White's point of view, and exits 1 when it finds:
 *   - a learner move that costs the mover at least --lose centipawns against the engine's best (the same test and
 *     the same constant, BIG_SWING_CP, as the engineExplainer and the "Measure this line" button);
 *   - a line (not a trap) that ends worse than --line-floor centipawns for the learner (--gambit-floor, default
 *     -150, for a line whose Character includes gambit);
 *   - a trap we spring (for-us) that ends less than --refute-min centipawns ahead for the learner, the side that punishes.
 * Every position of the opening's tree is searched once (transpositions share a search) at depth/MultiPV like the
 * app's engine panel, and results are cached in .cache/course-eval.json (written atomically) so reruns are quick. Use --no-cache when
 * other runs may be going at the same time.
 * Exit codes: 0 clean, 1 findings, 2 bad usage or the engine failed.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  AnalysisFile,
  BIG_SWING_CP,
  moveNumberLabel,
  numberedMove,
  positionFromEpd,
  playUci,
  swingFor,
  variantPath,
  type LineEdge,
  type OpeningContent,
  type Variant,
} from '../packages/core/src/index.ts';
import {
  ENGINE_ID,
  createEngine,
  evaluateCached,
  formatScore,
  type EvalStore,
  type Evaluation,
  type UciTransport,
} from '../packages/engine/src/index.ts';
import { delimiter } from 'node:path';
import { loadCourseAt, loadCourses, root } from './content-lib.ts';

// ---- options -------------------------------------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string, fallback: number): number => {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(args[at + 1]);
  if (!Number.isFinite(value)) {
    console.error(`course:eval: --${name} needs a number`);
    process.exit(2);
  }
  args.splice(at, 2);
  return value;
};
const has = (name: string) => {
  const at = args.indexOf(`--${name}`);
  if (at >= 0) args.splice(at, 1);
  return at >= 0;
};

const depth = flag('depth', 14); // the app's ANALYSIS depth
const multipv = flag('multipv', 3); // the app's ANALYSIS MultiPV
const loseCp = flag('lose', BIG_SWING_CP);
const lineFloorCp = flag('line-floor', -50);
const gambitFloorCp = flag('gambit-floor', -150); // a line tagged Character gambit may end this far down for the learner
const refuteMinCp = flag('refute-min', 150);
const useCache = !has('no-cache');
/** Evaluate one course folder by path. */
const dirAt = args.indexOf('--dir');
const courseDir = dirAt >= 0 ? args.splice(dirAt, 2)[1] : undefined;
const threads = flag('threads', 2);
const nativeOff = has('wasm'); // by default the real Stockfish is used when it is installed
const quiet = has('quiet'); // only print moves that raise a finding or a note
const wanted = args.filter((arg) => !arg.startsWith('--'));
if (args.some((arg) => arg.startsWith('--'))) {
  console.error(`course:eval: unknown option ${args.find((arg) => arg.startsWith('--'))}`);
  process.exit(2);
}

// ---- engine over a child process -----------------------------------------------------------------------------------

const enginePath = join(root, 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.js');

/** The real Stockfish when it is installed: deeper and several times faster than the browser build. */
function nativePath(): string | undefined {
  if (nativeOff) return undefined;
  const fromEnv = process.env.STOCKFISH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : undefined;
  const dirs = (process.env.PATH ?? '').split(delimiter).filter((dir) => dir && !dir.includes('node_modules'));
  return [...dirs, '/opt/homebrew/bin', '/usr/local/bin'].map((dir) => join(dir, 'stockfish')).find(existsSync);
}

function childTransport(): UciTransport {
  const native = nativePath();
  if (!native && !existsSync(enginePath)) throw new Error(`${enginePath} not found. Run pnpm install.`);
  const child: ChildProcessWithoutNullStreams = native
    ? spawn(native, [], { stdio: 'pipe' })
    : spawn(process.execPath, [enginePath], { stdio: 'pipe' });
  if (native) child.stdin.write(`setoption name Threads value ${threads}\nsetoption name Hash value 256\n`);
  let listener: (line: string) => void = () => {};
  createInterface({ input: child.stdout }).on('line', (line) => listener(line));
  child.on('error', (error) => {
    console.error(`course:eval: the engine failed: ${error.message}`);
    process.exit(2);
  });
  return {
    send: (line) => child.stdin.write(`${line}\n`),
    onLine: (next) => {
      listener = next;
    },
    terminate: () => {
      child.stdin.write('quit\n');
      child.kill();
    },
  };
}

// ---- cache on disk, in the engine package's EvalStore shape ---------------------------------------------------------

const cacheFile = join(root, '.cache', 'course-eval.json');
/** Reads the cache file; a missing or half-written file counts as empty. */
const readCache = (): Record<string, Evaluation> => {
  try {
    return existsSync(cacheFile) ? (JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, Evaluation>) : {};
  } catch {
    return {};
  }
};
const stored: Record<string, Evaluation> = useCache ? readCache() : {};
const keyOf = (epd: string, d: number, engine: string) => `${engine}|${d}|${epd}`;
const store: EvalStore = {
  get: async (epd, d, engine) => stored[keyOf(epd, d, engine)],
  put: async (evaluation) => {
    stored[keyOf(evaluation.epd, evaluation.depth, evaluation.engine)] = evaluation;
  },
};
/** Merges with what other runs wrote meanwhile, then replaces the file in one step so readers never see half a file. */
const saveCache = () => {
  if (!useCache) return;
  mkdirSync(dirname(cacheFile), { recursive: true });
  const temp = `${cacheFile}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify({ ...readCache(), ...stored }));
  renameSync(temp, cacheFile);
};

// ---- evaluation ------------------------------------------------------------------------------------------------------

// Native Stockfish results from `pnpm analyse` win over a search when stored at least as deep as asked for.
const analysisFile = join(root, 'content', 'analysis', 'analysis.json');
const analysed = ((): AnalysisFile['positions'] => {
  try {
    const parsed = AnalysisFile.safeParse(JSON.parse(readFileSync(analysisFile, 'utf8')));
    return parsed.success ? parsed.data.positions : {};
  } catch {
    return {};
  }
})();
let fromAnalysis = 0;
function analysedEvaluation(epd: string): Evaluation | undefined {
  const entry = analysed[epd];
  if (!entry || entry.depth < depth || entry.lines.length === 0) return undefined;
  fromAnalysis++;
  return {
    epd,
    depth: entry.depth,
    engine: 'analysis',
    lines: [...entry.lines]
      .sort((a, b) => a.multipv - b.multipv)
      .map((line) => ({
        ...(line.cp !== undefined ? { cp: line.cp } : {}),
        ...(line.mate !== undefined ? { mate: line.mate } : {}),
        pv: line.pv,
      })),
  };
}

const engine = createEngine(childTransport());

/** A finished game has no engine score: stand in with a huge one for the winner. */
function terminal(epd: string): Evaluation | undefined {
  const chess = positionFromEpd(epd);
  if (chess.isCheckmate()) {
    const whiteMated = epd.split(' ')[1] === 'w';
    return { epd, depth, engine: ENGINE_ID, lines: [{ cp: whiteMated ? -10000 : 10000, pv: [] }] };
  }
  if (chess.isGameOver()) return { epd, depth, engine: ENGINE_ID, lines: [{ cp: 0, pv: [] }] };
  return undefined;
}

async function search(epd: string): Promise<Evaluation> {
  const done = terminal(epd);
  if (done) return done;
  const baked = analysedEvaluation(epd);
  if (baked) return baked;
  const result = await evaluateCached(engine, store, epd, { depth, multipv });
  if (result.partial || result.lines.length === 0) throw new Error(`no result for ${epd}`);
  return result;
}

/** Centipawns from White's point of view; mate counts as 10000 less the distance. */
const whiteScore = (line: { cp?: number; mate?: number }): number =>
  line.mate !== undefined ? (line.mate > 0 ? 10000 - line.mate : -10000 - line.mate) : (line.cp ?? 0);

const pawns = (cp: number) =>
  Math.abs(cp) >= 5000
    ? cp > 0
      ? 'mate for you'
      : 'mate against you'
    : `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;
const show = (evaluation: Evaluation) => formatScore(evaluation.lines[0]!);

type Finding = { where: string; text: string };

async function evaluateOpening(content: OpeningContent, only: Set<string>): Promise<Finding[]> {
  const { opening } = content;
  const learnerIsWhite = opening.side === 'white';
  const findings: Finding[] = [];
  const evals = new Map<string, Evaluation>();
  const nodes = Object.keys(content.nodes);
  process.stdout.write(`\n${opening.name} (${opening.id}): searching ${nodes.length} positions at depth ${depth}`);
  for (const [index, epd] of nodes.entries()) {
    evals.set(epd, await search(epd));
    if (index % 25 === 24) process.stdout.write('.');
  }
  process.stdout.write(`${fromAnalysis ? ` (${fromAnalysis} from analysis)` : ''}\n`);
  fromAnalysis = 0;
  saveCache();

  // How much the mover loses by this move, against the engine's best from the position before it.
  const swingOf = (fromEpd: string, edge: LineEdge) => swingFor(fromEpd, evals.get(fromEpd)!, evals.get(edge.to)!);
  const bestSan = (fromEpd: string, edge: LineEdge) => {
    const best = evals.get(fromEpd)!.lines[0]?.pv[0];
    if (!best || best === edge.uci) return undefined;
    try {
      return playUci(fromEpd, best).san;
    } catch {
      return undefined;
    }
  };

  const variants: Variant[] = opening.variants.filter((variant) => only.size === 0 || only.has(variant.id));
  for (const variant of variants) {
    const path = variantPath(content, variant.id);
    console.log(`\n  ${variant.kind} ${variant.id}: ${variant.name}`);
    let fromEpd = opening.rootEpd;
    path.forEach((edge, ply) => {
      const whiteMoved = ply % 2 === 0;
      const ours = whiteMoved === learnerIsWhite;
      const swing = swingOf(fromEpd, edge);
      const marked = edge.annotation?.nag.some((nag) => nag === 2 || nag === 4 || nag === 6);
      const number = moveNumberLabel(ply);
      const costs = swing !== null && swing <= -loseCp;
      let note = '';
      if (costs) {
        const best = bestSan(fromEpd, edge);
        note = `  costs ${Math.round(-swing!)} cp${best ? `, engine prefers ${best}` : ''}`;
        if (ours && !marked) {
          findings.push({
            where: `${opening.id}/${variant.id}`,
            text: `${numberedMove(ply, edge.san)} costs the learner ${Math.round(-swing!)} cp${best ? ` (engine prefers ${best})` : ''}`,
          });
          note += '  <-- FINDING';
        } else if (marked) note += '  (marked as a mistake)';
        else note += '  (opponent move)';
      } else if (
        marked &&
        swing !== null &&
        swing > -50 &&
        edge.annotation?.nag.some((nag) => nag === 2 || nag === 4)
      ) {
        note = `  note: marked as a mistake but the engine sees it costing only ${Math.round(Math.max(0, -swing))} cp`;
      }
      if (!quiet || costs || note) {
        const after = evals.get(edge.to)!;
        console.log(
          `    ${number.padEnd(5)} ${edge.san.padEnd(7)} ${ours ? 'you ' : 'them'} ${show(after).padStart(6)}${note}`,
        );
      }
      fromEpd = edge.to;
    });

    const last = evals.get(fromEpd)!;
    const end = whiteScore(last.lines[0]!);
    const forLearner = learnerIsWhite ? end : -end;
    const verdict = (text: string) => {
      findings.push({ where: `${opening.id}/${variant.id}`, text });
      return '  <-- FINDING';
    };
    let mark = '';
    const floorCp = variant.tags.character.includes('gambit') ? gambitFloorCp : lineFloorCp;
    if (variant.kind === 'line' && !variant.alternative && forLearner < floorCp)
      mark = verdict(
        `ends at ${show(last)} (White's view), ${(forLearner / 100).toFixed(2)} for the learner; floor is ${floorCp / 100}${floorCp === gambitFloorCp ? ' (gambit)' : ''}`,
      );
    // A trap we spring must leave us well ahead. A trap we must avoid ends with us worse, which is its point.
    if (variant.kind === 'refutation' && variant.whose === 'for-us' && forLearner < refuteMinCp)
      mark = verdict(
        `trap ends at ${show(last)} (White's view), ${(forLearner / 100).toFixed(2)} for the learner; wanted at least ${refuteMinCp / 100}`,
      );
    console.log(`    ends ${show(last).padStart(6)} (White's view), ${pawns(forLearner)} for you${mark}`);
  }

  // Cards come from every repertoire move in the tree, including those inside sub-variations, so check them all.
  if (only.size === 0) {
    const shown = new Set(
      variants.flatMap((variant) => variantPath(content, variant.id).map((edge) => edge.uci + edge.to)),
    );
    for (const node of Object.values(content.nodes)) {
      if (!node.isOurTurn) continue;
      for (const edge of node.moves) {
        if (!edge.isRepertoire || shown.has(edge.uci + edge.to)) continue;
        const swing = swingOf(node.epd, edge);
        if (swing !== null && swing <= -loseCp) {
          const best = bestSan(node.epd, edge);
          findings.push({
            where: `${opening.id}/${edge.variants.join(',')}`,
            text: `sideline card ${edge.san} (from ${node.epd}) costs the learner ${Math.round(-swing)} cp${best ? ` (engine prefers ${best})` : ''}`,
          });
        }
      }
    }
  }
  return findings;
}

async function main() {
  const all = courseDir ? [loadCourseAt(courseDir)] : loadCourses();
  const ids = new Set(all.map((content) => content.opening.id));
  const variantFilter = new Set<string>();
  const chosen = wanted.length
    ? wanted.map((arg) => {
        const [openingId = '', variantId] = arg.split('/');
        if (!ids.has(openingId)) throw new Error(`no opening "${openingId}". Known: ${[...ids].join(', ')}`);
        if (variantId) variantFilter.add(variantId);
        return openingId;
      })
    : [...ids];
  if (courseDir) wanted.length = 0;
  const findings: Finding[] = [];
  try {
    await engine.ready();
    for (const content of all.filter((candidate) => chosen.includes(candidate.opening.id))) {
      findings.push(...(await evaluateOpening(content, variantFilter)));
    }
  } finally {
    saveCache();
    engine.dispose();
  }
  console.log(
    `\nScores are pawns from White's point of view (Stockfish ${ENGINE_ID}, depth ${depth}, MultiPV ${multipv}).`,
  );
  if (findings.length === 0) {
    console.log('course:eval: no findings.');
    return;
  }
  console.log(`\ncourse:eval: ${findings.length} finding${findings.length === 1 ? '' : 's'}`);
  for (const finding of findings) console.log(`  ${finding.where}: ${finding.text}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`course:eval failed: ${error instanceof Error ? error.message : error}`);
  process.exit(2);
});

/**
 * pnpm analyse [course-id ...] [--all] [--depth 24] [--threads N] [--hash 1024] [--multipv 3] [--force]
 *
 * Searches every position of the named courses (content/openings and content/motifs) with the NATIVE Stockfish
 * (env STOCKFISH, else `which stockfish`; `brew install stockfish`) over UCI, on many threads, and stores the result in
 * content/analysis/analysis.json. `pnpm content:build` ships the positions that appear in a course; the web app shows
 * them instantly ("depth 26, baked") and `pnpm course:eval` reads them instead of searching.
 *
 * One engine process is reused and positions are searched one after another (the engine itself uses every thread).
 * Each distinct EPD is searched once overall, so transpositions between courses cost nothing. A position already stored
 * at >= --depth is skipped unless --force. The file is rewritten (temp file + rename) every 20 positions and on
 * Ctrl-C, so a stopped run loses at most the position in progress and the next run carries on where it left off.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  AnalysisFile,
  mergeAnalysis,
  positionFromEpd,
  serializeAnalysis,
  type AnalysisEntry,
  type AnalysisLine,
} from '../packages/core/src/index.ts';
import { parseBestMove, parseInfo, type Info } from '../packages/engine/src/uci.ts';
import { loadCourses, rel, root } from './content-lib.ts';

export const analysisPath = join(root, 'content', 'analysis', 'analysis.json');
const PV_MOVES = 8;
const SAVE_EVERY = 20;

// ---- options -------------------------------------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string, fallback: number): number => {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = Number(args[at + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`analyse: --${name} needs a positive whole number`);
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
const depth = flag('depth', 24);
const threads = flag('threads', Math.max(1, cpus().length - 1));
const hash = flag('hash', 1024);
const multipv = flag('multipv', 3);
const force = has('force');
const all = has('all');
const wanted = args.filter((arg) => !arg.startsWith('--'));
if (args.some((arg) => arg.startsWith('--'))) {
  console.error(`analyse: unknown option ${args.find((arg) => arg.startsWith('--'))}`);
  process.exit(2);
}
if (!all && wanted.length === 0) {
  console.error(
    'usage: pnpm analyse [course-id ...] [--all] [--depth 24] [--threads N] [--hash MB] [--multipv 3] [--force]',
  );
  process.exit(2);
}

// ---- native engine -------------------------------------------------------------------------------------------------

function findStockfish(): string {
  const fromEnv = process.env.STOCKFISH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`STOCKFISH=${fromEnv} does not exist.`);
    return fromEnv;
  }
  // Like `which`, but skipping node_modules/.bin: under pnpm that holds the npm package's JavaScript/WASM build.
  const dirs = (process.env.PATH ?? '').split(delimiter).filter((dir) => dir && !dir.includes('node_modules'));
  for (const dir of [...dirs, '/opt/homebrew/bin', '/usr/local/bin']) {
    const candidate = join(dir, 'stockfish');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('Native Stockfish not found. Run `brew install stockfish` or set STOCKFISH=/path/to/stockfish.');
}

class Uci {
  private child: ChildProcessWithoutNullStreams;
  private listeners = new Set<(line: string) => void>();
  constructor(path: string) {
    this.child = spawn(path, [], { stdio: 'pipe' });
    createInterface({ input: this.child.stdout }).on('line', (line) => this.listeners.forEach((fn) => fn(line)));
    this.child.on('error', (error) => {
      console.error(`analyse: the engine failed: ${error.message}`);
      process.exit(2);
    });
  }
  send(line: string) {
    this.child.stdin.write(`${line}\n`);
  }
  /** Sends `command` and resolves with every line up to and including the first one `done` accepts. */
  run(command: string, done: (line: string) => boolean, onLine?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        onLine?.(line);
        if (done(line)) {
          this.listeners.delete(listener);
          resolve();
        }
      };
      this.listeners.add(listener);
      this.send(command);
    });
  }
  quit() {
    this.send('quit');
    this.child.kill();
  }
}

// ---- the run -------------------------------------------------------------------------------------------------------

function readFile(): AnalysisFile | undefined {
  if (!existsSync(analysisPath)) return undefined;
  const parsed = AnalysisFile.safeParse(JSON.parse(readFileSync(analysisPath, 'utf8')));
  if (!parsed.success) throw new Error(`${rel(analysisPath)}: ${parsed.error.message}`);
  return parsed.data;
}

const sideOf = (epd: string): 'white' | 'black' => (epd.split(' ')[1] === 'w' ? 'white' : 'black');

async function search(uci: Uci, epd: string): Promise<AnalysisEntry | undefined> {
  const best = new Map<number, Info>();
  uci.send(`position fen ${epd} 0 1`);
  await uci.run(
    `go depth ${depth}`,
    (line) => parseBestMove(line) !== null,
    (line) => {
      const info = parseInfo(line, sideOf(epd));
      if (!info) return;
      const previous = best.get(info.multipv);
      if (!previous || info.depth >= previous.depth) best.set(info.multipv, info);
    },
  );
  const infos = [...best.values()].sort((a, b) => a.multipv - b.multipv);
  if (infos.length === 0) return undefined;
  const reached = Math.min(...infos.map((info) => info.depth));
  const lines: AnalysisLine[] = infos.map((info) => ({
    multipv: info.multipv,
    ...(info.line.cp !== undefined ? { cp: info.line.cp } : {}),
    ...(info.line.mate !== undefined ? { mate: info.line.mate } : {}),
    pv: info.line.pv.slice(0, PV_MOVES),
  }));
  return { depth: reached, lines };
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m${String(s % 60).padStart(2, '0')}s`;
};

async function main() {
  const courses = loadCourses();
  const known = new Set(courses.map((content) => content.opening.id));
  for (const id of wanted) if (!known.has(id)) throw new Error(`no course "${id}". Known: ${[...known].join(', ')}`);
  const chosen = courses.filter((content) => all || wanted.includes(content.opening.id));

  // Each distinct position once, in course order (main lines first within a course).
  const epds = [...new Set(chosen.flatMap((content) => Object.keys(content.nodes)))].filter((epd) => {
    const chess = positionFromEpd(epd);
    return !chess.isGameOver(); // checkmate and stalemate have nothing to search; course:eval stands in for them
  });

  const path = findStockfish();
  const uci = new Uci(path);
  let engineName = 'Stockfish';
  await uci.run(
    'uci',
    (line) => line.trim() === 'uciok',
    (line) => {
      const match = /^id name (.+)$/.exec(line.trim());
      if (match) engineName = match[1]!;
    },
  );
  if (/wasm|lite/i.test(engineName)) throw new Error(`${path} is ${engineName}, not a native build. Set STOCKFISH.`);
  uci.send(`setoption name Threads value ${threads}`);
  uci.send(`setoption name Hash value ${hash}`);
  uci.send(`setoption name MultiPV value ${multipv}`);
  await uci.run('isready', (line) => line.trim() === 'readyok');

  const previous = readFile();
  let positions = previous?.positions ?? {};
  const todo = epds.filter((epd) => force || (positions[epd]?.depth ?? 0) < depth);
  console.log(
    `analyse: ${engineName}, ${threads} threads, ${hash} MB, depth ${depth}, MultiPV ${multipv}\n` +
      `  ${chosen.length} course${chosen.length === 1 ? '' : 's'}, ${epds.length} distinct positions, ` +
      `${epds.length - todo.length} already at depth >= ${depth}, ${todo.length} to search`,
  );

  let pending: Record<string, AnalysisEntry> = {};
  const save = () => {
    if (Object.keys(pending).length === 0) return;
    positions = mergeAnalysis(positions, pending);
    pending = {};
    const file: AnalysisFile = {
      engine: engineName,
      threads,
      hash,
      date: new Date().toISOString().slice(0, 10),
      positions,
    };
    mkdirSync(dirname(analysisPath), { recursive: true });
    const temp = `${analysisPath}.${process.pid}.tmp`;
    writeFileSync(temp, serializeAnalysis(file));
    renameSync(temp, analysisPath);
  };

  let interrupted = false;
  process.on('SIGINT', () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.log('\nanalyse: stopping, saving what is done (Ctrl-C again to quit at once)');
    uci.send('stop');
  });

  const started = Date.now();
  let done = 0;
  for (const epd of todo) {
    if (interrupted) break;
    const entry = await search(uci, epd);
    if (interrupted) break; // a stopped search is shallower than its depth says: discard it
    if (entry) pending[epd] = entry;
    done++;
    if (done % SAVE_EVERY === 0) save();
    if (done % 5 === 0 || done === todo.length) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = done / elapsed;
      process.stdout.write(
        `\r  ${done}/${todo.length}  ${rate.toFixed(2)} pos/s  elapsed ${clock(elapsed)}  eta ${clock((todo.length - done) / rate)}   `,
      );
    }
  }
  process.stdout.write('\n');
  save();
  uci.quit();
  const seconds = (Date.now() - started) / 1000;
  console.log(
    `analyse: ${interrupted ? 'stopped after' : 'searched'} ${done} position${done === 1 ? '' : 's'} in ${clock(seconds)}` +
      `${done ? ` (${(done / seconds).toFixed(2)} pos/s)` : ''}; wrote ${rel(analysisPath)} (${Object.keys(positions).length} positions)`,
  );
  if (interrupted) process.exit(130);
}

main().catch((error) => {
  console.error(`analyse failed: ${error instanceof Error ? error.message : error}`);
  process.exit(2);
});

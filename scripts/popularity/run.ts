/**
 * pnpm popularity [--refresh-days N] [--limit N]      (or: make popularity)
 *
 * Asks the Lichess explorer how often players at the band (config `coverage.band`: ratings and speeds) reach each
 * position of every opening and which moves they play there, and stores the answers in
 * content/popularity/popularity.jsonl (committed). `content:build` reads that file and never touches the network.
 *
 * The positions asked about are every position of every opening's tree (setup, lines and written refutations) and the
 * position after each move it plays: what coverage, gaps, follow-ups and the judge read. A position already in the
 * file is skipped, so the run resumes and is cheap after adding a line; --refresh-days N asks again for entries older
 * than that. One request at a time, a pause after a 429 (config `lichess.pauseAfter429Ms`); the file is saved every 25
 * positions and on Ctrl-C.
 *
 * Needs LICHESS_TOKEN in .env (a free personal token with no scopes; .env.example), passed by package.json's
 * --env-file-if-exists. The token is sent only to the explorer and never printed.
 */
import { playMove } from '../../packages/core/src/index.ts';
import { loadContent } from '../content/load.ts';
import { readPopularity, writePopularity, type PopularityEntry } from '../data-files.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? Number(args[at + 1]) : undefined;
};
const refreshDays = flag('refresh-days');
const limit = flag('limit');
const token = process.env.LICHESS_TOKEN;
if (!token) {
  console.error('popularity: LICHESS_TOKEN is not set; add it to .env (see .env.example)');
  process.exit(2);
}

const content = loadContent();
const band = content.config.coverage.band;
const today = () => new Date().toISOString().slice(0, 10);
const read = readPopularity();
if (read.meta && (read.meta.ratings.join() !== band.ratings.join() || read.meta.speeds.join() !== band.speeds.join())) {
  console.error('popularity: the file was fetched for another band; change coverage.band back or move the file aside');
  process.exit(2);
}
const stored = read.byEpd;

const wanted = new Set<string>();
for (const opening of content.openings) {
  for (const [epd, position] of Object.entries(opening.positions)) {
    wanted.add(epd);
    for (const move of position.moves) wanted.add(move.to);
    for (const refutation of position.refutations ?? []) {
      let at = epd;
      for (const uci of [refutation.uci, ...refutation.then.map((move) => move.uci)]) {
        const next = playMove(at, uci);
        if (!next) break;
        wanted.add(next.epd);
        at = next.epd;
      }
    }
  }
}
const stale = (entry: PopularityEntry | undefined) =>
  !entry || (refreshDays !== undefined && (!entry.at || Date.now() - Date.parse(entry.at) > refreshDays * 86_400_000));
const todo = [...wanted].filter((epd) => stale(stored[epd])).slice(0, limit ?? Infinity);
console.log(`popularity: ${wanted.size} positions, ${todo.length} to ask the explorer`);

const save = () =>
  writePopularity({ kind: 'popularity', speeds: [...band.speeds], ratings: [...band.ratings], date: today() }, stored);
process.on('SIGINT', () => {
  save();
  console.log('\npopularity: stopped and saved');
  process.exit(130);
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Explorer = {
  white: number;
  draws: number;
  black: number;
  moves: { uci: string; san: string; white: number; draws: number; black: number }[];
};

async function ask(epd: string): Promise<PopularityEntry> {
  const url = new URL('https://explorer.lichess.ovh/lichess');
  url.searchParams.set('variant', 'standard');
  url.searchParams.set('fen', `${epd} 0 1`);
  url.searchParams.set('speeds', band.speeds.join(','));
  url.searchParams.set('ratings', band.ratings.join(','));
  url.searchParams.set('topGames', '0');
  url.searchParams.set('recentGames', '0');
  for (;;) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 429) {
      console.log(`popularity: rate limited, pausing ${content.config.lichess.pauseAfter429Ms / 1000} s`);
      await sleep(content.config.lichess.pauseAfter429Ms);
      continue;
    }
    if (!response.ok) throw new Error(`explorer answered ${response.status} for ${epd}`);
    const body = (await response.json()) as Explorer;
    return {
      white: body.white,
      draws: body.draws,
      black: body.black,
      at: today(),
      moves: body.moves.map(({ uci, san, white, draws, black }) => ({ uci, san, white, draws, black })),
    };
  }
}

for (const [i, epd] of todo.entries()) {
  stored[epd] = await ask(epd);
  if ((i + 1) % 25 === 0) {
    save();
    console.log(`popularity: ${i + 1}/${todo.length}`);
  }
}
save();
console.log(`popularity: done, ${todo.length} asked`);

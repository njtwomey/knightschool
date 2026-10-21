/**
 * make gaps: where the repertoire leaves the learner without an answer, ranked by how many games go there.
 *
 * For each side it merges every course for that side into one repertoire (a reply one course leaves open may be
 * another course's whole subject), walks it from the start, and at every position where the opponent is to move looks
 * up what players at the explorer band actually play (content/popularity/popularity.json). A reply no course answers is
 * a gap; its weight is the number of explorer games that play it there, and the courses whose lines reach the position
 * are named, since that is where an answer would go. Positions the popularity file has no data for are skipped (run
 * `make popularity` to fill them in).
 *
 *   pnpm content:gaps [white|black] [--top 25] [--share 0.04]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PopularityFile, sideToMove, START_EPD, type OpeningContent, type Side } from '../packages/core/src/index.ts';
import { loadCourses, root } from './content-lib.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const at = args.indexOf(name);
  return at >= 0 ? Number(args[at + 1]) : fallback;
};
const top = flag('--top', 25);
const minShare = flag('--share', 0.04); // ignore replies under this share of the games at the position
const sides = (['white', 'black'] as const).filter(
  (side) => !args.some((arg) => arg === 'white' || arg === 'black') || args.includes(side),
);

const popularity = PopularityFile.parse(
  JSON.parse(readFileSync(join(root, 'content', 'popularity', 'popularity.json'), 'utf8')),
).positions;
/** The explorer writes castling as the king taking its rook (e1h1); our lines write the king's move (e1g1). */
const CASTLING: Record<string, string> = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };
const castlingUci = (uci: string) => CASTLING[uci] ?? uci;

const gamesAt = (epd: string) => {
  const entry = popularity[epd];
  return entry ? entry.white + entry.draws + entry.black : 0;
};

type Gap = { games: number; share: number; moves: string; reply: string; courses: string[] };

function gapsFor(side: Side, courses: OpeningContent[]): Gap[] {
  // The repertoire: every course's positions and moves for this side, merged, and which courses reach each position.
  const moves = new Map<string, Set<string>>();
  const reachedBy = new Map<string, Set<string>>();
  for (const content of courses)
    for (const node of Object.values(content.nodes)) {
      const out = moves.get(node.epd) ?? new Set<string>();
      for (const edge of node.moves) out.add(edge.uci);
      moves.set(node.epd, out);
      reachedBy.set(node.epd, (reachedBy.get(node.epd) ?? new Set()).add(content.opening.id));
    }
  const nodes = new Map(
    courses.flatMap((content) => Object.values(content.nodes).map((node) => [node.epd, node] as const)),
  );
  const gaps: Gap[] = [];
  const seen = new Set<string>();
  const walk = (epd: string, path: string[]) => {
    if (seen.has(epd)) return;
    seen.add(epd);
    const answered = moves.get(epd) ?? new Set();
    const here = gamesAt(epd);
    if (sideToMove(epd) !== side && here > 0) {
      for (const move of popularity[epd]!.moves) {
        const count = move.white + move.draws + move.black;
        if (answered.has(castlingUci(move.uci)) || count / here < minShare) continue;
        gaps.push({
          games: count,
          share: count / here,
          moves: path.join(' '),
          reply: move.san,
          courses: [...(reachedBy.get(epd) ?? [])],
        });
      }
    }
    const node = nodes.get(epd);
    if (!node) return;
    // Follow every course's moves from here (the merged repertoire), in a stable order.
    const next = new Map<string, { to: string; san: string }>();
    for (const content of courses)
      for (const edge of content.nodes[epd]?.moves ?? []) next.set(edge.uci, { to: edge.to, san: edge.san });
    for (const { to, san } of next.values())
      walk(to, [...path, `${Math.floor(node.ply / 2) + 1}${node.ply % 2 ? '...' : '.'}${san}`]);
  };
  walk(START_EPD, []);
  return gaps.sort((a, b) => b.games - a.games);
}

const all = loadCourses();
const games = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
for (const side of sides) {
  const gaps = gapsFor(
    side,
    all.filter((content) => content.opening.side === side),
  );
  console.log(
    `\nAs ${side}: ${gaps.length} replies played in at least ${(minShare * 100).toFixed(0)}% of games with no answer`,
  );
  for (const gap of gaps.slice(0, top))
    console.log(
      `  ${games(gap.games).padStart(6)}  after ${gap.moves || 'the start'}: ${gap.reply} (${(gap.share * 100).toFixed(0)}%)  [${gap.courses.join(', ')}]`,
    );
  if (gaps.length > top) console.log(`  ... and ${gaps.length - top} more`);
}

/**
 * pnpm content:build: checks content/ and writes what the app loads into apps/web/public/content/ (git-ignored):
 * catalog.json and openings/<id>.json. A failed build writes nothing, so the last good build stays in place.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent, root } from './load.ts';

const started = Date.now();
let content;
try {
  content = loadContent();
} catch (error) {
  console.error(`content: ${(error as Error).message}`);
  process.exit(1);
}
const out = join(root, 'apps/web/public/content');
const staging = join(root, '.cache/content-staging');
rmSync(staging, { recursive: true, force: true });
mkdirSync(join(staging, 'openings'), { recursive: true });
const catalog = {
  openings: content.openings.map((opening) => ({
    id: opening.id,
    name: opening.name,
    side: opening.side,
    level: opening.level,
    style: opening.style,
    summary: opening.summary,
    startEpd: opening.startEpd,
    variations: opening.variations.map((variation) => variation.id),
    lines: opening.lines.length,
    steps: opening.steps.length,
    moves: Object.values(opening.positions).reduce(
      (sum, position) => sum + position.moves.filter((move) => move.mine).length,
      0,
    ),
  })),
  ideas: content.ideas,
  tracks: content.tracks,
};
writeFileSync(join(staging, 'catalog.json'), JSON.stringify(catalog));
for (const opening of content.openings)
  writeFileSync(join(staging, 'openings', `${opening.id}.json`), JSON.stringify(opening));
rmSync(out, { recursive: true, force: true });
mkdirSync(join(root, 'apps/web/public'), { recursive: true });
renameSync(staging, out);
const lines = content.openings.reduce((sum, opening) => sum + opening.lines.length, 0);
console.log(
  `content: ${content.openings.length} opening(s), ${lines} line(s), ${content.ideas.length} ideas, in ${Date.now() - started} ms`,
);

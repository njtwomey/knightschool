/**
 * pnpm content:build
 *
 * Reads the theory tree (content/tree) and the courses (content/courses), validates everything against the schemas
 * in packages/core, projects each course's lines into its own tree and writes apps/web/public/content/*.json, plus
 * tree.json (the whole tree, to draw). A broken file fails the build with the file name in the message, and leaves the
 * files of the last good build where they were: everything is written to a staging folder first and swapped in whole.
 * The files themselves are written by `content-emit.ts`.
 *
 * Optional Lichess steps, so reruns are offline:
 *   - opening names: downloads lichess-org/chess-openings (CC0) once into .cache/.
 *   - popularity per position: read from content/popularity/popularity.json (committed; filled by `pnpm popularity`).
 *     This script never asks the network for it.
 */
import { join } from 'node:path';
import { rel, root } from './content-lib.ts';
import { cacheDir, emitContent, loadPopularity, openingNames } from './content-emit.ts';
import { replaceDir } from './replace-dir.ts';

const outDir = join(root, 'apps', 'web', 'public', 'content');

async function main() {
  const names = await openingNames();
  const popularity = loadPopularity();
  if (!popularity) console.warn('  popularity: none yet (run make popularity)');
  // Built into a staging folder and swapped in at the end: a build that fails leaves the app the content it had.
  let courses = 0;
  await replaceDir(outDir, (dir) => void (courses = emitContent(dir, names, popularity)), cacheDir);
  console.log(`content:build wrote ${courses} courses to ${rel(outDir)}`);
}

main().catch((error) => {
  console.error(`content:build failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

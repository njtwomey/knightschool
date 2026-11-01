/**
 * pnpm engine:copy (run by pnpm dev and pnpm build)
 *
 * Copies Stockfish's lite single-threaded build from node_modules into apps/web/public/engine, so the browser loads it
 * from our own origin as a Worker of its own. Stockfish is GPL-3.0: it is never imported or bundled, and the app speaks
 * to it only in UCI text (packages/engine). The folder is gitignored.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'stockfish');
const to = join(root, 'apps', 'web', 'public', 'engine');
const files = [
  { from: join('bin', 'stockfish-19-lite-single.js'), to: 'stockfish-19-lite-single.js' },
  { from: join('bin', 'stockfish-19-lite-single.wasm'), to: 'stockfish-19-lite-single.wasm' },
  // The licence travels with the engine, so the credits can link to it.
  { from: 'Copying.txt', to: 'COPYING.txt' },
];

mkdirSync(to, { recursive: true });
for (const file of files) {
  const source = join(from, file.from);
  if (!existsSync(source))
    throw new Error(`engine:copy: ${file.from} is not in node_modules/stockfish. Run pnpm install.`);
  const target = join(to, file.to);
  // Unchanged files are left alone, so the dev server does not reload for nothing.
  if (existsSync(target) && statSync(target).size === statSync(source).size) continue;
  copyFileSync(source, target);
}
console.log(`engine:copy: ${files.map((file) => file.to).join(', ')} in apps/web/public/engine`);

/**
 * pnpm engine:copy
 *
 * Copies the Stockfish lite single-threaded build from node_modules into apps/web/public/engine so the browser can
 * fetch it from our own origin as a separate Worker asset. Stockfish is GPL-3.0: it is never imported or bundled,
 * and the app talks to it only in UCI text (see packages/engine). The output folder is gitignored.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'stockfish', 'bin');
const to = join(root, 'apps', 'web', 'public', 'engine');
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];
// The GPL text that comes with the engine, served beside it so the credits page can link to it.
const licence = { from: join(root, 'node_modules', 'stockfish', 'Copying.txt'), to: 'COPYING.txt' };

mkdirSync(to, { recursive: true });
for (const file of files) {
  if (!existsSync(join(from, file)))
    throw new Error(`engine:copy: ${file} not found in node_modules/stockfish/bin. Run pnpm install.`);
  copyFileSync(join(from, file), join(to, file));
}
if (!existsSync(licence.from)) throw new Error('engine:copy: node_modules/stockfish/Copying.txt not found.');
copyFileSync(licence.from, join(to, licence.to));
console.log(`engine:copy wrote ${[...files, licence.to].join(', ')} to apps/web/public/engine`);

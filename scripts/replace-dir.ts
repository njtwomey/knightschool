import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * Fills a folder all at once: `build` writes into a fresh staging folder (made in `stagingParent`, by default beside
 * `outDir`), and only when it finishes without throwing does the staging folder take `outDir`'s place. A build that
 * fails leaves `outDir` exactly as it was, so the app keeps the content it had rather than none.
 */
export async function replaceDir(
  outDir: string,
  build: (dir: string) => void | Promise<void>,
  stagingParent = dirname(outDir),
): Promise<void> {
  mkdirSync(stagingParent, { recursive: true });
  const staging = mkdtempSync(join(stagingParent, `.${basename(outDir)}-`));
  try {
    await build(staging);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  const old = `${staging}-old`;
  const hadOld = existsSync(outDir);
  mkdirSync(dirname(outDir), { recursive: true });
  if (hadOld) move(outDir, old);
  try {
    move(staging, outDir);
  } catch (error) {
    if (hadOld) move(old, outDir); // put the previous content back
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  rmSync(old, { recursive: true, force: true });
}

/** A rename, or a copy and delete when the two places are on different file systems. */
function move(from: string, to: string) {
  try {
    renameSync(from, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

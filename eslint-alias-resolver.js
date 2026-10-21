// A resolver for eslint-plugin-boundaries (eslint-module-utils interface 2) that understands the web app's `@/` alias
// (`@/features/x` is apps/web/src/features/x), so the boundary rules see where an aliased import really goes.
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('./apps/web/src/', import.meta.url));
const ENDINGS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;

export const interfaceVersion = 2;

export function resolve(source) {
  if (!source.startsWith('@/')) return { found: false };
  const base = SRC + source.slice(2);
  const path = ENDINGS.map((ending) => base + ending).find(isFile);
  return path ? { found: true, path } : { found: false };
}

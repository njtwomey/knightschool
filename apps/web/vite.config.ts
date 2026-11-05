import { copyFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { parse } from 'yaml';

/** Content files are YAML; importing one gives its parsed value (the site config, for now). */
const yaml = (): Plugin => ({
  name: 'knightschool-yaml',
  transform(code, id) {
    if (!id.endsWith('.yaml')) return null;
    return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
  },
});

/**
 * Paths like /openings/italian-white have no file behind them. GitHub Pages serves 404.html for those, so it gets the
 * app; Netlify and Cloudflare use public/_redirects, and the dev and preview servers already fall back to index.html.
 */
const spaFallback = (): Plugin => ({
  name: 'knightschool-spa-fallback',
  apply: 'build',
  closeBundle() {
    const dist = fileURLToPath(new URL('./dist', import.meta.url));
    copyFileSync(`${dist}/index.html`, `${dist}/404.html`);
  },
});

// A project site on GitHub Pages is served under /<repo>/; the deploy workflow sets BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [yaml(), react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('../../content', import.meta.url)),
    },
  },
  // sqlite-wasm finds its .wasm next to its own module, so it must not be pre-bundled; the database worker
  // (data/storage/worker.ts) is an ES module.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
});

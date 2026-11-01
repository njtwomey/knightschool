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

// A project site on GitHub Pages is served under /<repo>/; the deploy workflow sets BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [yaml(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('../../content', import.meta.url)),
    },
  },
});

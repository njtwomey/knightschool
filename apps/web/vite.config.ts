import { copyFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // A project site on GitHub Pages lives under /<repo>/, so the deploy workflow sets BASE_PATH. Locally it is the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Paths like /opening/caro-kann have no file behind them. GitHub Pages serves 404.html for those, so give it the
    // app; Netlify and Cloudflare use public/_redirects, and the dev and preview servers already fall back to index.html.
    {
      name: 'spa-fallback',
      apply: 'build',
      closeBundle() {
        const dist = fileURLToPath(new URL('./dist', import.meta.url));
        copyFileSync(`${dist}/index.html`, `${dist}/404.html`);
      },
    },
    // After one online visit the site, the courses and the engine are cached, so it all works offline.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Knight School',
        short_name: 'Knight School',
        description: 'Learn chess openings and keep them with spaced repetition.',
        theme_color: '#2f5d50',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // The page, scripts, styles, the courses (json) and the engine (js + wasm) are all precached.
        globPatterns: ['**/*.{js,css,html,svg,png,json,wasm,txt}'],
        // Stockfish's wasm is about 1.8 MB, SQLite's a little more.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // The libraries every page uses, each in a chunk of its own: they change less often than the app, so a new
        // version of the app leaves them cached.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/](@radix-ui|@floating-ui|react-remove-scroll[^\\/]*|aria-hidden)[\\/]/.test(id))
            return 'radix';
          if (/[\\/]node_modules[\\/](react-chessboard|chess\.js)[\\/]/.test(id)) return 'board';
          return undefined;
        },
      },
    },
  },
  // sqlite-wasm loads its .wasm and worker relative to its own files, so it must not be pre-bundled.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
});

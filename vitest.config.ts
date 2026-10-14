import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// One test run for the whole workspace. Core, engine, storage, store and script tests run in Node;
// add a jsdom project for apps/web when it gets component tests.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});

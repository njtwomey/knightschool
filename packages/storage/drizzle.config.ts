import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` writes numbered SQL files to ./drizzle, then bundles them into src/migrations.generated.ts.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
});

import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const REACT = ['react', 'react-dom', 'react-dom/*', 'react/*', 'react-chessboard', 'zustand'];

const RAW_ELEMENTS = {
  button: 'Button',
  input: 'Input',
  textarea: 'Textarea',
  select: 'Select',
  label: 'Label',
  table: 'Table',
  dialog: 'Dialog',
  hr: 'Separator',
};

// The web app's own folders, lowest first: lib (plain helpers), router (addresses), data (loading and stores),
// components (shared UI), then features (pages), App and main. Nothing below features imports a feature.
const WEB = ['web', 'web-lib', 'web-router', 'web-data', 'web-components', 'web-features'];

// The import table from docs/PLAN.md "Architecture". Arrows point from importer to imported:
// web -> engine, storage -> core. Core imports no other package and no React.
// Workspace packages are matched both as module names (@knightschool/x) and as file
// elements (packages/x/...), so a relative path across packages is caught too.
const boundaryPolicies = [
  {
    from: { element: { types: ['core', 'core-schema'] } },
    disallow: {
      to: [
        { element: { types: ['engine', 'storage', ...WEB] } },
        { module: { source: ['@knightschool/engine', '@knightschool/storage', '@knightschool/web'] } },
        { module: { source: REACT } },
      ],
    },
    message: 'packages/core is pure TypeScript: no React, engine, storage or UI imports.',
  },
  {
    from: { element: { types: ['engine', 'storage'] } },
    disallow: {
      to: [{ element: { types: WEB } }, { module: { source: ['@knightschool/web'] } }, { module: { source: REACT } }],
    },
    message: 'engine and storage must not import React or the UI.',
  },
  {
    from: { element: { type: 'engine' } },
    disallow: {
      to: [{ element: { type: 'storage' } }, { module: { source: ['@knightschool/storage'] } }],
    },
    message: 'engine must not import storage; the UI is where they meet.',
  },
  {
    from: { element: { type: 'storage' } },
    disallow: {
      to: [{ element: { type: 'engine' } }, { module: { source: ['@knightschool/engine'] } }],
    },
    message: 'storage must not import engine; the UI is where they meet.',
  },
  {
    from: { element: { types: ['engine', 'storage'] } },
    disallow: {
      // Matched by resolved file, not package name, so `@knightschool/core/schema` stays allowed.
      to: [{ element: { type: 'core' } }],
    },
    dependency: { kind: 'value' },
    message: 'engine and storage import core types only: use `import type`.',
  },
  {
    from: { element: { types: ['web-lib', 'web-router', 'web-data', 'web-components'] } },
    disallow: { to: [{ element: { type: 'web-features' } }] },
    message: 'only pages import features: move what is shared to components, data, router or lib.',
  },
  {
    from: { element: { types: ['web-lib', 'web-router', 'web-data'] } },
    disallow: { to: [{ element: { type: 'web-components' } }] },
    message: 'lib, router and data hold no UI: components import them, not the other way round.',
  },
  {
    from: { element: { type: 'web-lib' } },
    disallow: { to: [{ element: { types: ['web-router', 'web-data'] } }] },
    message: 'lib is plain helpers: it imports nothing else from the app.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      'apps/web/public/**',
      '**/node_modules/**',
      '.claude/worktrees/**',
      '.content/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // The alias resolver first, so `@/...` imports in the web app are checked like relative ones.
      'import/resolver': {
        [fileURLToPath(new URL('./eslint-alias-resolver.js', import.meta.url))]: {},
        node: { extensions: ['.ts', '.tsx', '.js'] },
      },
      'boundaries/elements': [
        // Zod schemas are data definitions: engine and storage may import them as values (to validate rows).
        { type: 'core-schema', pattern: 'packages/core/src/schema/**' },
        { type: 'core', pattern: 'packages/core/**' },
        { type: 'engine', pattern: 'packages/engine/**' },
        { type: 'storage', pattern: 'packages/storage/**' },
        { type: 'web-lib', pattern: 'apps/web/src/lib/**' },
        { type: 'web-router', pattern: 'apps/web/src/router/**' },
        { type: 'web-data', pattern: 'apps/web/src/data/**' },
        { type: 'web-components', pattern: 'apps/web/src/components/**' },
        { type: 'web-features', pattern: 'apps/web/src/features/**' },
        { type: 'web', pattern: 'apps/web/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'allow', checkAllOrigins: true, policies: boundaryPolicies }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // engine and storage use core's types, not its chess logic. `@knightschool/core/schema` (Zod schemas) is allowed.
    files: ['packages/engine/src/**/*.ts', 'packages/storage/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@knightschool/core',
              allowTypeImports: true,
              message: 'engine and storage import core types only: use `import type`.',
            },
          ],
        },
      ],
    },
  },
  {
    // Design rule: UI is built from shadcn components. Add the missing one with `shadcn add` instead of a raw element.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['apps/web/src/components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...Object.entries(RAW_ELEMENTS).map(([element, use]) => ({
          selector: `JSXOpeningElement[name.name='${element}']`,
          message: `Use shadcn ${use} instead of a raw <${element}>. Run \`shadcn add\` if it is not installed yet.`,
        })),
      ],
    },
  },
  {
    files: ['apps/web/src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.{js,ts}', 'apps/web/vite.config.ts', 'scripts/**/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Raw form elements are only allowed inside components/ui (shadcn): everything else uses those components.
const RAW_ELEMENTS = ['button', 'input', 'select', 'textarea', 'table', 'dialog'];

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', 'apps/web/src/components/ui', '.cache', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        ...RAW_ELEMENTS.map((name) => ({
          selector: `JSXOpeningElement[name.name='${name}']`,
          message: `Use the shadcn component from @/components/ui instead of a raw <${name}>.`,
        })),
      ],
    },
  },
  {
    // One board, one control row: outside components/board, every board is Board (or BoardThumb for a still picture),
    // so its controls are always BoardControls. A bare surface or hand-made step buttons fail here.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['apps/web/src/components/board/**', 'apps/web/src/mocks/registry/board.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/board/board-surface',
              message: 'Use Board (it brings the shared control row) or BoardThumb for a still picture.',
              allowTypeImports: true,
            },
            {
              name: '@/components/board/step-buttons',
              message: 'Use Board; its control row has the step buttons.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    // Chevrons mean "step through the moves" on a board; only these files use them for something else.
    files: ['apps/web/src/**/*.tsx'],
    ignores: [
      'apps/web/src/components/board/**',
      'apps/web/src/components/ui/**',
      'apps/web/src/mocks/mocks-page.tsx',
      'apps/web/src/components/shared/breadcrumbs.tsx',
      'apps/web/src/components/map/map-index.tsx',
      'apps/web/src/components/openings/line-story.tsx',
      'apps/web/src/components/create/step-editor.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              importNames: ['ChevronFirst', 'ChevronLast', 'ChevronLeft', 'ChevronRight'],
              message: "Stepping through moves is Board's control row; do not draw step buttons by hand.",
            },
          ],
        },
      ],
    },
  },
  {
    // Colours live in index.css as tokens, once, for light and dark. Code refers to them (Tailwind token classes, or
    // var(--token)); a colour literal or a raw palette class fails here.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/components/ui/**', 'apps/web/src/components/progress/css-colour.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // A later block replaces an earlier one's rule, so the raw-element rule is repeated here.
        ...RAW_ELEMENTS.map((name) => ({
          selector: `JSXOpeningElement[name.name='${name}']`,
          message: `Use the shadcn component from @/components/ui instead of a raw <${name}>.`,
        })),
        {
          selector: 'Literal[value=/(#[0-9a-fA-F]{3,8}\\b|rgba?\\(|oklch\\(|hsla?\\()/]',
          message: 'Define the colour as a token in index.css and refer to it.',
        },
        {
          selector: 'TemplateElement[value.raw=/(#[0-9a-fA-F]{6}\\b|rgba?\\(|oklch\\(|hsla?\\()/]',
          message: 'Define the colour as a token in index.css and refer to it.',
        },
        {
          selector:
            'Literal[value=/\\b(bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\\b/]',
          message:
            'Use a colour token class (bg-background, text-muted-foreground, bg-verdict-mistake...), not a palette colour.',
        },
      ],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts', 'packages/core/src/testing/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'node:*'], message: 'core is pure: no React, DOM or node imports.' },
          ],
        },
      ],
    },
  },
  {
    // The engine speaks UCI over a transport it is given: no React, DOM or node, and only core's types.
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@knightschool/core',
              message: 'The engine may import core types only (import type).',
              allowTypeImports: true,
            },
          ],
          patterns: [
            { group: ['react', 'react-dom', 'node:*'], message: 'The engine is pure: no React, DOM or node.' },
          ],
        },
      ],
    },
  },
  {
    // The learner database works over an SqlExecutor it is given (the browser's worker lives in the web app): no React,
    // DOM or node, nothing from the engine or the app, and only core's types.
    files: ['packages/storage/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@knightschool/core',
              message: 'Storage may import core types only (import type).',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['react', 'react-dom', 'node:*', '@knightschool/engine', '@knightschool/web', '@/*'],
              message: 'Storage is pure: no React, DOM, node, engine or app imports.',
            },
          ],
        },
      ],
    },
  },
);

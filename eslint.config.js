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
);

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', '_legacy/', 'node_modules/', '.wrangler/', 'worker/.wrangler/', 'screenshots/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['*.js', 'scripts/**/*.mjs'],
    // scripts/ also contains Playwright page.evaluate() callbacks that run in the browser
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },
];

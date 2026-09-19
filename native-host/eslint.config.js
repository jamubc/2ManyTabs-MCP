import js      from '@eslint/js';
import globals from 'globals';

export default [
  // Ignore generated/installed code.
  { ignores: ['node_modules/'] },

  // All JS files in native-host/.
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // Catch real drift issues without style nitpicks.
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-undef':        'error',
    },
  },

  // Cross-package tests that stub the WebExtension `browser` global
  // (see extension/lib/tab-ops.js) before importing across into extension/.
  {
    files: ['lib/*.test.js'],
    languageOptions: {
      globals: {
        browser: 'readonly',
      },
    },
  },
];

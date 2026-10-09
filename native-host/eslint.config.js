import js      from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },

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

      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-undef':        'error',
    },
  },

  {
    files: ['lib/*.test.js'],
    languageOptions: {
      globals: {
        browser: 'readonly',
      },
    },
  },
];

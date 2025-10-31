import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
    }
  },
  {
    files: ['**/*.ts'],
    rules: {
      // Disable rules that don't work well with TypeScript
      'no-undef': 'off',
      'no-unused-vars': 'off', // TypeScript handles this
    }
  },
  {
    ignores: [
      'dist/**',
      '**/*.test.ts',
      'tests-e2e/**',
      'coverage/**',
      'node_modules/**'
    ]
  }
];
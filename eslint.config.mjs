import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Architecture rules live here so they are enforced, not just documented (see docs/ARCHITECTURE.md §1, §3).
const noFeatureImports = {
  group: ['@/features/*', '@/features/**'],
  message: 'core/ui/lib must not depend on features.',
};
const noDeepFeatureImports = {
  group: ['@/features/*/*', '@/features/*/**'],
  message: "Import another feature only through its index: '@/features/<name>'.",
};

const config = [
  ...nextVitals,
  ...nextTs,
  // Legacy references are read-only source material copied from the old project, not app code.
  {
    ignores: ['.next/**', 'node_modules/**', 'assets-source/**', 'public/sw.js', 'docs/legacy/**', 'supabase/seed/source/legacy/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/types/database.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    files: ['src/core/**', 'src/ui/**', 'src/lib/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noFeatureImports] }] },
  },
  {
    files: ['src/app/**', 'src/features/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noDeepFeatureImports] }] },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'max-lines': 'off' },
  },
];

export default config;

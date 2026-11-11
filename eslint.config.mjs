import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Architecture rules live here so they are enforced, not just documented (see docs/ARCHITECTURE.md §1, §3).
const noFeatureImports = {
  group: ['@/features/*', '@/features/**', '**/features/**'],
  message: 'core/ui/lib must not depend on features.',
};
const noDeepFeatureImports = {
  regex: '^@/features/[^/]+/(?!server$).+',
  message: "Import another feature only through '@/features/<name>' or '@/features/<name>/server'.",
};

const config = [
  ...nextVitals,
  ...nextTs,
  // Legacy references are read-only source material copied from the old project, not app code.
  {
    ignores: ['src/types/database.ts', '.next/**', 'node_modules/**', 'assets-source/**', 'public/sw.js', 'docs/legacy/**', 'supabase/seed/source/legacy/**', 'playwright-report/**', 'test-results/**'],
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
    files: ['src/core/**', 'src/ui/**', 'src/lib/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noFeatureImports] }] },
  },
  {
    files: ['src/app/**', 'src/features/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{
      group: ['**/features/*/**', '!@/features/**'], message: noDeepFeatureImports.message,
    }, noDeepFeatureImports] }] },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { 'max-lines': 'off' },
  },
];

export default config;

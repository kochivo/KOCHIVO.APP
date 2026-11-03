import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/tests/**/*.test.ts', 'scripts/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto'],
    // Each RLS suite boots its own PGlite and replays every migration; in parallel that passes the 10s default.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});

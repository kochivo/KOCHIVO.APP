import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the shared player header off client feature barrels', () => {
  const header = readFileSync(new URL('./file-header.tsx', import.meta.url), 'utf8');
  expect(header).not.toMatch(/from ['"]@\/features\/(?:ranks|roster)['"]/);
  expect(header).toContain("from '@/features/ranks/server'");
  expect(header).toContain("from '@/features/roster/server'");
});

it('splits the program summary inside a client boundary', () => {
  const entry = readFileSync(new URL('../training/player-program-summary-entry.tsx', import.meta.url), 'utf8');
  expect(entry).toMatch(/^'use client'/);
  expect(entry).toContain("dynamic(() => import('./player-program-summary')");
  expect(entry).not.toMatch(/import\s+\{\s*PlayerProgramSummary\s*\}/);
});

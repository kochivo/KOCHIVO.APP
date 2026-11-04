import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps home and readiness modules behind lazy route boundaries', () => {
  const shell = readFileSync('src/features/player-shell/components/player-shell.tsx', 'utf8');
  const home = readFileSync('src/features/player-home/components/home-screen.tsx', 'utf8');
  const focus = readFileSync('src/features/workout/components/focus-screen.tsx', 'utf8');
  const mood = readFileSync('src/features/player-home/hooks/use-rest-mood.ts', 'utf8');
  const profile = readFileSync('src/features/player-profile/components/readiness-loader.tsx', 'utf8');
  const forbidden = /import\s+(?!type\b)[^;]*\sfrom\s+['"]@\/features\/(?:player-home|readiness)['"]/;
  expect(shell).not.toMatch(forbidden);
  expect(home).not.toMatch(/import\s+(?!type\b)[^;]*\sfrom\s+['"]@\/features\/readiness['"]/);
  expect(focus).not.toMatch(/import\s+(?!type\b)[^;]*\sfrom\s+['"]@\/features\/readiness['"]/);
  expect(mood).not.toMatch(/from\s+['"]@\/features\/readiness['"]/);
  expect(profile).toContain("import('@/features/readiness').then(module => module.ReadinessLoader)");
  expect(shell).toContain("import('@/features/player-home').then(module => module.RestMoodSync)");
  expect(home).toContain("import('@/features/readiness').then(module => module.PlayerReadiness)");
});

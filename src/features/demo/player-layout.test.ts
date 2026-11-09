import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('wraps player content and its tour in DemoMode from the public feature API', () => {
  const layout = readFileSync('src/app/[locale]/(player)/player/layout.tsx', 'utf8');
  expect(layout).toContain("import { DemoMode } from '@/features/demo'");
  expect(layout).toMatch(/<PlayerShell\b[\s\S]*?<DemoMode failOpen>\s*\{children\}<ProductTour role="player"\s*\/>\s*<\/DemoMode>\s*<\/PlayerShell>/);
});

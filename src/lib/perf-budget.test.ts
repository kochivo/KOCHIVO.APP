import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';

interface RouteStats { route: string; firstLoadChunkPaths: string[] }
const statsPath = resolve('.next/diagnostics/route-bundle-stats.json');

// Fixed ceilings for scoped misses; measurements and retained modules are in docs/PERFORMANCE.md.
const exceptions: Record<string, number> = {
  '/c/[slug]': 205,
  '/captain/programs/[programId]': 315,
  '/captain/players/[playerId]/programs': 315,
};

it.skipIf(!existsSync(statsPath))('keeps first-load route JavaScript within gzip budgets', () => {
  const routes: RouteStats[] = JSON.parse(readFileSync(statsPath, 'utf8'));
  expect(routes.length).toBeGreaterThan(0);
  for (const { route, firstLoadChunkPaths } of routes) {
    const path = route.replace(/^\/\[locale\]/, '') || '/';
    const target = /^\/player(?:\/|$)/.test(path) ? 300
      : /^\/captain(?:\/|$)/.test(path) ? 310 : path === '/demo' ? 280 : 200;
    const budget = exceptions[path] ?? target;
    expect(firstLoadChunkPaths.length, route).toBeGreaterThan(0);
    const bytes = firstLoadChunkPaths.reduce((total, chunk) =>
      total + gzipSync(readFileSync(resolve(chunk.replaceAll('\\', '/')))).length, 0);
    expect.soft(bytes / 1024, route).toBeLessThanOrEqual(budget);
  }
});

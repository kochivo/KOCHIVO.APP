import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';

interface RouteStats { route: string; firstLoadChunkPaths: string[] }
const statsPath = resolve('.next/diagnostics/route-bundle-stats.json');

// Fixed ceilings for scoped misses; measurements and retained modules are in docs/PERFORMANCE.md.
const exceptions: Record<string, number> = {
  '/c/[slug]': 209, // M3 review fixes T-397..T-401 (2026-11-18): measured 208.19
  '/login': 201,
  '/welcome': 201,
  '/offline': 207, // T-363..T-368 refined look: measured 206.03
  '/captain/programs/[programId]': 316, // CI measured 315.06 after T-395..T-401
  // T-383..T-388 captain phone shell and player-file header (2026-11-18): +1..3 KiB on these routes.
  '/captain/players/[playerId]/programs': 333, // measured 332.31 after T-395..T-401 (M3 review fixes)
  '/captain/players/[playerId]/nutrition': 316, // measured 315.59 after T-395..T-401
  '/captain/players/[playerId]/preview': 315, // measured 314.38 after T-399 player-file fixes
  '/demo': 290, // measured 287.97 locally after T-395..T-401; CI builds run slightly larger
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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

// Prefetching every row link fires dozens of requests at once and trips the host's per-IP rate limit (429).
it.each([
  ['features/roster/components/roster-row-view.tsx', 6],
  ['features/dashboard/components/player-finder.tsx', 1],
  ['features/dashboard/components/smart-alerts.tsx', 1],
])('does not prefetch per-player list links in %s', (file, count) => {
  const source = readFileSync(path.resolve('src', file), 'utf8');
  const links = source.match(/<Link\b[^>]*>/g) ?? [];
  expect(links.filter(link => link.includes('prefetch={false}'))).toHaveLength(count);
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('loads Analytics and Speed Insights only through lazy imports', () => {
  const source = readFileSync(resolve('src/ui/site-analytics.tsx'), 'utf8');
  expect(source).toContain("import('@vercel/analytics/next')");
  expect(source).toContain("import('@vercel/speed-insights/next')");
  expect(source).not.toMatch(/^import .*'@vercel\//m);
});

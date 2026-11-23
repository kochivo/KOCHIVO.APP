import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = readFileSync(new URL('./file-content.tsx', import.meta.url), 'utf8');

it('starts the activity load with the summary instead of after it (T-435b)', () => {
  const start = source.indexOf('[summary, counts, activity] = await Promise.all(');
  expect(start).toBeGreaterThan(-1);
  const block = source.slice(start, source.indexOf(']);', start));
  expect(block).toContain('loadSummary(playerId, today)');
  expect(block).toContain('loadActivity(playerId, today)');
  expect(source).not.toContain('activity = await loadActivity');
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('puts the rest timer in the free space above the set button so it is never cut off', () => {
  const source = readFileSync(resolve('src/features/workout/components/workout-set.tsx'), 'utf8');
  const rest = source.indexOf('<RestPanel');
  const button = source.indexOf("v3CompleteWorkout' : 'v3CompleteSet'");
  expect(rest).toBeGreaterThan(0);
  expect(rest).toBeLessThan(button);
  expect(source.match(/<RestPanel/g)).toHaveLength(1);
});

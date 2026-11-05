import { expect, it } from 'vitest';
import { countFinished } from './hooks/use-install-prompt';

it('counts no workouts when no local user is bound, as for captains', async () => {
  await expect(countFinished()).resolves.toBe(0);
});

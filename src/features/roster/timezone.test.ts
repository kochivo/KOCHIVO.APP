import { expect, it } from 'vitest';
import { playerStatus } from './status';

it('uses the captain day for expiry and the player day for missed training', () => {
  const player = { accessUntil: '2026-02-01', startedOn: '2026-01-01', lastTrainingDate: '2026-01-01',
    today: '2026-01-04', playerToday: '2026-01-05' };
  expect(playerStatus(player)).toBe('late');
  expect(playerStatus({ ...player, playerToday: '2026-01-04' })).toBe('active');
  expect(playerStatus({ ...player, accessUntil: '2026-01-03', playerToday: '2026-01-02' })).toBe('grace');
});

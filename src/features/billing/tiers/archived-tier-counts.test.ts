import { expect, it } from 'vitest';
import { archivedTierCounts } from './archived-tier-counts';

it('counts unique current and past subscribers and excludes future subscriptions', () => {
  const first = { player_id: 'renewed', period_start: '2026-09-01', period_end: '2026-09-30' };
  const renewal = { ...first, period_start: '2026-10-01', period_end: '2026-10-31' };
  const past = { ...first, player_id: 'expired' };
  const future = { player_id: 'future', period_start: '2026-11-01', period_end: '2026-11-30' };
  expect(archivedTierCounts([first, renewal, renewal, past, past, future], '2026-10-31')).toEqual({ current: 1, past: 1 });
});

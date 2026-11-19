import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { isBigAction, limits } from './data/limits';

it('configures every tier and mirrors the SQL credit caps', () => {
  expect(Object.values(limits)).toEqual([
    { playerMessages: 5, photos: 1, captainMessages: 20, credits: 10, calls: 1500 },
    { playerMessages: 10, photos: 2, captainMessages: 40, credits: 100, calls: 6000 },
    { playerMessages: 10, photos: 2, captainMessages: 40, credits: 250, calls: 10000 },
    { playerMessages: 10, photos: 2, captainMessages: 40, credits: 750, calls: 25000 },
  ]);
  const sql = readFileSync('supabase/migrations/0158_ko_usage.sql', 'utf8');
  for (const [tier, limit] of Object.entries(limits)) {
    expect(sql).toContain(`when '${tier}' then ${limit.credits}`);
  }
});

it('identifies big actions at planning and confirmation', () => {
  for (const kind of ['create_training', 'create_nutrition', 'training', 'nutrition']) expect(isBigAction(kind)).toBe(true);
  for (const kind of ['exercise', 'renew', 'reminder', 'meal_log']) expect(isBigAction(kind)).toBe(false);
});

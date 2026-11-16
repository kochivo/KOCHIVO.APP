import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { ProgramSnapshot } from '@/core/offline';
import { shoppingWeekRestDays } from './components/day-type';

it('uses the four assigned program days rather than the three intake days', () => {
  const snapshot = { training_days: [0, 2, 4], settings: { schedule_mode: 'weekly' },
    days: Array.from({ length: 7 }, (_, weekday) => ({ id: String(weekday), position: weekday,
      weekday, is_rest_day: ![0, 1, 3, 5].includes(weekday), exercises: [] })),
  } as unknown as ProgramSnapshot;
  const rest = shoppingWeekRestDays(snapshot, [], '2026-11-14');
  expect(rest.filter(day => !day)).toHaveLength(4);
  expect(rest.reduce((sum, day) => sum + (day ? 100 : 200), 0)).toBe(1100);
});

import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { ProgramSnapshot } from '@/core/offline';
import { localDate, weeklyWeekday } from '@/lib/dates';
import { nextTrainingDay, pickTodayDay, weeklyFinished } from './next-day';
import { mapProgramSnapshot } from './data/program-snapshot';

const weekly: ProgramSnapshot = {
  id: 'active', player_id: 'player', program_id: 'program', title: 'Week', notes: null,
  settings: { repeatWeekly: true }, training_days: [1], starts_on: '2026-10-31',
  days: [
    { id: 'sat', position: 1, title: 'Strength', weekday: 0, is_rest_day: false, exercises: [], cardio: [] },
    { id: 'sun', position: 2, title: '', weekday: 1, is_rest_day: true, exercises: [], cardio: [] },
    { id: 'mon', position: 3, title: 'Cardio', weekday: 2, is_rest_day: false, exercises: [],
      cardio: [{ id: 'c', day_id: 'mon', position: 1, kind: 'Walk', minutes: 20, intensity: 'low', notes: '' }] },
  ],
};
it('maps Cairo calendar dates to Saturday zero, including midnight and summer time', () => {
  for (const now of ['2026-11-06T22:30:00Z', '2026-07-03T21:30:00Z']) {
    expect(weeklyWeekday(localDate(new Date(now)))).toBe(0);
  }
  expect(Array.from({ length: 7 }, (_, i) => weeklyWeekday(`2026-11-0${i + 1}`))).toEqual([1, 2, 3, 4, 5, 6, 0]);
});
it('selects weekly days independently of intake and completed sessions', () => {
  expect(pickTodayDay(weekly, [], '2026-11-02')?.id).toBe('mon');
  expect(pickTodayDay(weekly, [], '2026-11-01')?.is_rest_day).toBe(true);
  expect(pickTodayDay(weekly, [], '2026-11-03')).toBeUndefined();
  expect(nextTrainingDay(weekly, '2026-11-01')?.id).toBe('mon');
  expect(nextTrainingDay(weekly, '2026-11-03')?.id).toBe('sat');
});
it('finishes seven calendar days after activation and renews from the new start', () => {
  const finite = { ...weekly, settings: { repeatWeekly: false } };
  expect(weeklyFinished(finite, '2026-11-06')).toBe(false);
  expect(weeklyFinished(finite, '2026-11-07')).toBe(true);
  expect(pickTodayDay(finite, [], '2026-11-07')).toBeUndefined();
  expect(nextTrainingDay(finite, '2026-11-06')).toBeUndefined();
  expect(weeklyFinished({ ...finite, starts_on: '2026-11-07' }, '2026-11-07')).toBe(false);
});
it('retains weekly metadata and ordered cardio in the offline snapshot', () => {
  const snapshot = mapProgramSnapshot({ id: 'p', title: 'Week', notes: null,
    settings: { repeatWeekly: false, weeklyStartedOn: '2026-10-31' },
    program_days: [{ id: 'd', title: '', position: 1, weekday: 0, is_rest_day: false,
      program_exercises: [], program_cardio: [weekly.days[2]?.cardio?.[0]].filter(x => x !== undefined) }] }, [], 'player');
  expect(snapshot).toMatchObject({ starts_on: '2026-10-31', settings: { repeatWeekly: false },
    days: [{ weekday: 0, is_rest_day: false, cardio: [{ kind: 'Walk', minutes: 20 }] }] });
});

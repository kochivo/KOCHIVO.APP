import { expect, it } from 'vitest';
import { ramadanSchedule } from './ramadan-schedule';
import { defaultCityForTimezone } from './prayer-times';
it('schedules the snack after the full workout and suhoor before fajr', () => {
  const schedule = ramadanSchedule(new Date('2027-02-08T14:00:00Z'), defaultCityForTimezone('Africa/Cairo'), 'after_iftar_2h', 45);
  expect(schedule.workout.getTime() - schedule.maghrib.getTime()).toBe(7200000);
  expect(schedule.items.find(item => item.key === 'post_workout')?.at.getTime()).toBe(schedule.workout.getTime() + 3600000);
  expect(schedule.items.find(item => item.key === 'nextSuhoor')?.at.getTime()).toBe(schedule.fajr.getTime() - 3600000);
});

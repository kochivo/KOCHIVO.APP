import { expect, it } from 'vitest';
import { nextAssessmentDate, assessmentDates } from './assessment-recurrence';

const base = { kind: 'days' as const, every_days: 3, weekday: null, day: null, hour: 20, minute: 0,
  starts_on: '2026-11-14', ends_on: '2026-12-14', max_times: null, paused_at: null };
it('includes both end dates in the eleven-send mockup recurrence', () => {
  expect(assessmentDates(base)).toHaveLength(11);
  expect(nextAssessmentDate(base, new Date('2026-11-14T17:59:00Z'), 'Africa/Cairo')).toBe('2026-11-14');
  expect(nextAssessmentDate(base, new Date('2026-11-14T18:01:00Z'), 'Africa/Cairo')).toBe('2026-11-17');
});
it('respects once, weekly, monthly clamping, on-join and count limits', () => {
  expect(assessmentDates({ ...base, kind: 'once' })).toEqual(['2026-11-14']);
  expect(assessmentDates({ ...base, kind: 'week', weekday: 5, max_times: 2 })).toEqual(['2026-11-20', '2026-11-27']);
  expect(assessmentDates({ ...base, kind: 'month', day: 31, ends_on: '2027-02-28' })).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
  expect(assessmentDates({ ...base, kind: 'on_join' }, '2026-11-18')).toEqual(['2026-11-18']);
  expect(assessmentDates({ ...base, kind: 'on_join' }, '2026-11-01')).toEqual([]);
  expect(nextAssessmentDate({ ...base, paused_at: '2026-11-12T00:00:00Z' }, new Date('2026-11-12Z'), 'Africa/Cairo')).toBeNull();
  expect(assessmentDates({ ...base, max_times: 2 })).toEqual(['2026-11-14', '2026-11-17']);
});
it('uses local wall time across London DST and Riyadh offsets', () => {
  const schedule = { ...base, kind: 'week' as const, weekday: 0, hour: 10, starts_on: '2026-10-18', ends_on: null };
  expect(nextAssessmentDate(schedule, new Date('2026-10-18T09:01Z'), 'Europe/London')).toBe('2026-10-25');
  expect(nextAssessmentDate(schedule, new Date('2026-10-25T09:01Z'), 'Europe/London')).toBe('2026-10-25');
  expect(nextAssessmentDate(schedule, new Date('2026-10-25T07:01Z'), 'Asia/Riyadh')).toBe('2026-11-01');
});
it('keeps unsent single deliveries due today after their minute, and ends after sending', () => {
  const s = { ...base, kind: 'once' as const };
  expect(nextAssessmentDate(s, new Date('2026-11-14T21:00Z'), 'Africa/Cairo')).toBe('2026-11-14');
  expect(nextAssessmentDate(s, new Date('2026-11-14T21:00Z'), 'Africa/Cairo', undefined, 1)).toBeNull();
});
it('honours a finite count even when monthly sends extend beyond ten years', () => {
  const dates = assessmentDates({ ...base, kind: 'month', day: 31, ends_on: null, max_times: 125 });
  expect(dates).toHaveLength(125);
  expect(dates.at(-1)).toBe('2037-03-31');
});

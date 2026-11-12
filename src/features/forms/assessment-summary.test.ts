import { expect, it } from 'vitest';
import { assessmentSummary } from './assessment-summary';
const s = { kind: 'days' as const, every_days: 3, weekday: null, day: null, hour: 20, minute: 0,
  starts_on: '2026-11-14', ends_on: '2026-12-14', max_times: null, paused_at: null };
it('describes the mockup inclusive eleven sends in player local time', () => {
  expect(assessmentSummary(s, 'Ali', 'مراجعة الركبة', 'ar')).toBe('Ali هيستلم «مراجعة الركبة» كل 3 أيام الساعة 8 بالليل بتوقيته، من 14 نوفمبر لحد 14 ديسمبر (11 مرة).');
});
it('states finite count and open-ended schedules without inventing an end date', () => {
  expect(assessmentSummary({ ...s, ends_on: null, max_times: 2 }, 'Ali', 'Knee', 'en')).toContain('(2 sends)');
  expect(assessmentSummary({ ...s, ends_on: null }, 'Ali', 'Knee', 'en')).toContain('until you stop it');
});
it('states on-join eligibility and one delivery per new player', () => {
  expect(assessmentSummary({ ...s, kind: 'on_join', ends_on: null }, null, 'Start', 'en')).toContain('(1 sends)');
  expect(assessmentSummary({ ...s, kind: 'on_join' }, 'Ali', 'Start', 'en', '2026-11-01')).toContain('joined before the start date');
});

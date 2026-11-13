import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { HistoryWorkoutRow, sessionPrIds } from './components/history-workout';
import { HistoryCalendar, plannedDate } from './components/history-calendar';
import type { HistoryWorkout } from './data/history-grouping';
import type { ProgramSnapshot } from '@/core/offline';
import type { HistorySet } from './data/history-grouping';

const workout: HistoryWorkout = { id: 'session', program_day_id: 'day', training_date: '2026-11-13', started_at: '2026-11-13T10:00:00Z', completed_at: '2026-11-13T10:52:00Z', client_updated_at: '2026-11-13T10:52:00Z', setCount: 18, exercises: [] };
it('detects weight and rep records from earlier sets without treating first observations as PRs', () => {
  const session = (id: string, weight: number, reps: number, at: string): HistoryWorkout => ({ ...workout, id, exercises: [{ id: 'bench', sets: [{ id: `set-${id}`, session_id: id, weight_kg: weight, reps, completed_at: at, exercise_id: 'bench' } as HistorySet] }] });
  const rows = [session('later', 75, 9, '2026-11-13T12:00:00Z'), session('first', 70, 8, '2026-11-01T12:00:00Z'), session('weight', 75, 8, '2026-11-03T12:00:00Z'), session('equal', 75, 8, '2026-11-03T12:00:00Z'), session('lower', 70, 7, '2026-11-07T12:00:00Z')];
  expect([...sessionPrIds(rows)].sort()).toEqual(['equal', 'later', 'weight']);
  expect(sessionPrIds([]).size).toBe(0);
});
it('shows a PR only when the real session has one and retains expandable details', () => {
  const props = { workout, title: 'صدر وترايسبس', names: [], v3: true };
  const html = renderToStaticMarkup(createElement(HistoryWorkoutRow, { ...props, hasPr: true }));
  expect(html).toContain('رقم قياسي');
  expect(html).toContain('52 د · 18 مجموعة');
  expect(html).toContain('<details');
  expect(html).toContain('صدر وترايسبس');
  expect(renderToStaticMarkup(createElement(HistoryWorkoutRow, props))).not.toContain('رقم قياسي');
});
it('renders today-trained with the ink ring and three real-state legend labels', () => {
  const html = renderToStaticMarkup(createElement(HistoryCalendar, { today: '2026-11-13', trained: ['2026-11-13'] }));
  expect(html).toMatch(/aria-current="date"[^>]*bg-lime[^>]*ring-ink/);
  for (const label of ['اتمرنت', 'فاتك', 'النهارده']) expect(html).toContain(label);
  expect(html).not.toContain('>14</span>');
});
it('never marks a missed day before the current program or after a one-week program ends', () => {
  const snapshot = { starts_on: '2026-11-07', settings: { repeatWeekly: false }, days: [{ weekday: 0, is_rest_day: false }], training_days: [] } as unknown as ProgramSnapshot;
  expect(plannedDate('2026-11-07', snapshot)).toBe(true);
  expect(plannedDate('2026-10-31', snapshot)).toBe(false);
  expect(plannedDate('2026-11-14', snapshot)).toBe(false);
  expect(plannedDate('2026-11-07')).toBe(false);
});

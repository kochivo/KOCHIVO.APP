import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { previewFor } from './day-preview';
import { DayPreviewCard } from './components/day-preview-card';

const snapshot: ProgramSnapshot = { id: 'active', player_id: 'p', program_id: 'program', title: '', notes: null,
  settings: {}, training_days: [1, 3, 5], days: [
    { id: 'a', title: 'Push', position: 1, exercises: [] },
    { id: 'b', title: 'Pull', position: 2, exercises: [] },
    { id: 'c', title: 'Legs', position: 3, exercises: [] },
  ] };
const session = (date: string, completed = true): WorkoutSessionRow => ({ id: date, program_day_id: 'b',
  training_date: date, started_at: '', completed_at: completed ? `${date}T12:00:00Z` : null, client_updated_at: '' });
it('predicts rotation over training dates, counting today only when it trains', () => {
  expect(previewFor(snapshot, [], '2026-11-06', '2026-11-04')).toEqual({ day: snapshot.days[1], status: 'upcoming' });
  expect(previewFor(snapshot, [], '2026-11-06', '2026-11-05')).toEqual({ day: snapshot.days[0], status: 'upcoming' });
  expect(previewFor(snapshot, [session('2026-11-04')], '2026-11-06', '2026-11-04')).toEqual({ day: snapshot.days[2], status: 'upcoming' });
  expect(previewFor(snapshot, [session('2026-11-05')], '2026-11-06', '2026-11-05')).toEqual({ day: snapshot.days[2], status: 'upcoming' });
});
it('uses logged rotation days and distinguishes completed, missed and rest dates', () => {
  expect(previewFor(snapshot, [session('2026-11-02')], '2026-11-02', '2026-11-05')).toEqual({ day: snapshot.days[1], status: 'completed' });
  expect(previewFor(snapshot, [session('2026-11-02', false)], '2026-11-02', '2026-11-05')).toEqual({ day: snapshot.days[1], status: 'missed' });
  expect(previewFor(snapshot, [], '2026-11-02', '2026-11-05').status).toBe('missed');
  expect(previewFor(snapshot, [], '2026-11-03', '2026-11-05').status).toBe('rest');
  expect(previewFor(snapshot, [], '2026-11-07', '2026-11-05').status).toBe('rest');
  expect(previewFor({ ...snapshot, days: [] }, [], '2026-11-06', '2026-11-05').status).toBe('rest');
});
it('resolves weekly weekdays, explicit rest and finite cycles', () => {
  const weekly = { ...snapshot, starts_on: '2026-10-31', settings: { repeatWeekly: false }, days: [
    { id: 'a', title: 'Push', position: 1, exercises: [], weekday: 6 },
    { id: 'b', title: 'Rest', position: 2, exercises: [], weekday: 3, is_rest_day: true },
  ] };
  expect(previewFor(weekly, [], '2026-11-06', '2026-11-05')).toEqual({ day: weekly.days[0], status: 'upcoming' });
  expect(previewFor(weekly, [{ ...session('2026-11-06'), program_day_id: 'a' }], '2026-11-06', '2026-11-07').status).toBe('completed');
  expect(previewFor(weekly, [], '2026-11-06', '2026-11-07').status).toBe('missed');
  expect(previewFor(weekly, [], '2026-11-03', '2026-11-05').status).toBe('rest');
  expect(previewFor(weekly, [], '2026-11-02', '2026-11-05').status).toBe('rest');
  expect(previewFor(weekly, [], '2026-11-13', '2026-11-05')).toEqual({ day: undefined, status: 'rest' });
  expect(previewFor({ ...weekly, settings: { repeatWeekly: true } }, [], '2026-11-13', '2026-11-05').status).toBe('upcoming');
});
it('renders read-only previews with status and cardio, and a calm rest state', () => {
  const day = { id: 'cardio', title: 'Intervals', position: 1, exercises: [], cardio: [
    { id: 'c', day_id: 'cardio', position: 1, kind: 'Walk', minutes: 30, intensity: 'moderate', notes: '' },
  ] };
  const render = (status: 'upcoming' | 'rest') => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DayPreviewCard, { day, status, date: '2026-11-06' })));
  expect(render('upcoming')).toContain('Upcoming workout');
  expect(render('upcoming')).toContain('30 minutes');
  expect(render('upcoming')).not.toMatch(/href=|data-tour/);
  expect(render('rest').match(/Rest day/g)).toHaveLength(1);
  expect(render('rest')).not.toContain('Walk');
});
it('shows exercise names and prescribed sets and rep ranges without workout actions', () => {
  const day = { id: 'd', title: 'Push', position: 1, exercises: [{ id: 'e', exercise_id: 'e', position: 1,
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 60, superset_group: null, rpe: null, tempo: null,
    notes: null, name_ar: 'ضغط', name_en: 'Press', media_path: null }] };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DayPreviewCard, { day, status: 'completed', date: '2026-11-02' })));
  expect(html).toContain('Completed');
  expect(html).toContain('Press');
  expect(html).toContain('3 × 8–12');
  expect(html).not.toMatch(/href=|data-tour/);
});

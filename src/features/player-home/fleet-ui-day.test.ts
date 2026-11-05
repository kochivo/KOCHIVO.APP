import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot, SnapshotDay, WorkoutSessionRow } from '@/core/offline';
import { TodayCard } from './components/today-card';
import { pickTodayDay } from './next-day';
import { isRestDay } from './rest-day';

const day: SnapshotDay = { id: 'day', title: 'Training', position: 1, exercises: [] };
const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'program', title: 'Program',
  notes: null, settings: {}, training_days: [4], days: [day] };
const render = (locale: 'ar' | 'en', rest: boolean) => renderToStaticMarkup(createElement(LocaleProvider, { locale },
  createElement(TodayCard, { day, rest })));
it.each(['ar', 'en'] as const)('empty training day offers a coach contact in %s', locale => {
  const html = render(locale, false);
  expect(html).toContain('href="/player/captain"');
  expect(html).not.toContain('/player/workout/day');
});
it('handles a program with no days without inventing a workout', () => {
  expect(pickTodayDay({ ...snapshot, days: [] }, [], '2026-11-05')).toBeUndefined();
});
it('keeps a finished day selected today and advances tomorrow', () => {
  const second = { ...day, id: 'day-2', position: 2 };
  const session: WorkoutSessionRow = { id: 'session', program_day_id: 'day', training_date: '2026-11-05',
    started_at: '2026-11-05T10:00:00Z', completed_at: '2026-11-05T11:00:00Z', client_updated_at: '2026-11-05T11:00:00Z' };
  expect(pickTodayDay({ ...snapshot, days: [day, second] }, [session], '2026-11-05')?.id).toBe('day');
  expect(pickTodayDay({ ...snapshot, days: [day, second] }, [session], '2026-11-06')?.id).toBe('day-2');
});
it('recognizes a scheduled rest day from the fixed Cairo date', () => {
  expect(isRestDay(snapshot, [], '2026-11-05')).toBe(false);
  expect(isRestDay(snapshot, [], '2026-11-06')).toBe(true);
});
it('does not label an intentionally empty rest day as unprepared', () => {
  expect(render('en', true)).not.toContain('Your coach is preparing');
});
it.each(['ar', 'en'] as const)('offers recovery guidance on an empty rest day in %s', locale => {
  expect(render(locale, true)).toContain(locale === 'en' ? 'Rest today. Enjoy your recovery' : 'اليوم راحة.. استمتع بالاستشفاء');
});
it('respects the program rest-day flag even without a schedule rest hint', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(TodayCard, { day: { ...day, is_rest_day: true }, rest: false })));
  expect(html).toContain('Rest today. Enjoy your recovery');
  expect(html).not.toContain('Your coach is preparing');
});

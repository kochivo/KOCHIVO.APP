import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot } from '@/core/offline';
import { WeeklyRestCard } from './components/weekly-rest-card';
import { TodayCard } from './components/today-card';

const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'p', title: 'Week',
  notes: null, settings: { repeatWeekly: false }, starts_on: '2026-10-31', training_days: [], days: [
    { id: 'd', title: 'Intervals', position: 3, weekday: 2, is_rest_day: false, exercises: [], cardio: [
      { id: 'c', day_id: 'd', position: 1, kind: 'Walk', minutes: 30, intensity: 'moderate', notes: 'Keep steady' },
    ] },
  ] };
it('shows the next training day on rest days and a finished message after a finite week', () => {
  const render = (today: string) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WeeklyRestCard, { snapshot, today })));
  expect(render('2026-11-01')).toContain('Next training: Intervals · Mon');
  expect(render('2026-11-07')).toContain('Week finished');
  expect(render('2026-11-07')).not.toContain('Next training');
});
it('shows read-only cardio without an empty workout action', () => {
  const day = snapshot.days[0];
  if (!day) throw new Error('fixture');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(TodayCard, { day, rest: false })));
  for (const value of ['Walk', '30 minutes', 'Moderate', 'Keep steady']) expect(html).toContain(value);
  expect(html).not.toContain('/player/workout/');
  expect(html).not.toContain('Your program is being prepared');
});

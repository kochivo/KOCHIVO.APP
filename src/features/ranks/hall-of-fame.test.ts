import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { HallOfFame } from './components/hall-of-fame';
import { RankScreen } from './components/rank-screen';
import { LocaleProvider } from '@/core/i18n/client';

it.each(['ar', 'en'] as const)('renders localized history, empty, loading and error states in %s', locale => {
  const render = (rows?: { month: string; display_name: string; player_id: null; adherence: number; done: number; planned: number }[], error = false) =>
    renderToStaticMarkup(createElement(HallOfFame, { locale, rows, error, onRetry: () => {} }));
  const html = render([{ month: '2026-10-01', display_name: 'Mona', player_id: null, adherence: 75, done: 6, planned: 8 }]);
  expect(html).toContain(locale === 'ar' ? 'لوحة الشرف' : 'Hall of fame');
  expect(html).toContain(locale === 'ar' ? 'أكتوبر' : 'October');
  expect(html).toContain('2026');
  expect(html).toContain('Mona');
  expect(html).toContain(locale === 'ar' ? '75٪ التزام' : '75% adherence');
  expect(html).toContain(locale === 'ar' ? 'aria-label="التاج"' : 'aria-label="Crown"');
  expect(render([])).toContain(locale === 'ar' ? 'لسه محدش أخد التاج' : 'No crown winners yet');
  expect(render()).toContain('role="status"');
  expect(render(undefined, true)).toContain('role="alert"');
  expect(render(undefined, true)).toContain(locale === 'ar' ? 'جرّب تاني' : 'Try again');
});

it.each(['ar', 'en'] as const)('shows frozen winners between the player team board and points log in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(RankScreen, {
    data: { points: { lifetime: 0, tier: 'beginner', monthly: 0, month_position: 1, crown_gap: 1,
      adherence: 0, done: 0, planned: 8, crown_needs_workouts: 4, logs: [] }, board: [],
    hall: [{ month: '2026-10-01', player_id: null, display_name: 'Mona', adherence: 75, done: 6, planned: 8 }] },
  })));
  expect(html.indexOf(locale === 'ar' ? 'فريقك' : 'Your team')).toBeLessThan(html.indexOf('Mona'));
  expect(html.indexOf('Mona')).toBeLessThan(html.indexOf(locale === 'ar' ? 'آخر نقط كسبتها' : 'Latest points'));
});

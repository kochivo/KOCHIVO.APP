import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PreviewWeek } from './components/preview-week';
import { PreviewScreen } from './components/preview-screen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('server-only', () => ({}));

it('keeps preview dates and weekday labels in Arabic', () => {
  const week = [{ date: '2026-11-03', trained: false, mealsEaten: 0 }];
  const html = renderToStaticMarkup(createElement(PreviewWeek, { week, today: '2026-11-03' }));
  expect(html).toContain('الثلاثاء، 3 نوفمبر');
  const screen = renderToStaticMarkup(createElement(PreviewScreen, {
    today: '2026-11-03', result: { data: { name: 'علي', program: null, todayDay: null, nutrition: null, sessions: [], week } },
  }));
  expect(screen).toContain('<span>الثلاثاء</span>');
});

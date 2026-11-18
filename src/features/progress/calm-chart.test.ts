import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LineChart } from './components/line-chart';
import { dateTicks, filterPeriod, yTicks } from './series';

const points = [{ date: '2026-10-20', value: 82 }, { date: '2026-11-18', value: 78.4 }];
const render = (values = points, target?: number) => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(LineChart, { points: values, title: 'الوزن', unit: 'كجم', today: '2026-11-18', target })));
};
afterEach(() => vi.unstubAllEnvs());

it('renders real dates as HTML and keeps SVG text and browser tooltips out of the plot', () => {
  const html = render();
  expect(html).toContain('<time');
  expect(html).toContain('20 أكتوبر');
  expect(html).toContain('النهارده');
  expect(html).not.toMatch(/<text\b|<title\b|أ1/u);
  expect(html).toContain('<table');
});

it('shows the first value in a dashed empty plot', () => {
  const html = render(points.slice(0, 1));
  expect(html).toContain('الرسم بيظهر من تاني متابعة');
  expect(html).toContain('border-dashed');
  expect(html).not.toContain('<polyline');
});

it('shows the goal and colors the change lime only when it approaches the goal', () => {
  expect(render(points, 76)).toContain('stroke-dasharray="4 5"');
  expect(render(points, 76)).toContain('tone-lime');
  expect(render(points, 84)).toContain('tone-neutral');
  expect(render()).not.toContain('stroke-dasharray');
});

it('returns three distinct ticks that include the data and the target', () => {
  expect(yTicks([78.4, 82], 76)).toEqual([82, 79, 76]);
  expect(yTicks([75])).toEqual([76, 75, 74]);
});

it('selects up to four real dates, including both ends', () => {
  const dates = ['01', '02', '03', '04', '05', '06'].map(day => `2026-10-${day}`);
  expect(dateTicks(dates)).toEqual([dates[0], dates[2], dates[3], dates[5]]);
  expect(dateTicks(dates.slice(0, 2))).toEqual(dates.slice(0, 2));
});

it('filters on inclusive calendar-month boundaries and clamps month ends', () => {
  const readings = ['2026-01-30', '2026-01-31', '2026-02-28', '2026-03-31'].map(date => ({ date, value: 80 }));
  expect(filterPeriod(readings, 'month', '2026-03-31')).toEqual(readings.slice(2));
  expect(filterPeriod(readings, 'quarter', '2026-04-30')).toEqual(readings);
  expect(filterPeriod(readings, 'all', '2026-03-31')).toEqual(readings);
});

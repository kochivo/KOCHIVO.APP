import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LineChart } from './components/line-chart';
import { ChartPlot } from './components/chart/chart-plot';
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

const firstDate = '2026-09-05';
const irregular = [
  { date: firstDate, value: 82 },
  { date: '2026-09-12', value: 80 },
  { date: '2026-11-14', value: 78 },
];
const plot = (values = irregular, secondary: typeof irregular = [], primaryIsFat = false) =>
  renderToStaticMarkup(createElement(ChartPlot, {
    points: values, secondary, dates: [...new Set(values.map(point => point.date))],
    today: '2026-11-18', todayLabel: 'Today', locale: 'en', id: 'chart', compact: false,
    percent: '%', primaryIsFat,
  }));

it('positions readings and date labels by elapsed calendar days', () => {
  const html = plot();
  const line = html.match(/<polyline points="([^"]+)"/)?.[1];
  const [first = NaN, second = NaN, last = NaN] = (line ?? '').split(' ').map(pair => Number(pair.split(',')[0]));
  expect((second - first) / (last - first)).toBeCloseTo(0.1);
  expect(html.match(/dateTime="2026-09-12"[^>]*inset-inline-start:([\d.]+)%/i)?.[1]).toBe(String(second));
});

it('centers single and same-day readings without dividing by zero', () => {
  expect(plot(irregular.slice(0, 1))).toContain('inset-inline-start:50%');
  const sameDay = plot(irregular.map(point => ({ ...point, date: firstDate })));
  expect(sameDay).toContain('points="50,10 50,50 50,90"');
  expect(sameDay).not.toContain('NaN');
});

it('shows percentage ticks on the logical end axis when weight and body fat are plotted', () => {
  const fat = irregular.map((point, index) => ({ ...point, value: 30 - index * 5 }));
  const html = plot(irregular, fat);
  expect(html).toMatch(/col-start-3 text-end[^>]*><bdi[^>]*>30%/);
  expect(html).toContain('>25%</bdi>');
  expect(html).toContain('>20%</bdi>');
  expect(plot(fat, [], true)).toMatch(/col-start-2 text-end[^>]*><bdi[^>]*>30%/);
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

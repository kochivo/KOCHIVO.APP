import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Greeting } from './components/greeting';
import { WeekStrip } from './components/week-strip';
import { buildWeek } from './week';

it('renders the Cairo date in Egyptian Arabic without changing block direction', () => {
  const html = renderToStaticMarkup(createElement(Greeting, { now: new Date('2026-11-03T10:00:00Z') }));
  expect(html).toContain('<bdi>الثلاثاء · ٣ نوفمبر</bdi>');
  expect(html).not.toContain('dir=');
});
it('renders the week as a named native list with one current day', () => {
  const html = renderToStaticMarkup(createElement(WeekStrip, { today: '2026-11-03', days: buildWeek('2026-11-03', [], []) }));
  expect(html).toContain('<ul');
  expect(html.match(/<li /g)).toHaveLength(7);
  expect(html.match(/aria-current="date"/g)).toHaveLength(1);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WeekStrip } from './components/week-strip';
import { buildWeek } from './week';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { Greeting } from './components/greeting';

it('renders player-home in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(Greeting, { now: new Date('2026-11-03T10:00:00Z') })));
  expect(html).toContain('Good evening');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

it('renders English weekdays and selects singular and plural counts', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WeekStrip, { today: '2026-11-03', days: buildWeek('2026-11-03', [], [], 'en') })));
  expect(html).toContain('Sat');
  expect(html).toContain('aria-label="Week"');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
  const t = createT(messages, 'en');
  expect(t('exerciseCount', { n: 1, count: '1' })).toBe('1 exercise');
  expect(t('exerciseCount', { n: 3, count: '3' })).toBe('3 exercises');
});


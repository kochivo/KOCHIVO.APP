import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LightDayChip } from './components/light-day-chip';
it('shows only a neutral light-day label, with no reason or cycle details', () => {
  const html = renderToStaticMarkup(createElement(LightDayChip, { light: true, locale: 'ar' }));
  expect(html.replace(/<[^>]*>/g, '')).toBe('يوم خفيف');
  expect(html).not.toMatch(/rose|الدورة|2026/);
  expect(renderToStaticMarkup(createElement(LightDayChip, { light: false, locale: 'ar' }))).toBe('');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MacroTiles } from './components/macro-tiles';

it('shows excess calories and all three macro bars', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MacroTiles, {
    eaten: { kcal: 2500, protein: 180, carbs: 60, fat: 12 }, target: { kcal: 2160, protein: 150, carbs: 200, fat: 60 },
  })));
  expect(html).toContain('Calories');
  expect(html).toContain('Protein');
  expect(html).toContain('Over 340');
  expect(html).toContain('aria-label="Carbs"');
  expect(html).toContain('aria-label="Fat"');
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain('text-warn');
});

it('shows calories remaining from the assigned target', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MacroTiles, {
    eaten: { kcal: 1240, protein: 72, carbs: 150, fat: 38 }, target: { kcal: 2900, protein: 190, carbs: 360, fat: 78 },
  })));
  expect(html).toContain('1,660');
  expect(html).toContain('calories left of 2,900');
});

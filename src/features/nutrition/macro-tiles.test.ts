import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MacroTiles } from './components/macro-tiles';

it('keeps all four macros visible while emphasizing calories and protein and warning over target', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MacroTiles, {
    eaten: { kcal: 2500, protein: 38, carbs: 60, fat: 12 }, target: { kcal: 2160, protein: 150, carbs: 200, fat: 60 },
  })));
  expect(html).toContain('Calories');
  expect(html).toContain('Protein');
  expect(html).toContain('Carbs 60 / 200 g');
  expect(html).toContain('Fat 12 / 60 g');
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain('[&amp;&gt;div]:bg-warn');
});

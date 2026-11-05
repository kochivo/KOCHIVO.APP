import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MacroRing } from './components/macro-ring';

it('renders nutrition in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(MacroRing, { eaten: { kcal: 500, protein: 40, carbs: 60, fat: 10 }, target: { kcal: 2000, protein: 160, carbs: 240, fat: 40 } })));
  expect(html).toContain('Protein');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});


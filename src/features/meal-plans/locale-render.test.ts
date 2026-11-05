import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TargetsBar } from './components/targets-bar';

it('renders nutrition targets in English', () => {
  const macros = { kcal: 2000, protein: 150, carbs: 225, fat: 56 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(TargetsBar, {
    targets: macros, totals: macros, onChange() {},
  })));
  expect(html).toContain('Targets and totals');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

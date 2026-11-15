import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { V11Macros } from './v11-macros';
import { V11FoodsTable } from './v11-foods-table';

it('renders excess calories as a warning instead of a negative remainder', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(V11Macros, {
    targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 },
    totals: { kcal: 2200, protein: 160, carbs: 220, fat: 70 },
  })));
  expect(html).toContain('text-warn">Over target');
  expect(html).not.toContain('-200 remaining');
  expect(html).toContain('aria-label="Protein"');
  expect(html).toContain('aria-valuenow="160"');
});

it('offers editing for every food and keeps a table empty state', () => {
  const food = { id: 'global', name: 'Global', photo: null, custom: false, uses: 0,
    kcal: 100, protein: 10, carbs: 12, fat: 1 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(V11FoodsTable, {
    foods: [food, { ...food, id: 'own', name: 'Own', custom: true }], onSelect() {},
  })));
  expect(html.match(/aria-label="Edit food"/g)).toHaveLength(2);
  expect(html).toContain('>Global</b>');
  const empty = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(V11FoodsTable, { foods: [], onSelect() {} })));
  expect(empty).toContain('No foods match this search');
});

it('shows nutrition for the named portion rather than unrelated per-100g values', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(V11FoodsTable, {
    foods: [{ id: 'food', name: 'Rice', photo: null, custom: false, uses: 0,
      kcal: 130, protein: 3, carbs: 28, fat: 1,
      units: [{ key: 'cup', name_ar: 'كوباية', name_en: 'cup', grams: 200 }] }], onSelect() {},
  })));
  expect(html).toContain('cup');
  expect(html).toContain('200g');
  expect(html).toContain('>260</td>');
  expect(html).toContain('>6</td>');
});

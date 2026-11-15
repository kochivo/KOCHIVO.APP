import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FoodsTable } from './foods-table';

it('keeps the units heading and leaves foods without units blank', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(FoodsTable, {
    foods: [{ id: 'food', name: 'Food', photo: null, custom: false, uses: 0,
      kcal: 0, protein: 0, carbs: 0, fat: 0, units: [] }], onSelect() {},
  })));
  expect(html).toContain('>Units</th>');
  expect(html).not.toContain('No units');
  expect(html).toContain('flex-wrap gap-inline"></div></td>');
});

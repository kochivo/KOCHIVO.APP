import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FoodActions } from './components/food-actions';

it.each(['ar', 'en'] as const)('keeps photo and extra food unavailable in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FoodActions)));
  expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
  expect(html.match(new RegExp(locale === 'ar' ? 'قريباً' : 'Coming soon', 'g'))).toHaveLength(2);
  expect(html).not.toContain('bg-lime');
});

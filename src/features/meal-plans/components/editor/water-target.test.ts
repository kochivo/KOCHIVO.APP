import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WaterTarget } from './water-target';
import { waterTargetMl } from './water-target-value';

it('renders litres, quarter-litre steps and an automatic weight hint', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WaterTarget, { value: null, weightKg: 80, onChange: () => {} })));
  expect(html).toContain('Water a day');
  expect(html).toContain('step="0.25"');
  expect(html).toContain('min="0.5"');
  expect(html).toContain('max="10"');
  expect(html).toContain('Automatic by weight: 2.8 L');
});
it('stores ml, rounds steps, clamps limits and clears to automatic', () => {
  expect(waterTargetMl('')).toBeNull();
  expect(waterTargetMl('3.25')).toBe(3250);
  expect(waterTargetMl('2.63')).toBe(2750);
  expect(waterTargetMl('0.1')).toBe(500);
  expect(waterTargetMl('11')).toBe(10000);
  expect(waterTargetMl('bad')).toBeNull();
});

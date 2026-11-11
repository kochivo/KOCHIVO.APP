import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CalculatorInputs } from './calculator-inputs';

it('shows prefilled sourced facts and an add action for missing data', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(CalculatorInputs, {
      facts: { weight: { key: 'weight', value: 82, isNew: false,
        source: { kind: 'checkin', id: 'checkin', at: '2026-11-10T12:00:00Z' } },
      age: { key: 'age', value: 27, isNew: false, source: { kind: 'intake', id: 'player', at: '2026-10-01T12:00:00Z' } } },
      values: { weightKg: 82, age: 27 }, onChange() {},
    })));
  expect(html).toContain('82');
  expect(html).toContain('المتابعة');
  expect(html).toContain('بيانات البداية');
  expect(html).toContain('2026');
  expect(html).toContain('أضف');
  expect(html).toContain('الطول');
});

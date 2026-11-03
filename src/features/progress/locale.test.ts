import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CheckinSheet } from './components/checkin-sheet';
import { LineChart } from './components/line-chart';

it('renders progress in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(LineChart, { points: [], title: 'Weight', unit: 'kg' })));
  expect(html).toContain('No measurements yet');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

it('translates photo controls and chart dates in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement('div', null,
      createElement(CheckinSheet, { open: false, onClose: () => undefined, onSent: () => undefined }),
      createElement(LineChart, { points: [{ date: '2026-11-03', value: 75 }], title: 'Weight', unit: 'kg' }))));
  expect(html).toContain('Front photo');
  expect(html).toContain('3 November 2026');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});


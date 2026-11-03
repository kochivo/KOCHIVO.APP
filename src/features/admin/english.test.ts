import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KpiRow } from './components/kpi-row';
it('renders English admin metrics', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(KpiRow, { rows: [], now: '2026-11-03T12:00:00Z' })));
  expect(html).toContain('Registered coaches');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KpiRow } from './components/kpi-row';
it('renders English admin metrics', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(KpiRow, { data: { captains: 0, players: 0, paid_captains: 0 } })));
  expect(html).toContain('Registered coaches');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlanCard } from './components/plan-card';
vi.mock('server-only', () => ({}));
it('renders the English plan name, usage and Cairo subscription date', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(PlanCard, {
    plan: { tier: 'legend', price_egp: 399, player_limit: 40 }, used: 3, subscriptionEnd: '2026-11-02T23:30:00Z',
  })));
  expect(html).toContain('My plan');
  expect(html).toContain('Legend');
  expect(html).toContain('3 of 40 players');
  expect(html).toContain('3 November 2026');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

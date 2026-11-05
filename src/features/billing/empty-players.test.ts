import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { BillingResult } from './types';
import { BillingScreen } from './components/billing-screen';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => result }));
const result: BillingResult = { data: {
  players: [], packages: [], plan: { tier: 'entry', price_egp: 0, player_limit: 5 },
  used: 0, subscriptionEnd: null, revenue: { thisMonth: 0, lastMonth: 0, dues: 0, owing: 0 },
} };

it('takes billing with no players to the roster invitation flow', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(BillingScreen, { data: Promise.resolve(result), today: '2026-11-03' })));
  expect(html).toMatch(/href="\/captain\/players"[^>]*>Invite a player<\/a>/);
});

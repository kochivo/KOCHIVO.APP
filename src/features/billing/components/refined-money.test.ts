import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBillingTiles } from './workspace-billing-tiles';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import { WorkspaceTierCard } from './workspace-tier-card';
import { catalogFixture } from '../tiers/catalog-fixture';
import type { BillingPlayer } from '../types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(
  createElement(LocaleProvider, { locale: 'en' }, element));
const player: BillingPlayer = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-20', due: 0,
  phone: null, lastPayment: null, startedOn: '2026-11-01', lastTrainingDate: null, programTitle: null,
  openTasks: 0, status: 'active' };

it('groups collected, owed, active and ending totals in one strip', () => {
  const html = render(createElement(WorkspaceBillingTiles, {
    values: { income: 4500, pending: 2, ending: 3, active: 8 }, owed: 1200,
  }));
  expect(html).toContain('hairline-cells');
  for (const value of ['4,500', '1,200', '>8<', '>3<']) expect(html).toContain(value);
  expect(html).not.toContain('<svg');
});

it('keeps subscriptions in one glass list with segmented filters and ending tags', () => {
  const html = render(createElement(WorkspacePaymentsTable, { players: [player], packages: [], today: '2026-11-17' }));
  expect(html).toContain('role="radiogroup"');
  expect(html.match(/role="radio"/g)).toHaveLength(4);
  expect(html).toContain('tone-warn');
  expect(html).toContain('min-h-14');
  expect(html).toContain('Ali');
  expect(html).toContain('No payment recorded');
});

it('leads with real duration prices before included features and retains all editors', () => {
  const tier = catalogFixture.tiers[0];
  if (!tier) throw new Error('Missing tier fixture');
  const html = render(createElement(WorkspaceTierCard, { tier, packages: catalogFixture.packages,
    busy: false, onEdit() {}, onPackage() {}, count: 4 }));
  expect(html).toContain('glass-featured');
  expect(html).toContain('tone-lime');
  expect(html).toContain('text-stat');
  expect(html.indexOf('2,500')).toBeLessThan(html.indexOf('Weekly call'));
  expect(html).toContain('4 players');
  expect(html.match(/<button/g)).toHaveLength(4);
  expect(html).not.toContain('control-primary');
});

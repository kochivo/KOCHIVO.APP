import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBilling } from './components/workspace-billing';
import type { BillingResult } from './types';

vi.mock('server-only', () => ({}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: { data: [] }, retry: vi.fn() }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock('@/ui/page-bar-title', () => ({ PageBarTitle: () => null }));
vi.mock('@/ui/page-bar-actions', () => ({ PageBarActions: () => null }));
vi.mock('./components/workspace-payments-table', () => ({ WorkspacePaymentsTable: () => null }));

it('renders the server money-owed slot in the actual workspace billing screen', async () => {
  const data = Promise.resolve<BillingResult>({ data: { players: [], packages: [],
    revenue: { thisMonth: 0, lastMonth: 0, dues: 0, owing: 0 },
    plan: { tier: 'free', price_egp: 0, player_limit: 5 }, used: 0, subscriptionEnd: null } });
  const stream = await renderToReadableStream(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspaceBilling, { data, today: '2026-11-04', moneyOwed: createElement('p', null, 'Money owed slot') })));
  expect(await new Response(stream).text()).toContain('Money owed slot');
});

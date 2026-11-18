import { createElement } from 'react';
import type * as React from 'react';
import type * as ReactDOM from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBilling } from './components/workspace-billing';
import { WorkspaceBillingRow } from './components/workspace-billing-row';
import { WorkspacePaymentsTable } from './components/workspace-payments-table';
import type { BillingResult } from './types';
import type { ReceiptReview } from './receipts/types';

const state = vi.hoisted(() => ({ result: {} as BillingResult, portal: vi.fn(),
  receipts: [] as ReceiptReview[], requests: [] as { id: string; name: string; package: string }[] }));
vi.mock('@/core/resource', () => ({
  useResource: (key: string) => ({ data: { data: key.startsWith('billing:receipts:') ? state.receipts : state.requests } }),
}));
vi.mock('@/ui/page-bar-slot', () => ({ usePageBarTarget: (slot: string) => slot }));
vi.mock('react-dom', async original => ({ ...await original<typeof ReactDOM>(),
  createPortal: (children: unknown, target: unknown) => { state.portal(children, target); return children; } }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => state.result }));
vi.mock('./data/finance-actions', () => ({ createPackage: vi.fn(), archivePackage: vi.fn() }));
vi.mock('./data/pt-actions', () => ({ setPlayerFrozen: vi.fn() }));
beforeEach(() => {
  state.portal.mockClear();
  state.receipts = [];
  state.requests = [];
  state.result = { data: { players: [], packages: [], plan: { tier: 'entry', price_egp: 0, player_limit: 5 },
    used: 0, subscriptionEnd: null, revenue: { thisMonth: 4500, lastMonth: 0, dues: 1200, owing: 2 } } };
});
function render(moneyOwed?: React.ReactNode) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceBilling, { data: Promise.resolve(state.result), today: '2026-11-12', moneyOwed })));
}
it('shows a single invite action with the exact empty copy', () => {
  const html = render();
  expect(html).toContain('لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين');
  expect(html.match(/href="\/captain\/players"/g)).toHaveLength(1);
  expect(html).not.toContain('سجّل دفعة');
  expect(html).not.toContain('كبّر الباقة');
  expect(html).not.toContain('رقّي باقتك');
});
it('renders the four tiles and hides attention when all four lists are empty', () => {
  if (!state.result.data) throw new Error('Missing fixture');
  state.result.data.players = [{ playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active',
    phone: null, lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }];
  const html = render();
  for (const label of ['الاشتراكات', 'دخل نوفمبر', 'بيخلص خلال 7 أيام', 'اشتراكات شغالة', 'بيخلص قريب', 'دوّر على لاعب', 'من 4,500 متوقعة']) expect(html).toContain(label);
  expect(html).toContain('group hidden has-[[data-billing-task]]:block');
  expect(html).not.toContain('<details data-billing-task');
  expect(html).not.toContain('بعد 19 يوم');
  expect(html).toContain('4,500');
  expect(html).not.toContain('ج.م');
  expect(html).not.toContain('كبّر الباقة');
});
it('places all four nonempty lists in one attention card with their original actions', () => {
  if (!state.result.data) throw new Error('Missing fixture');
  state.result.data.players = [{ playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-13', status: 'active',
    phone: '201000000001', lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }];
  state.requests = [{ id: 'renewal', name: 'Renewing player', package: 'Pro' }];
  state.receipts = [{ id: 'r', name: 'Receipt player', url: '/receipt.webp', photo_path: 'receipt.webp',
    revision: 1, amount_egp: 100, method: 'cash', created_at: '2026-11-12T12:00:00Z', player_id: 'p', captain_id: 'captain',
    status: 'pending', decline_reason: null, decided_at: null, renewal_request_id: null, packageName: null, frozenAt: null }];
  const html = render(createElement('details', { 'data-billing-task': true }, 'Money owed'));
  const card = html.slice(html.indexOf('محتاج منك'), html.indexOf('دوّر على لاعب'));
  expect(card.match(/<details data-billing-task/g)).toHaveLength(4);
  for (const label of ['Money owed', 'Receipt player', 'Renewing player', 'وافق', 'فكّره']) expect(card).toContain(label);
});
it('keeps package setup reachable before the first player joins', () => {
  expect(render()).toContain('href="/captain/billing/packages"');
  expect(render()).toContain('الباقات والعروض');
  expect(state.portal.mock.calls.map(call => call[1])).toContain('title');
  expect(state.portal.mock.calls.map(call => call[1])).toContain('actions');
});
it('shows an exhausted session balance with a warning pill', () => {
  const player = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active' as const,
    phone: null, lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null,
    programTitle: null, openTasks: 0, sessionsLeft: 0 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceBillingRow, { player, today: '2026-11-12', packages: [] })));
  expect(html).toMatch(/bg-warn-soft text-warn[^>]*>الحصص خلصت/);
});

it.each([null, 0, 800])('does not call unpaid renewals confirmed payments: %s', amount => {
  const player = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active' as const,
    phone: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0,
    lastPayment: { id: 'payment', captain_id: 'captain', player_id: 'p', period_start: '2026-11-13', period_end: '2026-12-13',
      package_id: null, days: 30, price_egp: 800, amount_egp: amount, created_at: '2026-11-13T12:00:00Z' } };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspacePaymentsTable, { players: [player], packages: [], today: '2026-11-14' })));
  expect(html.includes('Paid in full')).toBe(amount !== null && amount > 0);
  expect(html.includes('Not paid')).toBe(amount === null || amount === 0);
});

it.each(['instapay', null] as const)('shows a recorded payment method or the legacy dash: %s', method => {
  const player = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active' as const,
    phone: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0,
    lastPayment: { id: 'payment', captain_id: 'captain', player_id: 'p', period_start: '2026-11-13', period_end: '2026-12-13',
      days: 30, amount_egp: 800, method, created_at: '2026-11-13T12:00:00Z' } };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspacePaymentsTable, { players: [player], packages: [], today: '2026-11-14' })));
  expect(html).toContain('Last payment');
  expect(html.includes('InstaPay')).toBe(Boolean(method));
});

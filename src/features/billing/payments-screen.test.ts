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

const state = vi.hoisted(() => ({ result: {} as BillingResult, portal: vi.fn() }));
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
  state.result = { data: { players: [], packages: [], plan: { tier: 'entry', price_egp: 0, player_limit: 5 },
    used: 0, subscriptionEnd: null, revenue: { thisMonth: 4500, lastMonth: 0, dues: 1200, owing: 2 } } };
});
function render() {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceBilling, { data: Promise.resolve(state.result), today: '2026-11-12' })));
}
it('shows a single invite action with the exact empty copy', () => {
  const html = render();
  expect(html).toContain('لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين');
  expect(html.match(/href="\/captain\/players"/g)).toHaveLength(1);
  expect(html).not.toContain('سجّل دفعة');
  expect(html).not.toContain('كبّر الباقة');
  expect(html).not.toContain('رقّي باقتك');
});
it('renders the four tiles, reminder window and payments section', () => {
  if (!state.result.data) throw new Error('Missing fixture');
  state.result.data.players = [{ playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active',
    phone: null, lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }];
  const html = render();
  for (const label of ['الاشتراكات والدفعات', 'دخل الشهر', 'مستني تأكيد', 'بيخلص الأسبوع ده', 'اشتراك شغال', 'بيخلص قريب', 'كل الدفعات', 'بعد 19 يوم']) expect(html).toContain(label);
  expect(html).toContain('4,500');
  expect(html).not.toContain('ج.م');
  expect(html).not.toContain('كبّر الباقة');
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
  expect(html.includes('Confirmed')).toBe(amount !== null && amount > 0);
  expect(html.includes('Renewed without payment')).toBe(amount === null || amount === 0);
});

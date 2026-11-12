import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBilling } from './components/workspace-billing';
import { WorkspaceBillingRow } from './components/workspace-billing-row';
import type { BillingResult } from './types';

const state = vi.hoisted(() => ({ result: {} as BillingResult }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => state.result }));
vi.mock('./data/finance-actions', () => ({ createPackage: vi.fn(), archivePackage: vi.fn() }));
vi.mock('./data/pt-actions', () => ({ setPlayerFrozen: vi.fn() }));
beforeEach(() => {
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
it('renders the payments summary, one segment group, search and the package side card', () => {
  if (!state.result.data) throw new Error('Missing fixture');
  state.result.data.players = [{ playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active',
    phone: null, lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null, programTitle: null, openTasks: 0 }];
  const html = render();
  for (const label of ['سجّل دفعة', 'الكل', 'متأخر', 'هيخلص قريب', 'دافع', 'دوّر على لاعب', 'الباقة', 'آخر دفعة', 'التجديد', 'باقاتك']) expect(html).toContain(label);
  expect(html.match(/role="group"/g)).toHaveLength(1);
  expect(html).not.toContain('ج.م');
  expect(html).not.toContain('كبّر الباقة');
});
it('keeps package setup reachable before the first player joins', () => {
  expect(render()).toContain('+ باقة جديدة');
});
it('shows an exhausted session balance with a warning pill', () => {
  const player = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-01', status: 'active' as const,
    phone: null, lastPayment: null, due: 0, startedOn: '2026-10-01', lastTrainingDate: null,
    programTitle: null, openTasks: 0, sessionsLeft: 0 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceBillingRow, { player, today: '2026-11-12', packages: [] })));
  expect(html).toMatch(/bg-warn-soft text-warn[^>]*>الحصص خلصت/);
});

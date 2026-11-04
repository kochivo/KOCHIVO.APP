import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { CaptainsTable } from './components/captains-table';
import { AuditList } from './components/audit-list';
import { ActivatePanel } from './components/activate-panel';
import { AdminScreen } from './components/admin-screen';
vi.mock('./data/sign-out', () => ({ signOutAdmin() {} }));
vi.mock('./data/set-suspended', () => ({ setSuspended() {} }));
vi.mock('./data/activate-plan', () => ({ activatePlan() {} }));
it('renders a translated sign-out submit button in the admin header', () => {
 const html = render(createElement(AdminScreen, { captains: { rows: [], error: null }, audit: { rows: [], error: null },
 plans: { rows: [], error: null }, kpis: { data: null, error: null }, search: '', offset: 0 }));
 const header = html.match(/<header[\s\S]*?<\/header>/)?.[0];
 expect(header).toMatch(/<form[\s\S]*type="submit"[\s\S]*>Sign out<\/button><\/form>/);
 expect(header).toContain('min-h-12');
 expect(header).toContain('bg-danger-soft');
});
it('offers clearing filters when the captains list is empty', () => {
 expect(render(createElement(CaptainsTable, { rows: [], selected: null, onActivate() {}, onSuspend() {}, onReset() {} }))).toContain('>Clear search and filters</button>');
});
it('takes an empty audit list to captain management', () => {
 expect(render(createElement(AuditList, { rows: [], captains: [], error: null }))).toMatch(/href="#captain-management"[^>]*>Manage captains<\/a>/);
});
it('offers returning to captain management when plan choices are unavailable', () => {
 const html = render(createElement(ActivatePanel, { captain: { id: 'c', full_name: 'Coach', email: null, email_confirmed: true,
 created_at: '2026-11-03T10:00:00Z', tier: 'entry', tier_ends_at: null, active_players: 0, player_limit: 5, suspended: false, last_paid_tier: null, last_paid_ends_at: null, over_limit: false },
 plans: [], onClose() {}, onSuccess() {} }));
 expect(html).toContain('<h2 class="text-xl font-bold">');
 expect(html).toContain('>Manage captains</button>');
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ReactElement } from 'react';
import type { AdminDashboard, AdminCaptainDetail } from './dashboard-types';
import type { CaptainRow } from './types';
import { ActionStrip } from './components/action-strip';
import { DashboardKpis } from './components/dashboard-kpis';
import { SignupsChart } from './components/signups-chart';
import { CaptainTabs } from './components/captain-tabs';
import { CaptainDetailContent } from './components/captain-detail-content';
import { CaptainsTable } from './components/captains-table';
import { AdminScreen } from './components/admin-screen';
import { captainsCsv, whatsappLink, filterCaptains, relativeActivity } from './dashboard-ui';
import { CaptainSidePanel } from './components/captain-side-panel';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('./data/sign-out', () => ({ signOutAdmin() {} }));
vi.mock('./data/captain-reviews', () => ({ reviewCaptain() {} }));
vi.mock('./data/set-suspended', () => ({ setSuspended() {} }));
vi.mock('./data/activate-plan', () => ({ activatePlan() {} }));
const render = (element: ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
const trend = { value: 12, previous: 10 };
const dashboard: AdminDashboard = {
  actions: { pendingCaptains: 3, expiringSoon: 0, overLimit: 2, quietPaid: 4 },
  mrr: { value: 699, previous: 399 }, captains: trend, paidCaptains: trend, players: trend,
  activeCaptains: { value: 7, previous: 11 },
  signups: Array.from({ length: 30 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, captains: i, players: i * 2 })),
  planMix: [{ tier: 'legend', captains: 12 }],
  stateCounts: { all: 12, paid: 8, free: 2, expiringSoon: 1, expired: 1, unconfirmed: 0, suspended: 1 },
  health: { cronJobs: 10, cronFailures24h: 0, pendingDeletions: 2 },
};
const captain: CaptainRow = { id: 'c', full_name: 'Coach', email: null, email_confirmed: true,
  created_at: '2026-10-01T00:00:00Z', tier: 'legend', tier_ends_at: '2026-11-20T00:00:00Z',
  active_players: 38, player_limit: 40, suspended: false, last_paid_tier: null, last_paid_ends_at: null, over_limit: false };
const detail: AdminCaptainDetail = { id: 'c', phone: '+20 (100) 123-4567', players: 38, trainedThisWeek: 29, totalPaidEgp: 2097,
  history: [{ tier: 'legend', months: 3, amountEgp: 2097, startsAt: '2026-08-20', endsAt: '2026-11-20', paymentRef: 'Ref 123' }] };

it('renders decision counts and keeps zero counts calm', () => {
  const html = render(createElement(ActionStrip, { actions: dashboard.actions, onFilter() {}, onRequests() {} }));
  expect(html).toContain('>3</');
  const zero = html.match(/<button[^>]*data-action="expiringSoon"[\s\S]*?<\/button>/)?.[0];
  expect(zero).toContain('text-muted');
  expect(zero).not.toContain('text-lime');
});
it('renders signed KPI deltas, paid share, and danger only for declining activity', () => {
  const html = render(createElement(DashboardKpis, { data: dashboard }));
  expect(html).toContain('+300');
  expect(html).toContain('100%');
  expect(html).toMatch(/text-danger[^>]*>[^<]*-4/);
  expect((html.match(/text-danger/g) ?? [])).toHaveLength(1);
});
it('renders 30 bars in each signup series and names the peak day', () => {
  const html = render(createElement(SignupsChart, { signups: dashboard.signups }));
  expect(html.match(/data-series="captains"/g)).toHaveLength(30);
  expect(html.match(/data-series="players"/g)).toHaveLength(30);
  expect(html).toContain('<figcaption');
  expect(html).toContain('30 Oct');
});
it('renders whole-table counts on tabs', () => {
  const html = render(createElement(CaptainTabs, { filter: 'all', counts: dashboard.stateCounts, onChange() {} }));
  expect(html).toMatch(/All[\s\S]*?>12</);
  expect(html).toMatch(/paid plans[\s\S]*?>8</);
  expect(html).toContain('Expiring soon');
});
it.each([
  [{}, true, 'Renew'], [{ over_limit: true }, false, 'Upgrade'],
  [{ tier: 'entry' as const }, false, 'Activate plan'], [{ suspended: true }, true, 'Restore'], [{}, false, 'Open'],
])('offers the context action for %j', (overrides, expiringSoon, action) => {
  const html = render(createElement(CaptainsTable, { rows: [{ ...captain, ...overrides }], selected: null, onActivate() {}, onSuspend() {},
    activity: [{ id: 'c', lastActiveAt: '2026-11-14T00:00:00Z', expiringSoon, quiet: false }], now: Date.parse('2026-11-15T00:00:00Z') }));
  expect(html).toContain(`${action}<`);
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('bg-warn');
});
it('matches activity filters and limits quiet to paid captains', () => {
  const activity = [{ id: 'c', lastActiveAt: null, expiringSoon: true, quiet: false }];
  expect(filterCaptains([captain], 'expiringSoon', activity)).toEqual([captain]);
  expect(filterCaptains([captain], 'quiet', activity)).toEqual([]);
  expect(filterCaptains([captain], 'quiet', [])).toEqual([]);
  expect(filterCaptains([captain, { ...captain, tier: 'entry' }], 'quiet', [{ id: captain.id, lastActiveAt: null, expiringSoon: false, quiet: true }])).toEqual([captain]);
});
it('labels activity by Cairo calendar date across midnight', () => {
  expect(relativeActivity('2026-11-14T21:00:00Z', Date.parse('2026-11-14T23:00:00Z'))).toEqual({ key: 'yesterday', days: 1 });
});
it('prevents closing or suspending a panel during activation', () => {
  const html = render(createElement(CaptainSidePanel, { captain, plans: [], onClose() {}, onSuccess() {}, onSuspend() {}, activationPending: true }));
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Close<\/button>/);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Suspend account<\/button>/);
});
it('escapes quotes, commas, newlines and spreadsheet formulas in CSV', () => {
  const csv = captainsCsv([{ ...captain, full_name: 'A,"B"\nC', email: '=SUM(1)' }], [], ['Name']);
  expect(csv).toContain('"A,""B""\nC"');
  expect(csv).toContain('"\'=SUM(1)"');
});
it('builds a digits-only WhatsApp URL with encoded text and disables missing phones', () => {
  expect(whatsappLink('+20 (100) 123-4567', 'Renew & pay?')).toBe('https://wa.me/201001234567?text=Renew%20%26%20pay%3F');
  expect(whatsappLink(null, 'Renew')).toBeNull();
  expect(whatsappLink('---', 'Renew')).toBeNull();
});
it('renders detail stats, real history and a disabled WhatsApp link without a phone', () => {
  const html = render(createElement(CaptainDetailContent, { captain, detail: { ...detail, phone: null } }));
  expect(html).toContain('>38<'); expect(html).toContain('>29<'); expect(html).toContain('2,097');
  expect(html).toContain('Ref 123'); expect(html).toContain('disabled'); expect(html).not.toContain('https://wa.me/');
});
it('keeps the screen usable without dashboard data', () => {
  const html = render(createElement(AdminScreen, { captains: { rows: [], error: null }, plans: { rows: [], error: null }, audit: { rows: [], error: null },
    kpis: { data: { captains: 12, players: 50, paid_captains: 8 }, error: null }, search: '', offset: 0 }));
  expect(html).toContain('Sign out'); expect(html).toContain('Dashboard data is unavailable'); expect(html).toContain('50');
});

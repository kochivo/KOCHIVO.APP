import { Children, createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { HomeInvite } from './home/home-invite';
import type { RosterPlayer } from '@/features/roster';
import type { ReviewRow } from './home/model';
import { WorkspaceHome } from './components/workspace-home';

vi.mock('server-only', () => ({}));
vi.mock('@/features/captain-workspace/server', () => ({ MoneyOwedEntry: () => createElement('div', { 'data-money-owed': true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }), usePathname: () => '/captain', unstable_rethrow: () => {} }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar', getArabicStyle: async () => 'egyptian',
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
const state = vi.hoisted(() => ({ failed: false, count: 0, rows: [] as ReviewRow[],
  renewals: [] as { id: string; name: string }[], renewalFailure: 'none' as 'none' | 'error' | 'throw' }));
vi.mock('@/features/billing', () => ({ listRenewalRequests: async () => {
  if (state.renewalFailure === 'throw') throw new Error('Unavailable');
  return state.renewalFailure === 'error' ? { error: 'Unavailable' } : { data: state.renewals };
} }));
vi.mock('./data/workspace', () => ({ loadHomeSummary: async () => {
  if (state.failed) throw new Error('Unavailable');
  return { adherence: 78, previousAdherence: 72, paid: 4500, limit: 15,
    assessments: new Map(), activity: [], mealPlanPlayers: new Set(), lastPayments: new Map(), sessions: [], completedTasks: 0 };
} }));
vi.mock('./data/home-followup', () => ({ loadHomeFollowup: async () => {
  if (state.failed) throw new Error('Unavailable');
  return { rows: state.rows, count: state.count, requests: [] };
} }));
beforeEach(() => { state.failed = false; state.count = 0; state.rows = []; state.renewals = []; state.renewalFailure = 'none'; });
const now = new Date('2026-11-12T15:00:00Z');
const player: RosterPlayer = { playerId: 'a', fullName: 'Ali', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-12', programTitle: 'Program', openTasks: 0 };
async function render(players: RosterPlayer[]) {
  const props = { data: Promise.resolve([{ players }, 'علي', new Map<string, number>()] as const).then(([roster, name, dues]):
    [{ players: RosterPlayer[] }, string, Map<string, number>] => [roster, name, dues]), today: '2026-11-12', now };
  const tree = await WorkspaceHome(props);
  return new Response(await renderToReadableStream(createElement(LocaleProvider, { locale: 'ar' }, tree))).text();
}
it.each([0, 1])('keeps an empty hero with %i players and no outstanding work', async count => {
  const html = await render(count ? [player] : []);
  expect(html).toContain('خلصت كل مهام النهارده. فريقك ماشي تمام.');
  expect(html).not.toContain('ابدأ المهام');
  expect(html).toContain('مفيش مهام. عاش يا كابتن.');
  expect(html).not.toContain('<details');
  expect(html).not.toContain('aria-label="الإشعارات"');
});
it('passes the greeting, date and existing lime invite into the shared frame slots', async () => {
  const tree = await WorkspaceHome({ data: Promise.resolve([{ players: [player] }, 'علي', new Map()]), today: '2026-11-12', now });
  const pageBar = Children.toArray(tree.props.children)[0] as ReactElement<{ children: ReactNode }>;
  const slots = Children.toArray(pageBar.props.children);
  const title = slots.find(node => isValidElement(node) && node.type === PageBarTitle) as ReactElement<{ title: string; subtitle: string }> | undefined;
  const actions = slots.find(node => isValidElement(node) && node.type === PageBarActions) as ReactElement<{ children: ReactElement<{ name: string; label: string }> }> | undefined;
  expect(title?.props).toEqual({ title: 'مساء الخير يا كابتن علي', subtitle: 'الخميس · 12 نوفمبر' });
  expect(actions?.props.children.type).toBe(HomeInvite);
  expect(actions?.props.children.props).toEqual({ name: 'علي', label: 'ضيف لاعب' });
});
it('renders four real tiles, the weekly chart and join empty state', async () => {
  const html = await render([player]);
  expect(html).toContain('data-money-owed');
  expect(html).toContain('+6%');
  expect(html).toContain('جنيه الشهر ده');
  expect(html).toContain('اتمرنوا النهارده');
  expect(html).toContain('مهام مستنياك');
  expect(html).toContain('تمارين الفريق');
  expect(html).toContain('مفيش طلبات انضمام مستنية.');
  expect(html).not.toContain('ج.م');
  expect(html).not.toContain('هيخلص اشتراكهم');
  expect(html).not.toContain('لاعب جديد عايز ينضم');
});
it('uses the exact outstanding count for the hero estimate even when only part of the review list is loaded', async () => {
  state.count = 7;
  const html = await render([player]);
  expect(html).toContain('7 مهام');
  expect(html).toContain('21 دقيقة');
  expect(html).toContain('ابدأ المهام');
  expect(html).toContain('href="/captain/inbox"');
});
it('does not pretend failed reads are zero or all-clear', async () => {
  state.failed = true;
  const html = await render([player]);
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('كل حاجة ماشية تمام');
  expect(html).not.toContain('0 جنيه متأخرين');
  expect(html).not.toContain('خلصت كل مهام النهارده');
});
it('names the first two urgent tasks in the hero and shows only the first five rows', async () => {
  state.rows = ['محمد', 'يوسف', 'أحمد', 'عمر', 'علي', 'كريم'].map((name, index) => ({
    id: String(index), playerId: 'a', name, kind: 'form', title: 'Squat', flags: ['assessmentAlert'], at: '2026-11-12T10:00:00Z',
  }));
  state.count = 6;
  const html = await render([player]);
  expect(html).toContain('ابدأ بفيديو محمد، وفيديو يوسف.');
  expect(html).toContain('18 دقيقة');
  expect(html.match(/<li\b/g)).toHaveLength(5);
  expect(html).not.toContain('كريم');
});
it('shows the names and count of pending renewal payments and links them to billing', async () => {
  state.renewals = [{ id: 'a', name: 'أحمد فتحي' }, { id: 'b', name: 'هالة مصطفى' }];
  const html = await render([player]);
  const paymentRow = html.match(/<a\b[^>]*href="\/captain\/billing"[^>]*>[\s\S]*?<\/a>/g)?.find(row => row.includes('أحمد فتحي'));
  expect(paymentRow).toContain('دفعتين');
  expect(paymentRow).toContain('هالة مصطفى');
  expect(paymentRow).toContain('>2</span>');
});
it.each(['error', 'throw'] as const)('keeps home data visible and shows a payment error when renewal reads %s', async failure => {
  state.renewalFailure = failure;
  const html = await render([player]);
  expect(html).toContain('role="alert"');
  expect(html).toContain('مش قادرين نحمّل الدفعات. جرّب تاني.');
  expect(html).toContain('تمارين الفريق');
  expect(html).not.toContain('مفيش دفعات مستنية تأكيد.');
});

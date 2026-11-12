import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import type { RosterPlayer } from '@/features/roster';
import { WorkspaceHome } from './components/workspace-home';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }), unstable_rethrow: () => {} }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar', getArabicStyle: async () => 'egyptian',
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
const state = vi.hoisted(() => ({ failed: false, count: 0 }));
vi.mock('./data/workspace', () => ({ loadHomeSummary: async () => {
  if (state.failed) throw new Error('Unavailable');
  return { adherence: 78, previousAdherence: 72, paid: 4500, limit: 15,
    assessments: new Map(), activity: [], mealPlanPlayers: new Set(), lastPayments: new Map() };
} }));
vi.mock('./data/home-followup', () => ({ loadHomeFollowup: async () => {
  if (state.failed) throw new Error('Unavailable');
  return { rows: [], count: state.count, requests: [] };
} }));
beforeEach(() => { state.failed = false; state.count = 0; });
const now = new Date('2026-11-12T15:00:00Z');
const player: RosterPlayer = { playerId: 'a', fullName: 'Ali', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-12', programTitle: 'Program', openTasks: 0 };
async function render(players: RosterPlayer[]) {
  const props = { data: Promise.resolve([{ players }, 'علي', new Map<string, number>()] as const).then(([roster, name, dues]):
    [{ players: RosterPlayer[] }, string, Map<string, number>] => [roster, name, dues]), today: '2026-11-12', now };
  const tree = await WorkspaceHome(props);
  return new Response(await renderToReadableStream(createElement(LocaleProvider, { locale: 'ar' }, tree))).text();
}
it.each([0, 1])('shows one primary add action with %i players and the right empty state', async count => {
  const html = await render(count ? [player] : []);
  expect(html.match(/data-tour="invite-player"/g)).toHaveLength(1);
  expect(html.includes('محتاجينك النهارده')).toBe(Boolean(count));
  expect(html.includes('<ol')).toBe(!count);
  expect(html).not.toContain('<details');
  expect(html).toContain('مساء الخير يا كابتن علي');
  expect(html.indexOf('الخميس')).toBeLessThan(html.indexOf('مساء الخير'));
});
it('renders three tiles, no empty side cards and an all-clear follow-up state', async () => {
  const html = await render([player]);
  expect(html).toContain('من 15 في باقتك');
  expect(html).toContain('+6% عن اللي فات');
  expect(html).toContain('جنيه');
  expect(html).not.toContain('ج.م');
  expect(html).not.toContain('هيخلص اشتراكهم');
  expect(html).not.toContain('لاعب جديد عايز ينضم');
  expect(html).toContain('كل حاجة ماشية تمام');
});
it('does not pretend failed reads are zero or all-clear', async () => {
  state.failed = true;
  const html = await render([player]);
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('كل حاجة ماشية تمام');
  expect(html).not.toContain('0 جنيه متأخرين');
});

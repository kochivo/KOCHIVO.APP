import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import type { RosterPlayer } from '@/features/roster';
import { WorkspaceHome } from './components/workspace-home';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar',
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/features/billing', () => ({ listRenewalRequests: async () => ({ data: [] }) }));
vi.mock('@/features/roster', () => ({ lastSeenLabel: () => 'recently', playerStatus: () => 'active' }));
vi.mock('@/features/captain-workspace/server', () => ({ MoneyOwedEntry: () => null, loadTasks: async () => ({ tasks: [] }) }));
vi.mock('@/features/captain-workspace', () => ({ LightDayEntry: () => null }));
vi.mock('@/features/inbox/server', () => ({ ageLabel: () => 'recently' }));
vi.mock('./data/workspace', () => ({ loadHomeSummary: async () => ({
  completedTasks: 0, adherence: 0, previousAdherence: 0, sessions: [], paid: 0,
  activity: [
    { id: 'e1', playerId: 'p1', name: 'Ali', kind: 'workout', at: '2026-11-12T09:00:00Z', title: 'Day 1', sets: 3 },
    { id: 'e2', playerId: 'p2', name: 'Mona', kind: 'weight', at: '2026-11-11T09:00:00Z', value: 70 },
  ],
}) }));
vi.mock('./data/home-followup', () => ({ loadHomeFollowup: async () => ({ requests: [] }) }));
vi.mock('./data/home-contacts', () => ({ loadHomeContacts: async () => new Map() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const players: RosterPlayer[] = [
  { playerId: 'p1', fullName: 'Ali', programTitle: 'Program', lastTrainingDate: '2026-11-12',
    accessUntil: '2026-12-05', startedOn: '2026-11-01', timezone: 'Africa/Cairo', openTasks: 0 },
  { playerId: 'p2', fullName: 'Mona', programTitle: 'Program', lastTrainingDate: '2026-11-11',
    accessUntil: '2026-12-05', startedOn: '2026-11-01', timezone: 'Africa/Cairo', openTasks: 0 },
];

it('keeps the middle column filled: recent activity sits with tasks and alerts, ahead of the player finder', async () => {
  const element = await WorkspaceHome({ data: Promise.resolve([{ players }, 'Ali', new Map()]), today: '2026-11-12',
    now: new Date('2026-11-12T10:00:00Z') });
  const html = await new Response(await renderToReadableStream(createElement(LocaleProvider, { locale: 'ar' }, element))).text();
  const activity = html.indexOf('آخر حاجات حصلت');
  const finder = html.indexOf('دوّر على لاعب');
  const alerts = html.indexOf('تنبيهات ذكية');
  expect(activity).toBeGreaterThan(-1);
  expect(finder).toBeGreaterThan(-1);
  expect(alerts).toBeGreaterThan(-1);
  // Middle column (tasks, alerts, activity) is the first grid child, so its panels
  // render before the side column's player finder in the document.
  expect(activity).toBeGreaterThan(alerts);
  expect(activity).toBeLessThan(finder);
  // The activity rows themselves travel with the panel.
  expect(html).toContain('Day 1');
});

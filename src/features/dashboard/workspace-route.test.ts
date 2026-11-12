import { createElement, Suspense } from 'react';
import type { ReactElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import CaptainPage from '@/app/[locale]/(captain)/captain/page';
import { DashboardScreen } from './index';
import { WorkspaceHome } from './server';
import { PlanBadge } from '@/features/billing';
import { CoachLinkCard, JoinRequests } from '@/features/coach-page';
import { LoadingState } from '@/ui';
vi.mock('./index', () => ({ DashboardScreen: () => null }));
vi.mock('./server', () => ({ WorkspaceHome: () => null }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar' }));
vi.mock('@/features/roster', () => ({ fetchRoster: async () => ({ players: [] }), fetchCaptainFirstName: async () => 'Ali' }));
vi.mock('@/features/billing', () => ({ PlanBadge: () => null }));
vi.mock('@/features/billing/server', () => ({ fetchDues: async () => new Map(), fetchPlanSummary: async () => null }));
vi.mock('@/features/coach-page', () => ({ CoachLinkCard: () => null, JoinRequests: () => null }));
vi.mock('@/ui', () => ({ LoadingState: () => null }));
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
type ScreenProps = { data: Promise<unknown>; plan: ReactElement<{ children: ReactElement<{ data: Promise<unknown> }> }> };
it.each([undefined, '', '0', 'true'])('preserves the complete legacy home tree for flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
  const tree = await CaptainPage() as ReactElement<{ children: ReactElement<ScreenProps> }>;
  const props = tree.props.children.props;
  expect(await props.data).toEqual([{ players: [] }, 'Ali', new Map()]);
  const planData = props.plan.props.children.props.data;
  expect(await planData).toEqual([null, 'ar']);
  expect(tree).toEqual(createElement(Suspense, { fallback: createElement(LoadingState, { variant: 'cards' }) },
    createElement(DashboardScreen, { data: props.data as Parameters<typeof DashboardScreen>[0]['data'], today: '2026-11-12',
      plan: createElement(Suspense, { fallback: null }, createElement(PlanBadge, { data: planData as Parameters<typeof PlanBadge>[0]['data'] })),
      coachLink: createElement(Suspense, { fallback: createElement(LoadingState) }, createElement(CoachLinkCard)),
      joinRequests: createElement(Suspense, { fallback: createElement(LoadingState) }, createElement(JoinRequests)),
    })));
});
it('renders the v6 home only for the enabled flag', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
  const tree = await CaptainPage() as ReactElement<{ children: ReactElement }>;
  expect(tree.props.children.type).toBe(WorkspaceHome);
});

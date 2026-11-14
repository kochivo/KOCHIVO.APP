import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RosterScreen as LegacyRoster } from '../components/roster-screen';
import { RosterScreen } from '../components/roster-screen-entry';
import type { RosterResult } from '../types';
import { loadRosterExtras } from '../data/v6-roster';
import { loadActivity } from './data/load-activity';

const state = vi.hoisted(() => ({ result: { players: [] } as RosterResult }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => [state.result, 'Ali'] }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: (loader: () => Promise<unknown>) => {
  const legacy = loader.toString().includes('roster-screen');
  return (props: Parameters<typeof LegacyRoster>[0]) => legacy ? createElement(LegacyRoster, props) : null;
} }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
vi.mock('@/features/coach-page', () => ({ JoinRequestsList: () => null }));
vi.mock('../data/archive-player', () => ({ archivePlayer: vi.fn() }));
vi.mock('../data/v6-roster', () => ({ loadRosterExtras: vi.fn() }));
vi.mock('./data/load-activity', () => ({ loadActivity: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, '', '0', 'true'])('keeps roster HTML byte-identical and skips v6 reads for flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  for (const result of [{ players: [] }, { error: 'Offline' }, { players: [{ playerId: 'p', fullName: 'Ali', accessUntil: '2026-12-12',
    startedOn: '2026-11-01', lastTrainingDate: '2026-11-12', programTitle: 'Full body', openTasks: 2 }] }] satisfies RosterResult[]) {
    state.result = result;
    const props = { data: Promise.resolve<[RosterResult, string]>([result, 'Ali']), today: '2026-11-12' };
    for (const locale of ['ar', 'en'] as const) {
      const wrap = (child: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));
      expect(wrap(await RosterScreen(props))).toBe(wrap(createElement(LegacyRoster, props)));
    }
  }
  expect(loadRosterExtras).not.toHaveBeenCalled();
  expect(loadActivity).not.toHaveBeenCalled();
});

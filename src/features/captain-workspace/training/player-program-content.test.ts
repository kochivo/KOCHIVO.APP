import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlayerProgramContent } from './player-program-content';
import { PlayerProgramSummaryEntry } from './player-program-summary-entry';
import { FileState } from '../player-file/file-state';

vi.mock('server-only', () => ({}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en' }));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo', getTimezone: async () => 'Africa/Cairo' }));
vi.mock('../player-file/file-header', () => ({ FileHeader: () => null }));
const state = vi.hoisted(() => ({ profile: vi.fn(), list: vi.fn(), read: vi.fn(), summary: vi.fn() }));
vi.mock('../player-file/profile-data', () => ({ readPlayerProfile: state.profile }));
vi.mock('../player-file/load-summary', () => ({ loadSummary: state.summary }));
vi.mock('@/features/programs/server', () => ({ readPlayerPrograms: state.list, readProgram: state.read }));
const plan = { id: 'active', player_id: 'player', title: 'Assigned', status: 'active', days: [] };
const load = () => PlayerProgramContent({ playerId: 'player', now: new Date('2026-11-14T10:00:00Z') });
beforeEach(() => {
  vi.clearAllMocks();
  state.profile.mockResolvedValue({ data: { name: 'Ali', intake: null, checkIns: [], program: null, nutrition: null } });
  state.list.mockResolvedValue({ data: [{ id: 'draft', status: 'draft' }, { id: 'active', status: 'active' }] });
  state.read.mockResolvedValue({ data: plan }); state.summary.mockResolvedValue({});
});
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
it('selects the active assignment even when a newer draft precedes it', async () => {
  const tree = await load();
  expect(state.read).toHaveBeenCalledWith('active');
  expect(nodes(tree).find(node => node.type === PlayerProgramSummaryEntry)?.props.program).toMatchObject({ id: 'active', startedOn: null, totalWeeks: null });
});
it('keeps an unassigned draft available without presenting it as the active program', async () => {
  state.list.mockResolvedValue({ data: [{ id: 'draft', status: 'draft' }] });
  const tree = await load();
  expect(state.read).not.toHaveBeenCalled();
  expect(nodes(tree).find(node => node.type === PlayerProgramSummaryEntry)?.props).toMatchObject({ program: null, draftId: 'draft' });
});
it.each(['list', 'read', 'summary'] as const)('keeps %s failures retryable instead of showing an empty program', async key => {
  if (key === 'summary') state.summary.mockRejectedValue(new Error('private failure'));
  else state[key].mockResolvedValue({ error: 'private failure' });
  const result = await load();
  expect(result.type).toBe(FileState);
  expect(result.props).toMatchObject({ error: true, href: '/captain/players/player/programs' });
});

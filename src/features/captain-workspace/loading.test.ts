import type { ReactElement } from 'react';
import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { WorkspaceContent } from './components/workspace-content';
import { WorkspacePlanEntry } from './components/workspace-plan-entry';
import { WorkspaceState } from './components/workspace-state';

const data = vi.hoisted(() => ({
  profile: vi.fn(), list: vi.fn(), load: vi.fn(),
}));
const input = { playerId: 'player', today: '2026-11-11' };
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en' }));
vi.mock('@/features/player-profile', () => ({ fetchPlayerProfile: data.profile }));
vi.mock('@/features/programs', () => ({ listPlayerPrograms: data.list, loadProgram: data.load }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not-found'); } }));

function find(tree: ReactElement, type: unknown): ReactElement<Record<string, unknown>> | undefined {
  if (tree.type === type) return tree as ReactElement<Record<string, unknown>>;
  const children = (tree.props as { children?: ReactElement[] }).children;
  for (const child of Children.toArray(children)) {
    if (isValidElement(child)) {
      const match = find(child, type);
      if (match) return match;
    }
  }
}
beforeEach(() => {
  vi.clearAllMocks();
  data.profile.mockResolvedValue({ data: { name: 'Ahmed', intake: null } });
  data.load.mockImplementation(async id => ({ data: { id, title: id, days: [] } }));
});
it('prefers an active program over a newer draft', async () => {
  data.list.mockResolvedValue({ data: [{ id: 'new-draft', status: 'draft' }, { id: 'active', status: 'active' }] });
  const tree = await WorkspaceContent(input);
  expect(find(tree, WorkspacePlanEntry)?.props.program).toMatchObject({ id: 'active' });
  const fallback = find(tree, WorkspacePlanEntry)?.props.fallback as ReactElement;
  expect(renderToStaticMarkup(fallback)).toContain('Loading player plan');
});
it('uses the latest draft in existing newest-first loading order and ignores archived plans', async () => {
  data.list.mockResolvedValue({ data: [{ id: 'archive', status: 'archived' }, { id: 'new-draft', status: 'draft' }, { id: 'old-draft', status: 'draft' }] });
  const tree = await WorkspaceContent(input);
  expect(find(tree, WorkspacePlanEntry)?.props.program).toMatchObject({ id: 'new-draft' });
});
it('shows an empty state when only archived programs exist', async () => {
  data.list.mockResolvedValue({ data: [{ id: 'archive', status: 'archived' }] });
  expect(find(await WorkspaceContent(input), WorkspaceState)?.props.kind).toBe('empty');
});
it.each(['profile', 'list', 'load'])('shows a retryable error for failed %s reads', async read => {
  data.list.mockResolvedValue({ data: [{ id: 'active', status: 'active' }] });
  data[read === 'list' ? 'list' : read === 'load' ? 'load' : 'profile'].mockResolvedValue({ error: true });
  const error = find(await WorkspaceContent(input), WorkspaceState);
  expect(error?.props.kind).toBe('error');
  expect(error?.props.retryHref).toBe('/captain/players/player/programs');
});
it('keeps unavailable or unauthorized players on the existing not-found path', async () => {
  data.profile.mockResolvedValue({ data: null });
  data.list.mockResolvedValue({ data: [] });
  await expect(WorkspaceContent(input)).rejects.toThrow('not-found');
});

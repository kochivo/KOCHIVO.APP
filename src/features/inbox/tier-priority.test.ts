import { expect, it } from 'vitest';
import { orderWorkspaceTasks } from './workspace-triage';
import type { WorkspaceItem } from './workspace-types';
it('places featured players first within their triage group, preserving the existing order otherwise', () => {
  const make = (id: string, featured: boolean): WorkspaceItem => ({ kind: 'request', id, player_name: id,
    created_at: '2026-11-01T00:00:00Z', reviewed_at: null, tier: { name: 'VIP', color: 'lime', is_featured: featured } });
  expect(orderWorkspaceTasks([make('a', false), make('b', true), make('c', true), make('d', false)],
    { history: [], dailyChecks: [] }, new Date('2026-11-02'), 'routine').map(i => i.id)).toEqual(['b', 'c', 'a', 'd']);
});

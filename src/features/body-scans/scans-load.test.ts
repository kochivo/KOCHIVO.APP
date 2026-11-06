import { beforeEach, expect, it, vi } from 'vitest';
import { listScans } from './data/scans';

const fixture = vi.hoisted(() => ({
  userId: 'captain',
  scans: [
    { id: 'player-scan', player_id: 'player', scan_date: '2026-10-01', weight_kg: 80 },
    { id: 'captain-scan', player_id: 'captain', scan_date: '2026-10-02', weight_kg: 95 },
  ],
  targets: [{ player_id: 'player', target_weight_kg: 75 }, { player_id: 'captain', target_weight_kg: 85 }],
}));

vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: fixture.userId } }, error: null }) },
  from: (table: string) => ({ select: () => ({ eq: (column: string, owner: string) => ({
    order: async () => ({ data: fixture.scans.filter(row => column === 'player_id' && row.player_id === owner), error: null }),
    maybeSingle: async () => ({ data: table === 'player_intake' ? fixture.targets.find(row => column === 'player_id' && row.player_id === owner) : null, error: null }),
  }) }) }),
}) }));

beforeEach(() => { fixture.userId = 'captain'; });

it('returns the selected player scans and target while a captain is authenticated', async () => {
  const result = await listScans('player');
  expect(result.scans.map(scan => scan.id)).toEqual(['player-scan']);
  expect(result.target).toBe(75);
});

it('uses the authenticated player only when no playerId was provided', async () => {
  fixture.userId = 'player';
  const result = await listScans();
  expect(result.scans.map(scan => scan.id)).toEqual(['player-scan']);
  expect(result.target).toBe(75);
});

it('does not substitute the captain data for an unknown selected player', async () => {
  expect(await listScans('unknown-player')).toEqual({ scans: [], target: null });
});

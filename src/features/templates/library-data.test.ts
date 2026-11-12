import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const state = vi.hoisted(() => ({ calls: [] as unknown[][], rows: [] as unknown[], error: null as null | object }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: (table: string) => {
    state.calls.push(['from', table]);
    const query = {
      select: (value: string) => { state.calls.push(['select', value]); return query; },
      eq: (...args: unknown[]) => { state.calls.push(['eq', ...args]); return query; },
      order: () => Promise.resolve({ data: state.rows, error: state.error }),
    };
    return query;
  },
}) }));
import { listLibraryTemplates } from './data/library';

beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.calls = []; state.rows = []; state.error = null; });
it('loads training metadata and distinct player usage together in one list query', async () => {
  state.rows = [{ id: 'plan', title: 'Plan', created_at: '2026-11-12', is_starter: false, status: 'draft',
    settings: { level: 'beginner', minutes: 30, equipment: 'gym' }, program_days: [{ is_rest_day: true }, { is_rest_day: false }],
    copies: [{ player_id: 'a', status: 'active' }, { player_id: 'a', status: 'draft' }, { player_id: 'b', status: 'archived' }] }];
  expect(await listLibraryTemplates('program')).toMatchObject({ data: [{ count: 1, uses: 1, level: 'beginner', minutes: 30, place: 'gym' }] });
  expect(state.calls.filter(call => call[0] === 'from')).toEqual([['from', 'programs']]);
  expect(state.calls).toContainEqual(['eq', 'captain_id', 'captain']);
  expect(state.calls).toContainEqual(['eq', 'is_template', true]);
});
it('loads meal counts, protein, cycles and usage in one list query', async () => {
  state.rows = [{ id: 'plan', title: 'Plan', created_at: '2026-11-12', is_starter: true, status: 'draft', target_protein: 150,
    meals: [{ id: 'meal', day_type: 'training' }], copies: [{ player_id: 'a', status: 'active' }] }];
  expect(await listLibraryTemplates('nutrition')).toMatchObject({ data: [{ count: 1, uses: 1, protein: 150, split: true }] });
  expect(state.calls.filter(call => call[0] === 'from')).toEqual([['from', 'nutrition_plans']]);
});
it('does not access the database with the flag off and returns query errors', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await listLibraryTemplates('program')).toHaveProperty('error');
  expect(state.calls).toEqual([]);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.error = { message: 'private details' };
  expect(await listLibraryTemplates('program')).toHaveProperty('error');
});

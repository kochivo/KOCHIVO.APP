import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const state = vi.hoisted(() => ({ calls: [] as unknown[][], rows: [] as unknown[], copies: [] as { source_template_id: string; player_id: string; status: string }[], error: null as null | object }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: (table: string) => {
    state.calls.push(['from', table]);
    let recursive = false;
    let assignments = false;
    const query = {
      select: (value: string) => { recursive = value.includes('copies:'); state.calls.push(['select', value]); return query; },
      eq: (...args: unknown[]) => { state.calls.push(['eq', ...args]); return query; },
      in: (...args: unknown[]) => { assignments = true; state.calls.push(['in', ...args]); return query; },
      neq: (...args: unknown[]) => { state.calls.push(['neq', ...args]); return query; },
      range: (start: number, end: number) => Promise.resolve({ data: state.copies.slice(start, end + 1), error: state.error }),
      order: () => assignments ? query : Promise.resolve({ data: state.rows, error: state.error ?? (recursive ? { code: 'PGRST200', message: 'Could not find a relationship in the schema cache' } : null) }),
    };
    return query;
  },
}) }));
import { listLibraryTemplates } from './data/library';
afterEach(() => vi.unstubAllEnvs());

beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.calls = []; state.rows = []; state.copies = []; state.error = null; });
it('loads training metadata without the ambiguous recursive embed and batches distinct player usage', async () => {
  state.copies = [{ source_template_id: 'plan', player_id: 'a', status: 'active' }, { source_template_id: 'plan', player_id: 'a', status: 'draft' }];
  state.rows = [{ id: 'plan', title: 'Plan', created_at: '2026-11-12', is_starter: false, status: 'draft',
    settings: { level: 'beginner', minutes: 30, equipment: 'gym' }, program_days: [{ is_rest_day: true }, { is_rest_day: false }],
    copies: [{ player_id: 'a', status: 'active' }, { player_id: 'a', status: 'draft' }, { player_id: 'b', status: 'archived' }] }];
  expect(await listLibraryTemplates('program')).toMatchObject({ data: [{ count: 1, uses: 1, level: 'beginner', minutes: 30, place: 'gym' }] });
  expect(state.calls.filter(call => call[0] === 'from')).toEqual([['from', 'programs'], ['from', 'programs']]);
  expect(state.calls).toContainEqual(['in', 'source_template_id', ['plan']]);
  expect(state.calls).toContainEqual(['neq', 'status', 'archived']);
  expect(state.calls).toContainEqual(['eq', 'captain_id', 'captain']);
  expect(state.calls).toContainEqual(['eq', 'is_template', true]);
});
it('loads meal counts, protein, cycles and batched usage without a recursive embed', async () => {
  state.copies = [{ source_template_id: 'plan', player_id: 'a', status: 'active' }];
  state.rows = [{ id: 'plan', title: 'Plan', created_at: '2026-11-12', is_starter: true, status: 'draft', target_protein: 150,
    meals: [{ id: 'meal', day_type: 'training' }], copies: [{ player_id: 'a', status: 'active' }] }];
  expect(await listLibraryTemplates('nutrition')).toMatchObject({ data: [{ count: 1, uses: 1, protein: 150, split: true }] });
  expect(state.calls.filter(call => call[0] === 'from')).toEqual([['from', 'nutrition_plans'], ['from', 'nutrition_plans']]);
});
it('returns an empty library without a usage query', async () => {
  expect(await listLibraryTemplates('program')).toEqual({ data: [] });
  expect(state.calls.filter(call => call[0] === 'from')).toHaveLength(1);
});
it('does not access the database with the flag off and returns query errors', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await listLibraryTemplates('program')).toHaveProperty('error');
  expect(state.calls).toEqual([]);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.error = { message: 'private details' };
  expect(await listLibraryTemplates('program')).toHaveProperty('error');
});
it('counts assignments beyond the API row limit without truncating or double-counting players', async () => {
  state.rows = [{ id: 'plan', title: 'Plan', created_at: '2026-11-12', is_starter: false, status: 'draft',
    settings: {}, program_days: [] }];
  state.copies = Array.from({ length: 1001 }, (_, index) => ({ source_template_id: 'plan', player_id: String(index), status: 'active' }));
  state.copies.push({ source_template_id: 'plan', player_id: '0', status: 'draft' });
  expect(await listLibraryTemplates('program')).toMatchObject({ data: [{ count: 0, uses: 1001 }] });
});

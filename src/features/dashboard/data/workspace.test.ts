import { expect, it, vi, beforeEach } from 'vitest';
type Result = { data: unknown; error: { message: string } | null };
const state = vi.hoisted(() => ({ rows: {} as Record<string, Result>, calls: [] as string[] }));
class Query implements PromiseLike<Result> {
  constructor(private result: Result) {}
  select() { return this; } eq() { return this; } is() { return this; } not() { return this; }
  gte() { return this; } lt() { return this; } lte() { return this; } order() { return this; } limit() { return this; }
  then<T = Result, R = never>(resolve?: ((value: Result) => T | PromiseLike<T>) | null, reject?: ((reason: unknown) => R | PromiseLike<R>) | null) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  from: (table: string) => { state.calls.push(table); return new Query(state.rows[table] ?? { data: [], error: null }); },
  rpc: () => new Query({ data: [], error: null }),
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
}) }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/features/billing/server', () => ({ fetchPlanSummary: async () => ({ plan: { player_limit: 5 } }) }));
import { loadHomeActivity, loadHomeSummary } from './workspace';
beforeEach(() => { state.rows = {}; state.calls = []; });
it('merges all three real event kinds, ignores absent events and caps at the latest five with one list query', async () => {
  state.rows.coach_clients = { error: null, data: [{ player_id: 'a', profiles: { full_name: 'Ali',
    workout_sessions: [{ id: 'w', completed_at: '2026-11-12T12:00:00Z', program_days: { title: 'Day 1' } }],
    form_requests: [{ id: 'f', answered_at: '2026-11-12T11:00:00Z', forms: { title: 'Weekly' } }],
    check_ins: Array.from({ length: 5 }, (_, index) => ({ id: `c${index}`, created_at: `2026-11-1${index}T10:00:00Z`, body_weight_kg: index ? 84 : null })),
  } }] };
  const result = await loadHomeActivity('captain');
  expect(result).toHaveLength(5);
  expect(result.map(event => event.id)).toEqual(['c4', 'c3', 'w', 'f', 'c2']);
  expect(result[2]).toMatchObject({ kind: 'workout', name: 'Ali', title: 'Day 1' });
  expect(state.calls).toEqual(['coach_clients']);
});
it('returns timezone-aware payments, weighted adherence and active meal-plan players', async () => {
  state.rows.player_payments = { error: null, data: [{ created_at: '2026-10-31T22:30:00Z', amount_egp: 150 }] };
  state.rows.nutrition_plans = { error: null, data: [{ player_id: 'a' }] };
  state.rows.programs = { error: null, data: [{ player_id: 'a', program_days: [{ id: 'd', is_rest_day: false }, { id: 'rest', is_rest_day: true }] }] };
  state.rows.workout_sessions = { error: null, data: [{ player_id: 'a', program_day_id: 'd', training_date: '2026-11-10' }, { player_id: 'a', program_day_id: 'd', training_date: '2026-11-10' }] };
  const result = await loadHomeSummary(new Date('2026-11-12T10:00:00Z'));
  expect(result).toMatchObject({ paid: 150, adherence: 100, limit: 5, today: '2026-11-12' });
  expect(result.mealPlanPlayers).toEqual(new Set(['a']));
});
it('surfaces a failed list read instead of showing a false zero', async () => {
  state.rows.player_payments = { data: null, error: { message: 'Unavailable' } };
  await expect(loadHomeSummary(new Date('2026-11-12T10:00:00Z'))).rejects.toEqual({ message: 'Unavailable' });
});

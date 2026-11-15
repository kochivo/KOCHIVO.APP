import { expect, it, vi, beforeEach } from 'vitest';
import type * as BillingServer from '@/features/billing/server';
type Result = { data: unknown; error: { message: string } | null; count?: number };
const state = vi.hoisted(() => ({ rows: {} as Record<string, Result>, calls: [] as string[], sessionUntil: '' }));
class Query implements PromiseLike<Result> {
  constructor(private result: Result) {}
  select() { return this; } eq() { return this; } is() { return this; } not() { return this; }
  gte() { return this; } lt() { return this; }
  lte(column: string, value: string) { if (column === 'training_date') state.sessionUntil = value; return this; }
  order() { return this; } limit() { return this; }
  range(from: number, to: number) {
    this.result = { ...this.result, data: Array.isArray(this.result.data) ? this.result.data.slice(from, to + 1) : this.result.data };
    return this;
  }
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
vi.mock('@/features/billing/server', async original => ({ ...await original<typeof BillingServer>(),
  fetchPlanSummary: async () => ({ plan: { player_limit: 5 } }) }));
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
it('counts completed reviews and collected instalments in the same real home summary', async () => {
  state.rows.check_ins = { data: [], error: null, count: 2 };
  state.rows.form_checks = { data: [], error: null, count: 1 };
  state.rows.form_requests = { data: [], error: null, count: 3 };
  state.rows.payment_collections = { error: null, data: [{ created_at: '2026-11-12T08:00:00Z', amount_egp: 75 }] };
  const result = await loadHomeSummary(new Date('2026-11-12T10:00:00Z'));
  expect(result).toMatchObject({ completedTasks: 6, paid: 75 });
});
it('reads beyond the server page limit so the chart never silently drops sessions', async () => {
  state.rows.workout_sessions = { data: Array.from({ length: 1001 }, (_, index) => ({
    player_id: `p${index}`, program_day_id: null, training_date: '2026-11-12',
  })), error: null };
  expect((await loadHomeSummary(new Date('2026-11-12T10:00:00Z'))).sessions).toHaveLength(1001);
  expect(state.calls.filter(table => table === 'workout_sessions')).toHaveLength(2);
});
it('includes ahead-zone Saturday sessions while the captain is still on Friday', async () => {
  await loadHomeSummary(new Date('2026-11-13T20:30:00Z'));
  expect(state.sessionUntil).toBe('2026-11-14');
});

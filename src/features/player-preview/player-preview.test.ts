import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activityWeek } from './week';
import { fetchPlayerPreview } from './data/preview';
import { pickTodayDay } from '@/features/player-home';

const { server, from, rpc, results } = vi.hoisted(() => ({
  server: vi.fn(), from: vi.fn(), rpc: vi.fn(), results: new Map<string, { data: unknown; error: unknown }>(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: server }));
const player = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.clearAllMocks(); results.clear();
  rpc.mockResolvedValue({ data: true, error: null });
  from.mockImplementation((table: string) => {
    const result = results.get(table) ?? { data: null, error: null };
    const query = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(),
      not: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    for (const key of ['select', 'eq', 'gte', 'lte', 'not', 'in', 'order', 'limit', 'maybeSingle'] as const) query[key].mockReturnValue(query);
    return query;
  });
  server.mockResolvedValue({ from, rpc });
});

describe('activityWeek', () => {
  it('matches the Saturday-first player strip across a month boundary', () => {
    expect(activityWeek('2026-11-03', [], []).map((day) => day.date)).toEqual([
      '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
    ]);
    expect(activityWeek('2026-10-31', [], [])[0]?.date).toBe('2026-10-31');
  });
  it('counts only completed sessions and non-deleted eaten meals', () => {
    const week = activityWeek('2026-11-03', [
      { training_date: '2026-11-02', completed_at: 'done' },
      { training_date: '2026-11-03', completed_at: null },
    ], [
      { log_date: '2026-11-02', completed_at: 'done', deleted_at: null },
      { log_date: '2026-11-02', completed_at: 'done', deleted_at: null },
      { log_date: '2026-11-02', completed_at: null, deleted_at: null },
      { log_date: '2026-11-02', completed_at: 'done', deleted_at: 'deleted' },
    ]);
    expect(week[2]).toEqual({ date: '2026-11-02', trained: true, mealsEaten: 2 });
    expect(week[3]).toEqual({ date: '2026-11-03', trained: false, mealsEaten: 0 });
  });
});

describe('fetchPlayerPreview', () => {
  it('retains completed feedback when its program day was deleted', async () => {
    results.set('profiles', { data: { full_name: 'Ali' }, error: null });
    const session = { id: 'orphan', program_day_id: null, training_date: '2026-11-03',
      completed_at: '2026-11-03T10:00:00Z', session_rpe: 9, player_note: 'tired' };
    results.set('workout_sessions', { data: [session], error: null });
    const result = await fetchPlayerPreview(player, '2026-11-03');
    expect(result.data?.sessions).toEqual([]);
    expect(result.data?.feedbackSessions).toEqual([session]);
  });
  it('validates UUID and actual calendar dates before creating a client', async () => {
    for (const [id, date] of [['bad', '2026-11-03'], [player, '2026-02-30'], [player, '03-11-2026']]) {
      expect(await fetchPlayerPreview(id ?? '', date ?? '')).toHaveProperty('error');
    }
    expect(server).not.toHaveBeenCalled();
  });
  it('returns null when RLS hides the player and program', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await fetchPlayerPreview(player, '2026-11-03')).toEqual({ data: null });
    expect(from).not.toHaveBeenCalled();
  });
  it('keeps the player previewable with a null program so the empty state can show', async () => {
    results.set('profiles', { data: { full_name: 'أحمد' }, error: null });
    expect(await fetchPlayerPreview(player, '2026-11-03')).toMatchObject({ data: { name: 'أحمد', program: null, nutrition: null } });
  });
  it('maps sorted snapshots and retains older completions for rotation', async () => {
    results.set('profiles', { data: { full_name: 'أحمد' }, error: null });
    results.set('player_intake', { data: { training_days: [1, 3] }, error: null });
    results.set('programs', { data: { id: 'program', title: 'برنامج', notes: null, settings: {},
      program_days: [{ id: 'second', title: 'ظهر', position: 2, program_exercises: [] },
        { id: 'first', title: 'صدر', position: 1, program_exercises: [] }] }, error: null });
    results.set('nutrition_plans', { data: { id: 'plan', title: 'أكل', target_kcal: 2000,
      target_protein: null, target_carbs: null, target_fat: null, meals: [] }, error: null });
    results.set('workout_sessions', { data: [{ id: 'old', program_day_id: 'first',
      training_date: '2026-10-20', completed_at: '2026-10-20T09:00:00Z' }], error: null });
    const result = await fetchPlayerPreview(player, '2026-11-03');
    expect(result.data?.program?.days.map((day) => day.id)).toEqual(['first', 'second']);
    expect(result.data?.nutrition).toMatchObject({ plan_id: 'plan', targets: { kcal: 2000 } });
    if (!result.data?.program) throw new Error('Missing preview fixture');
    expect(pickTodayDay(result.data.program, result.data.sessions, '2026-11-03')?.id).toBe('second');
    expect(result.data).toHaveProperty('todayDay.id', 'second');
    expect(result.data.week.every((day) => !day.trained)).toBe(true);
    results.delete('nutrition_plans');
    expect((await fetchPlayerPreview(player, '2026-11-03')).data?.nutrition).toBeNull();
  });
  it('maps database and thrown failures to Arabic without exposing details', async () => {
    results.set('programs', { data: null, error: { message: 'private SQL' } });
    expect(await fetchPlayerPreview(player, '2026-11-03')).toEqual({ error: 'المعاينة متحمّلتش. جرّب تاني' });
    server.mockRejectedValue(new Error('private network'));
    expect(await fetchPlayerPreview(player, '2026-11-03')).toEqual({ error: 'المعاينة متحمّلتش. جرّب تاني' });
  });
});

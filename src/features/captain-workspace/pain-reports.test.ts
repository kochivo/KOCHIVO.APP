import { expect, it, vi } from 'vitest';
import { answerPain, loadPainReports } from './data/pain-reports';

const fixture = vi.hoisted(() => {
  const filters: [string, string, string][] = [];
  const report = { id: 'report', player_id: 'player', captain_id: 'captain', exercise_id: 'recorded-swap',
    program_exercise_id: 'slot', session_id: null, set_index: 2, area: 'knee_r', side_view: 'front', severity: 4,
    kind: 'sharp', status: 'open', reply: null, answered_at: null, created_at: '2026-11-15T10:00:00Z' };
  const rpcError = { current: null as { message: string; code: string } | null };
  const client = { rpc: async (name: string) => ({ data: name === 'pain_repeat_count' ? 2 : null, error: name === 'answer_pain' ? rpcError.current : null }),
    from: (table: string) => {
      const query = { select: () => query, eq: (key: string, value: string) => { filters.push([table,key,value]); return query; },
        order: () => query, limit: () => query,
        abortSignal: async () => ({ data: [report], error: null }),
        single: async () => ({ data: { full_name: 'Mona' }, error: null }),
        maybeSingle: async () => ({ data: table === 'exercises' ? { name_ar: 'البديل', name_en: 'Recorded swap' }
          : { exercises: { name_ar: 'الأصلي', name_en: 'Current program exercise' } }, error: null }) };
      return query;
    } };
  return { client, filters, rpcError };
});
it.each([
  ['No safe alternative', 'noSafeSwap'],
  ['Active exercise required', 'inactiveExercise'],
  ['Connection failed', 'failed'],
])('maps answer_pain error %s to %s', async (message, key) => {
  fixture.rpcError.current = { message, code: '22023' };
  try { await expect(answerPain('report', 'swap_2w')).rejects.toMatchObject({ key }); }
  finally { fixture.rpcError.current = null; }
});
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => fixture.client }));
it('shows the exercise actually reported even after the program slot changes', async () => {
  const reports = await loadPainReports('player','en');
  expect(reports[0]).toMatchObject({ player_name: 'Mona', exercise_name: 'Recorded swap', repeat_count: 2 });
  expect(fixture.filters).toContainEqual(['exercises','id','recorded-swap']);
});

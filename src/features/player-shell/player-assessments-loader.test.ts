import { beforeEach, expect, it, vi } from 'vitest';
import { loadPlayerAssessmentHistory } from './data/player-assessments';

const state = vi.hoisted(() => ({ user: 'player' as string | null, error: null as Error | null,
  calls: [] as { table: string; method: string; args: unknown[] }[],
  due: [{ id: 'due', due_at: null, forms: { title: 'Due' } }],
  past: [{ id: 'past', form_id: 'form', answered_at: '2026-11-10T12:00:00Z', reviewed_at: '2026-11-11T12:00:00Z', captain_reply: 'Keep going', forms: { title: 'Monthly' } }],
  questions: [{ id: 'weight', form_id: 'form', type: 'number', maps_to: 'weight', label_ar: 'الوزن', label_en: 'Weight', position: 0 }],
  answers: [{ id: 'answer', request_id: 'past', question_id: 'weight', value: 82.4 }],
}));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null }, error: null }) },
  from: (table: string) => {
    let answered = false;
    const query = {
      then: (resolve: (value: unknown) => unknown) => resolve({ error: state.error,
        data: table === 'form_requests' ? answered ? state.past : state.due : table === 'form_questions' ? state.questions : state.answers }),
    };
    for (const method of ['select', 'eq', 'is', 'not', 'order', 'limit', 'in', 'range']) {
      Object.assign(query, { [method]: (...args: unknown[]) => {
        state.calls.push({ table, method, args });
        if (method === 'not') answered = true;
        return query;
      } });
    }
    return query;
  },
}) }));
beforeEach(() => { state.calls = []; state.error = null; state.user = 'player'; });
it('loads due and answered rows under the player session and derives a real numeric headline', async () => {
  const result = await loadPlayerAssessmentHistory();
  expect(result.due).toEqual(state.due);
  expect(result.past[0]).toMatchObject({ id: 'past', answered_at: '2026-11-10T12:00:00Z',
    reviewed_at: '2026-11-11T12:00:00Z', captain_reply: 'Keep going',
    headline: { value: 82.4, labelAr: 'الوزن', labelEn: 'Weight' } });
  expect(state.calls.filter(c => c.table === 'form_requests' && c.method === 'eq'))
    .toEqual([expect.objectContaining({ args: ['player_id', 'player'] }), expect.objectContaining({ args: ['player_id', 'player'] })]);
  expect(state.calls).toContainEqual({ table: 'form_requests', method: 'not', args: ['answered_at', 'is', null] });
  expect(state.calls).toContainEqual({ table: 'form_answers', method: 'in', args: ['request_id', ['past']] });
});
it('does not invent a headline when a numeric answer is absent', async () => {
  const original = state.answers;
  state.answers = [];
  try { expect((await loadPlayerAssessmentHistory()).past[0]?.headline).toBeNull(); }
  finally { state.answers = original; }
});
it('keeps a recorded zero as a real headline', async () => {
  const original = state.answers;
  state.answers = [{ ...original[0], id: 'zero', request_id: 'past', question_id: 'weight', value: 0 }];
  try { expect((await loadPlayerAssessmentHistory()).past[0]?.headline?.value).toBe(0); }
  finally { state.answers = original; }
});
it('returns an empty past section without querying questions or answers', async () => {
  const original = state.past;
  state.past = [];
  try {
    expect((await loadPlayerAssessmentHistory()).past).toEqual([]);
    expect(state.calls.every(call => call.table === 'form_requests')).toBe(true);
  } finally { state.past = original; }
});
it('propagates read failures instead of showing an empty history', async () => {
  state.error = new Error('Read denied');
  await expect(loadPlayerAssessmentHistory()).rejects.toThrow('Read denied');
});
it('requires a session before querying player data', async () => {
  state.user = null;
  await expect(loadPlayerAssessmentHistory()).rejects.toThrow('Missing session');
  expect(state.calls).toEqual([]);
});

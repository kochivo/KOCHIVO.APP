import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadRosterExtras } from './v6-roster';

const fake = vi.hoisted(() => ({ from: vi.fn(), roster: vi.fn(), plan: vi.fn(), requests: vi.fn(), failed: false,
  checkins: [] as { id: string; created_at: string; body_weight_kg: number | null; waist_cm: null; notes: null }[],
  forms: [] as { id: string; answered_at: string; forms: { form_questions: { id: string; maps_to: string }[] };
    form_answers: { question_id: string; value: number }[] }[],
  intakeAt: '2026-10-01T12:00:00Z',
}));
const now = new Date('2026-11-17T15:00:00Z');
vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ rosterClient: async () => ({ from: fake.from }) }));
vi.mock('./roster', () => ({ fetchRoster: fake.roster }));
vi.mock('@/features/billing/server', () => ({ fetchPlanSummary: fake.plan }));
vi.mock('@/features/coach-page', () => ({ loadJoinRequests: fake.requests }));
beforeEach(() => {
  vi.clearAllMocks(); fake.failed = false; fake.checkins = []; fake.forms = [];
  fake.intakeAt = '2026-10-01T12:00:00Z';
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  fake.roster.mockResolvedValue({ players: Array.from({ length: 100 }, (_, i) => ({ playerId: `p${i}` })) });
  fake.plan.mockResolvedValue({ plan: { player_limit: 120 }, used: 100 });
  fake.requests.mockResolvedValue({ data: [{ id: 'r', full_name: 'Mona' }] });
  fake.from.mockImplementation((table: string) => {
    const result = { data: table === 'profiles' ? [{ id: 'p0', check_ins: fake.checkins, form_requests: fake.forms }]
      : table === 'player_intake' ? [{ player_id: 'p0', weight_kg: 80, target_weight_kg: 75, experience: 'new', created_at: fake.intakeAt, updated_at: null, completed_at: null }]
      : [{ player_id: 'p0' }], error: fake.failed ? new Error('Read failed') : null };
    const query = { select: () => query, in: () => query, order: () => query, limit: () => query, not: () => query,
      eq: () => Promise.resolve(result), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  });
});
afterEach(() => vi.unstubAllEnvs());
it('enriches 100 rows with bulk reads and uses actual plan capacity', async () => {
  const data = await loadRosterExtras(now);
  expect(data.free).toBe(20);
  expect(data.meta?.p0).toEqual({ food: true, weight: 80, target: 75, experience: 'new' });
  expect(data.requests?.[0]?.full_name).toBe('Mona');
  expect(fake.from).toHaveBeenCalledTimes(3);
});
it('uses the latest answered weight and ignores blank and older check-ins', async () => {
  fake.checkins = [
    { id: 'blank', created_at: '2026-11-17T12:00:00Z', body_weight_kg: null, waist_cm: null, notes: null },
    { id: 'latest', created_at: '2026-11-16T12:00:00Z', body_weight_kg: 66, waist_cm: null, notes: null },
    { id: 'old', created_at: '2026-09-01T12:00:00Z', body_weight_kg: 90, waist_cm: null, notes: null },
  ];
  expect((await loadRosterExtras(now)).meta?.p0?.weight).toBe(66);
});
it('uses mapped form weight and keeps a newer intake ahead of older readings', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  fake.forms = [{ id: 'answer', answered_at: '2026-11-16T12:00:00Z',
    forms: { form_questions: [{ id: 'weight', maps_to: 'weight' }] }, form_answers: [{ question_id: 'weight', value: 66 }] }];
  expect((await loadRosterExtras(now)).meta?.p0?.weight).toBe(66);
  fake.intakeAt = '2026-11-17T12:00:00Z';
  expect((await loadRosterExtras(now)).meta?.p0?.weight).toBe(80);
});
it('does not label missing nutrition from a failed or partial metadata read', async () => {
  fake.failed = true;
  expect(await loadRosterExtras(now)).toEqual({ error: true });
});
it('reports unavailable plan limits instead of inventing free places', async () => {
  fake.plan.mockResolvedValue(null);
  expect(await loadRosterExtras(now)).toEqual({ error: true });
  expect(fake.from).not.toHaveBeenCalled();
});

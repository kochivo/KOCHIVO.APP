import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo', getPlayerTimezone: vi.fn(async () => 'America/New_York') }));
import { getPlayerTimezone } from '@/core/timezone/server';
import { prepareSwap } from './data/swap';
import { executeIntent } from './data/execute';
import { verifyApproval } from './data/approval';
import type { KoActor } from './data/account';

function actorWith(injuries: string[]) {
  const tags = [
    { exercise_id: 'source', pattern: 'elbow_extension', stress: [], exercises: { name_en: 'Cable pushdown', name_ar: null, body_part: 'upper arms', equipment: 'cable' } },
    { exercise_id: 'deadlift', pattern: 'elbow_extension', stress: ['lower_back'], exercises: { name_en: 'Deadlift', name_ar: null, body_part: 'upper arms', equipment: 'barbell' } },
    { exercise_id: 'curl', pattern: 'elbow_flexion', stress: [], exercises: { name_en: 'Biceps curl', name_ar: null, body_part: 'upper arms', equipment: 'dumbbell' } },
    { exercise_id: 'safe', pattern: 'elbow_extension', stress: [], exercises: { name_en: 'Safe extension', name_ar: null, body_part: 'upper arms', equipment: 'dumbbell' } },
  ];
  const from = vi.fn((table: string) => {
    const query = { select: () => query, eq: () => query, order: () => query,
      range: async () => ({ data: tags, error: null }),
      maybeSingle: async () => ({ data: table === 'player_intake' ? { injuries } : { program_days: [{ title: 'Day',
        program_exercises: [{ id: 'pe', exercise_id: 'source', exercises: tags[0]?.exercises }] }] }, error: null }),
    };
    return query;
  });
  return { id: 'player', role: 'player', db: { from } } as unknown as KoActor;
}
it.each(['injury', 'discomfort'] as const)('respects recorded lower-back injuries for %s requests', async reason => {
  const result = await prepareSwap(actorWith(['lower_back']), 'Cable pushdown', 'knee', 'en', reason);
  expect(result.payload?.options).toEqual(['safe']);
});
it('keeps the movement pattern and injury safety when equipment is busy', async () => {
  const result = await prepareSwap(actorWith(['lower_back']), 'Cable pushdown', undefined, 'en', 'busy');
  expect(result.text).toContain('Safe extension');
  expect(result.text).not.toContain('Biceps curl');
  expect(result.text).not.toContain('Deadlift');
});
it('signs the New York player date when the Cairo captain is on the next day', async () => {
  const now = Date.parse('2026-11-16T23:30:00Z');
  const secret = 'audit-test-secret-12345678901234567890';
  const actor = { id: '00000000-0000-7000-8000-000000000001', role: 'captain' } as KoActor;
  const playerId = '00000000-0000-7000-8000-000000000002';
  const reply = await executeIntent(actor, { kind: 'send_reminder', args: {} }, 'en', secret, now, { id: playerId, name: 'Player' });
  expect(reply.kind).toBe('confirm');
  if (reply.kind !== 'confirm') throw new Error('Expected approval');
  expect(verifyApproval(reply.token, actor.id, now, secret)?.payload).toEqual({ date: '2026-11-16' });
  expect(getPlayerTimezone).toHaveBeenCalledWith(playerId);
});

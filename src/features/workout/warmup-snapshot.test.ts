import { expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { mapProgramSnapshot, type ProgramResponse } from '@/features/player-home';
vi.mock('server-only', () => ({}));

// The response mapper is tested here because preserving its warm-up field is part of T-199's approved scope.
const program: ProgramResponse = { id: 'p', title: 'Plan', notes: null, settings: {},
  program_days: [{ id: 'd', title: 'Day', position: 1, program_exercises: [] }] };
it('normalizes an older server response to an empty warm-up', () => {
  expect(mapProgramSnapshot(program, [], 'player').days[0]?.warmup).toEqual({ items: [], ramp: false });
});
it('caches the full warm-up with the same program snapshot for offline reads', async () => {
  const db = new KochivoDB('warmup-snapshot');
  const warmup = { items: [{ id: '00000000-0000-4000-8000-000000000001', name: 'عجلة خفيفة', amount: 5, unit: 'min' as const }], ramp: true };
  try {
    const day = program.program_days[0];
    if (!day) throw new Error('Fixture day missing');
    const snapshot = mapProgramSnapshot({ ...program, program_days: [{ ...day, warmup }] }, [], 'player');
    await db.program_snapshot.put(snapshot);
    expect((await db.program_snapshot.get('active'))?.days[0]?.warmup).toEqual(warmup);
    expect(await db.outbox.count()).toBe(0);
  } finally { await db.delete(); }
});

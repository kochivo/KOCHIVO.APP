import { expect, it, vi } from 'vitest';
import type * as React from 'react';
import { addWarmupItem, emptyWarmup, removeWarmupItem, setRamp, useTrainingAutosave } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import { editWarmup } from './editor-draft';

vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => [initial, () => undefined], useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (callback: unknown) => callback, useEffect: () => undefined,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => () => 'Error' }));
const write = vi.hoisted(() => vi.fn());
vi.mock('@/features/programs/data/program-io', () => ({ saveProgram: write }));
const initial: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'draft', days: [{
  id: 'd', program_id: 'p', title: 'Push', position: 1, warmup: emptyWarmup(), exercises: [],
}] };
it('flushes warm-up add, ramp toggle, removal and a failed save retry through the real autosave queue', async () => {
  write.mockReset(); write.mockResolvedValue({ ok: true, data: true });
  const autosave = useTrainingAutosave(initial);
  const item = { id: '019ab800-0000-7000-8000-000000000001', name: 'Walk', amount: 5, unit: 'min' as const };
  const change = (operation: (warmup: ReturnType<typeof emptyWarmup>) => ReturnType<typeof emptyWarmup>) => autosave.update(current => {
    const day = current.days[0]; if (!day) throw new Error('Missing fixture');
    return editWarmup(current, day.id, operation(day.warmup));
  });
  change(warmup => addWarmupItem(warmup, item));
  expect(await autosave.flush()).toBe(true);
  expect(write.mock.calls[0]?.[0].days[0].warmup).toEqual({ items: [item], ramp: false });
  change(warmup => setRamp(warmup, true));
  expect(await autosave.flush()).toBe(true);
  expect(write.mock.calls[1]?.[0].days[0].warmup).toEqual({ items: [item], ramp: true });
  change(warmup => removeWarmupItem(warmup, item.id));
  write.mockResolvedValueOnce({ ok: false, error: 'offline' });
  expect(await autosave.flush()).toBe(false);
  expect(await autosave.flush()).toBe(true);
  expect(write.mock.calls[3]?.[0].days[0].warmup).toEqual({ items: [], ramp: true });
  expect(initial.days[0]?.warmup).toEqual({ items: [], ramp: false });
});

import { expect, it } from 'vitest';
import { createSaveQueue } from './autosave';

it('serializes writes and flushes newer edits before send', async () => {
  let release: (() => void) | undefined;
  const writes: number[] = [];
  const queue = createSaveQueue(async (value: number) => {
    writes.push(value);
    if (value === 1) await new Promise<void>(resolve => { release = resolve; });
    return { ok: true as const };
  });
  const first = queue.save(1);
  const second = queue.save(2);
  await Promise.resolve();
  expect(writes).toEqual([1]);
  release?.();
  await Promise.all([first, second]);
  expect(writes).toEqual([1, 2]);
});

it('allows retry after a failed write', async () => {
  let calls = 0;
  const queue = createSaveQueue(async () => ++calls === 1 ? { ok: false as const, error: 'offline' } : { ok: true as const });
  expect((await queue.save(1)).ok).toBe(false);
  expect((await queue.save(1)).ok).toBe(true);
});

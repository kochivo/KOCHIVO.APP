import { expect, it } from 'vitest';
import { applyOptimistic } from './optimistic';

it('publishes immediately and reconciles the server value', async () => {
  let value = 'before';
  let confirm: (value: string) => void = () => {};
  const request = new Promise<string>(resolve => { confirm = resolve; });
  const operation = applyOptimistic(value, {
    apply: () => { value = 'preview'; },
    rollback: previous => { value = previous; },
    reconcile: result => { value = result; },
  }, () => request);
  expect(value).toBe('preview');
  confirm('server');
  await operation;
  expect(value).toBe('server');
});

it.each(['rejection', 'throw'])('restores the exact snapshot on %s', async mode => {
  const before = { date: '2026-11-03', due: 200 };
  let value = before;
  const failure = new Error('denied');
  await expect(applyOptimistic(before, {
    apply: () => { value = { date: '2026-12-03', due: 0 }; },
    rollback: previous => { value = previous; },
  }, () => { if (mode === 'throw') throw failure; return Promise.reject(failure); })).rejects.toBe(failure);
  expect(value).toBe(before);
});

import { expect, it } from 'vitest';
import { createReviewLock } from './review-lock';

it('blocks a second form review until the first review settles, including failure', async () => {
  const lock = createReviewLock();
  let release: (value: boolean) => void = () => {};
  const first = lock.run(() => new Promise<boolean>(resolve => { release = resolve; }));
  expect(lock.pending()).toBe(true);
  let secondRan = false;
  expect(await lock.run(async () => { secondRan = true; return true; })).toBe(false);
  expect(secondRan).toBe(false);
  release(false);
  expect(await first).toBe(false);
  expect(lock.pending()).toBe(false);
  expect(await lock.run(async () => true)).toBe(true);
});

import { expect, it, vi } from 'vitest';
import { subscribeTaskCount } from './task-count-subscription';

class Visibility extends EventTarget { visibilityState: DocumentVisibilityState = 'visible'; }
function fixture() {
  const focus = new EventTarget(), visibility = new Visibility();
  const counts: number[] = [];
  const fetcher = vi.fn<typeof fetch>();
  let onPublish: (count: number) => void = () => {};
  const subscription = subscribeTaskCount('/ar/api/captain/task-count', count => {
    counts.push(count); onPublish(count);
  }, fetcher, focus, visibility);
  const nextCount = () => new Promise<number>(resolve => { onPublish = resolve; });
  return { focus, visibility, counts, fetcher, subscription, nextCount };
}

it('reads on mount, focus and visibility return without a timer or polling', async () => {
  const f = fixture();
  f.fetcher.mockResolvedValueOnce(Response.json({ count: 4 }));
  await f.subscription.refresh();
  expect(f.counts).toEqual([4]);
  expect(f.fetcher).toHaveBeenCalledWith('/ar/api/captain/task-count', {
    cache: 'no-store', signal: expect.any(AbortSignal),
  });
  f.fetcher.mockResolvedValueOnce(Response.json({ count: 3 }));
  const focusCount = f.nextCount();
  f.focus.dispatchEvent(new Event('focus'));
  expect(await focusCount).toBe(3);
  f.visibility.visibilityState = 'hidden';
  f.visibility.dispatchEvent(new Event('visibilitychange'));
  f.focus.dispatchEvent(new Event('focus'));
  expect(f.fetcher).toHaveBeenCalledTimes(2);
  f.fetcher.mockResolvedValueOnce(Response.json({ count: 0 }));
  const visibleCount = f.nextCount();
  f.visibility.visibilityState = 'visible';
  f.visibility.dispatchEvent(new Event('visibilitychange'));
  expect(await visibleCount).toBe(0);
  expect(f.counts).toEqual([4, 3, 0]);
  f.subscription.dispose();
  f.focus.dispatchEvent(new Event('focus'));
  f.visibility.dispatchEvent(new Event('visibilitychange'));
  expect(f.fetcher).toHaveBeenCalledTimes(3);
});

it('publishes nothing while the first read is pending or fails', async () => {
  const f = fixture();
  f.fetcher.mockRejectedValueOnce(new Error('offline'));
  await f.subscription.refresh();
  expect(f.counts).toEqual([]);
  f.subscription.dispose();
});

it.each([401, 500])('keeps the last good value on HTTP %s', async status => {
  const f = fixture();
  f.fetcher.mockResolvedValueOnce(Response.json({ count: 5 }));
  await f.subscription.refresh();
  f.fetcher.mockResolvedValueOnce(Response.json({ count: null }, { status }));
  await f.subscription.refresh();
  expect(f.counts).toEqual([5]);
  f.subscription.dispose();
});

it.each([null, -1, 1.5, '4', {}, Number.MAX_SAFE_INTEGER + 1])('ignores invalid counts: %j', async count => {
  const f = fixture();
  f.fetcher.mockResolvedValue(Response.json({ count }));
  await f.subscription.refresh();
  expect(f.counts).toEqual([]);
  f.subscription.dispose();
});

it('keeps the last good value through malformed JSON and network failures', async () => {
  const f = fixture();
  f.fetcher.mockResolvedValueOnce(Response.json({ count: 6 }));
  await f.subscription.refresh();
  f.fetcher.mockResolvedValueOnce(new Response('invalid JSON'));
  await f.subscription.refresh();
  f.fetcher.mockRejectedValueOnce(new Error('offline'));
  await f.subscription.refresh();
  expect(f.counts).toEqual([6]);
  f.subscription.dispose();
});

it('ignores an old pathname response after disposal and coalesces overlapping events', async () => {
  const old = fixture(), current = fixture();
  let finish: (response: Response) => void = () => {};
  old.fetcher.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
  const pending = old.subscription.refresh();
  await old.subscription.refresh();
  expect(old.fetcher).toHaveBeenCalledTimes(1);
  old.subscription.dispose();
  expect(old.fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  current.fetcher.mockResolvedValueOnce(Response.json({ count: 2 }));
  await current.subscription.refresh();
  finish(Response.json({ count: 9 }));
  await pending;
  expect(old.counts).toEqual([]);
  expect(current.counts).toEqual([2]);
  current.subscription.dispose();
});

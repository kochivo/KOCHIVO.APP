import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function worker(response: { ok: boolean; type: string }) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const put = vi.fn();
  const remove = vi.fn();
  const claim = vi.fn();
  const clone = vi.fn(() => response);
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    self: { location: { origin: 'https://kochivo.test' },
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      clients: { claim },
    },
    caches: { match: async () => undefined, open: async () => ({ put }),
      keys: async () => ['kochivo-static-v4', 'kochivo-shell-v4', 'kochivo-static-v5', 'kochivo-shell-v5', 'other-app'],
      delete: remove,
    },
    fetch: async () => ({ ...response, clone }),
  });
  return { handlers, put, remove, claim, clone };
}

it.each([
  { ok: false, type: 'basic' },
  { ok: true, type: 'opaqueredirect' },
  { ok: true, type: 'basic' },
])('caches only usable static responses: %j', async response => {
  const instance = worker(response);
  let pending: Promise<unknown> | undefined;
  instance.handlers.fetch?.({ request: { method: 'GET', mode: 'cors', url: 'https://kochivo.test/_next/static/chunk.js' },
    respondWith: (promise: Promise<unknown>) => { pending = promise; } });
  expect(await pending).toMatchObject(response);
  expect(instance.put).toHaveBeenCalledTimes(response.ok && response.type !== 'opaqueredirect' ? 1 : 0);
  expect(instance.clone).toHaveBeenCalledTimes(response.ok && response.type !== 'opaqueredirect' ? 1 : 0);
});

it('deletes old KOCHIVO caches on activation and retains current and unrelated caches', async () => {
  const instance = worker({ ok: true, type: 'basic' });
  let pending: Promise<unknown> | undefined;
  instance.handlers.activate?.({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  expect(instance.remove.mock.calls).toEqual([['kochivo-static-v4'], ['kochivo-shell-v4']]);
  expect(instance.claim).toHaveBeenCalledOnce();
});

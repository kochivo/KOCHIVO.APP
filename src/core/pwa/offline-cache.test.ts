import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

interface WorkerEvent {
  request?: { method: string; url: string; mode: string };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<unknown>) => void;
}
type Options = {
  ok?: boolean; redirected?: boolean; missing?: boolean;
  failure?: 'shell' | 'read' | 'parse' | 'open' | 'fetch' | 'put';
  assetOk?: boolean; assetRedirected?: boolean;
};
function worker(options: Options = {}) {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const pages: string[] = [];
  const assets: string[] = [];
  const readPages: string[] = [];
  const fetched: string[] = [];
  const html = '<script src="/_next/static/chunks/offline.js"></script>'
    + '<link href="/_next/static/styles.css" rel="stylesheet">'
    + '<script src="https://external.test/script.js"></script>';
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    self: { location: { origin: 'https://kochivo.test' }, skipWaiting() {},
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) => { handlers[name] = handler; } },
    caches: {
      open: async (name: string) => {
        if (name.includes('static') && options.failure === 'open') throw new Error('cache unavailable');
        return {
          addAll: async (urls: string[]) => {
            if (options.failure === 'shell') throw new Error('shell unavailable');
            (name.includes('shell') ? pages : assets).push(...urls);
          },
          match: async (url: string) => {
            readPages.push(url);
            if (options.failure === 'read') throw new Error('cache unreadable');
            return options.missing ? undefined : {
              ok: options.ok ?? true, redirected: options.redirected ?? false,
              text: async () => {
                if (options.failure === 'parse') throw new Error('body unreadable');
                return html;
              },
            };
          },
          put: async (url: string) => {
            if (options.failure === 'put') throw new Error('cache full');
            assets.push(url);
          },
        };
      },
      match: async (request: unknown) => typeof request === 'string' ? request : undefined,
    },
    fetch: async (request: unknown) => {
      if (typeof request !== 'string' || options.failure === 'fetch') throw new Error('offline');
      fetched.push(request);
      return { ok: options.assetOk ?? true, redirected: options.assetRedirected ?? false };
    },
  });
  return { handlers, pages, assets, readPages, fetched };
}

async function install(instance: ReturnType<typeof worker>) {
  let pending = Promise.resolve<unknown>(undefined);
  instance.handlers.install?.({ waitUntil: promise => { pending = promise; } });
  return pending;
}

it('precaches only the unprefixed offline page and its hydration assets', async () => {
  const instance = worker();
  await install(instance);
  const { pages, assets, readPages, fetched } = instance;
  expect(pages).toEqual(['/offline', '/manifest.webmanifest', '/icons/icon-192.png', '/brand/logo-compact.png']);
  expect(readPages).toEqual(['/offline']);
  expect(assets).toContain('/_next/static/chunks/offline.js');
  expect(assets).toContain('/_next/static/styles.css');
  expect(assets.every(url => url.startsWith('/_next/static/'))).toBe(true);
  expect(fetched).toEqual(assets);
});

it.each(['/captain', '/player', '/ar/captain', '/en/player'])('falls back to /offline for %s', async path => {
  const { handlers } = worker();
  let pending = Promise.resolve<unknown>(undefined);
  handlers.fetch?.({ request: { method: 'GET', mode: 'navigate', url: `https://kochivo.test${path}` },
    waitUntil() {}, respondWith: promise => { pending = promise; } });
  expect(await pending).toBe('/offline');
});

it.each<Options>([{ ok: false }, { redirected: true }, { missing: true }])('skips unusable HTML: %j', async options => {
  const instance = worker(options);
  await expect(install(instance)).resolves.toBeUndefined();
  expect(instance.pages).toContain('/offline');
  expect(instance.assets).toEqual([]);
  expect(instance.fetched).toEqual([]);
});

it.each<Options>([{ assetOk: false }, { assetRedirected: true }])('skips unusable assets: %j', async options => {
  const instance = worker(options);
  await expect(install(instance)).resolves.toBeUndefined();
  expect(instance.fetched).toHaveLength(2);
  expect(instance.assets).toEqual([]);
});

it.each(['read', 'parse', 'open', 'fetch', 'put'] as const)('keeps the shell install when asset prefetch fails at %s', async failure => {
  const instance = worker({ failure });
  await expect(install(instance)).resolves.toBeUndefined();
  expect(instance.pages).toContain('/offline');
});

it('still rejects installation if the required shell precache fails', async () => {
  await expect(install(worker({ failure: 'shell' }))).rejects.toThrow('shell unavailable');
});

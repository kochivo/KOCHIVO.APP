import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

interface WorkerEvent {
  data?: { json: () => unknown };
  notification?: { close: () => void; data: { url: string } };
  waitUntil: (promise: Promise<unknown>) => void;
}
function worker() {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const notifications: unknown[] = [];
  const opened: string[] = [];
  const focused: string[] = [];
  const self = { location: { origin: 'https://kochivo.test' },
    addEventListener: (type: string, handler: (event: WorkerEvent) => void) => { handlers[type] = handler; },
    registration: { showNotification: async (title: string, options: unknown) => { notifications.push({ title, options }); } },
    clients: { matchAll: async () => [{ url: 'https://kochivo.test/ar/player', focus: async () => { focused.push('player'); } }],
      openWindow: async (url: string) => { opened.push(url); } },
  };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, URL });
  return { handlers, notifications, opened, focused };
}
it('displays push payloads and ignores malformed payloads', async () => {
  const { handlers, notifications } = worker();
  let pending = Promise.resolve<unknown>(undefined);
  const waitUntil = (promise: Promise<unknown>) => { pending = promise; };
  handlers.push?.({ data: { json: () => ({ title: 'Title', body: 'Body', url: '/ar/player', tag: 'n' }) }, waitUntil });
  await pending;
  expect(notifications).toEqual([{ title: 'Title', options: { body: 'Body', icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png', tag: 'n', data: { url: '/ar/player' } } }]);
  handlers.push?.({ data: { json: () => { throw new Error('invalid'); } }, waitUntil });
  expect(notifications).toHaveLength(1);
});
it('focuses the matching client, opens other same-origin routes and refuses external URLs', async () => {
  const { handlers, opened, focused } = worker();
  for (const url of ['/ar/player', '/en/player/nutrition', 'https://evil.test', '//evil.test']) {
    let pending = Promise.resolve<unknown>(undefined);
    handlers.notificationclick?.({ notification: { data: { url }, close: () => {} },
      waitUntil: promise => { pending = promise; } });
    await pending;
  }
  expect(focused).toEqual(['player']);
  expect(opened).toEqual(['https://kochivo.test/en/player/nutrition']);
});

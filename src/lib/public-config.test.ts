import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load() {
  return (await import('./public-config')).publicConfig;
}

it('falls back to the owner number and no DSN when env is empty', async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_WHATSAPP', ' ');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
  expect(await load()).toEqual({ ownerWhatsapp: '201100539306', sentryDsn: '' });
});

it('lets a deployment override each value', async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_WHATSAPP', '201000000001');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', ' https://key@o1.ingest.sentry.io/1 ');
  expect(await load()).toEqual({ ownerWhatsapp: '201000000001', sentryDsn: 'https://key@o1.ingest.sentry.io/1' });
});

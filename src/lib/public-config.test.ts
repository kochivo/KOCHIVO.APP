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

it('reports to the project DSN by default only in production builds', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
  vi.stubEnv('NODE_ENV', 'production');
  expect((await load()).sentryDsn).toMatch(/^https:\/\/[\da-f]+@o\d+\.ingest\.de\.sentry\.io\/\d+$/);
});

it('lets a deployment override each value', async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_WHATSAPP', '201000000001');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', ' https://key@o1.ingest.sentry.io/1 ');
  expect(await load()).toEqual({ ownerWhatsapp: '201000000001', sentryDsn: 'https://key@o1.ingest.sentry.io/1' });
});

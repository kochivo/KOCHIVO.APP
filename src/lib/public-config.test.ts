import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load() {
  return (await import('./public-config')).publicConfig;
}

it('falls back to the owner number and no DSN when env is empty', async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_WHATSAPP', ' ');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', ' ');
  expect(await load()).toEqual({ ownerWhatsapp: '201100539306', sentryDsn: '', turnstileSiteKey: '' });
});

it('reports to the project DSN by default only in production builds', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
  vi.stubEnv('NODE_ENV', 'production');
  expect((await load()).sentryDsn).toMatch(/^https:\/\/[\da-f]+@o\d+\.ingest\.de\.sentry\.io\/\d+$/);
});

it('uses the kochivo.site Turnstile key by default only in production builds', async () => {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
  vi.stubEnv('NODE_ENV', 'production');
  expect((await load()).turnstileSiteKey).toBe('0x4AAAAAAFyOd8ufoia-1x4K');
});

it('lets a deployment override each value', async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_WHATSAPP', '201000000001');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', ' https://key@o1.ingest.sentry.io/1 ');
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', ' site-key ');
  expect(await load()).toEqual({ ownerWhatsapp: '201000000001', sentryDsn: 'https://key@o1.ingest.sentry.io/1', turnstileSiteKey: 'site-key' });
});

import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs/config', () => ({ withSentryConfig: (config: unknown) => config }));
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, '0', 'unexpected'])('provides a compile-time disabled flag for %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', flag); vi.resetModules();
  const { default: config } = await import('../../../next.config');
  expect(config.env?.NEXT_PUBLIC_INTERNATIONAL).toBe('0');
});
it('preserves the enabled flag for international builds', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1'); vi.resetModules();
  const { default: config } = await import('../../../next.config');
  expect(config.env?.NEXT_PUBLIC_INTERNATIONAL).toBe('1');
});

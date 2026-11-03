import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContentSecurityPolicy, buildSecurityHeaders } from './security-headers';
import config from '../../next.config';

const env = vi.hoisted(() => vi.fn(() => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co/storage/ignored?query=ignored',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
})));
vi.mock('../core/config/env', () => ({ publicEnv: env }));
vi.mock('@sentry/nextjs/config', () => ({ withSentryConfig: (value: unknown) => value }));
afterEach(() => { vi.unstubAllEnvs(); env.mockClear(); });

const options = { supabaseUrl: 'https://project.supabase.co/storage/ignored?query=ignored', production: true };
const expectedCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://project.supabase.co",
  "media-src 'self' blob: https://project.supabase.co",
  "connect-src 'self' https://project.supabase.co wss://project.supabase.co https://*.ingest.de.sentry.io",
  'frame-src https://challenges.cloudflare.com',
  "font-src 'self'", "worker-src 'self'", "object-src 'none'", "base-uri 'self'",
  "form-action 'self'", "frame-ancestors 'none'", 'upgrade-insecure-requests',
];

describe('HTTP security headers', () => {
  it('asserts every CSP directive and the exact production header list', () => {
    expect(buildContentSecurityPolicy(options).split('; ')).toEqual(expectedCsp);
    expect(buildSecurityHeaders(options)).toEqual([
      { key: 'Content-Security-Policy', value: expectedCsp.join('; ') },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ]);
  });

  it('omits HSTS and upgrade-insecure-requests outside production', () => {
    const headers = buildSecurityHeaders({ ...options, production: false });
    expect(headers.some(header => header.key === 'Strict-Transport-Security')).toBe(false);
    const dev = [...expectedCsp.slice(0, -1)];
    dev[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com";
    expect(headers.find(header => header.key === 'Content-Security-Policy')?.value.split('; ')).toEqual(dev);
  });

  it.each([undefined, '', 'invalid', 'javascript:alert(1)'])('falls back safely for %s', supabaseUrl => {
    const csp = buildContentSecurityPolicy({ supabaseUrl, production: false });
    expect(csp).toContain("img-src 'self' data: blob: https://*.supabase.co;");
    expect(csp).toContain("media-src 'self' blob: https://*.supabase.co;");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.de.sentry.io;");
  });

  it('preserves local Supabase HTTP and websocket ports', () => {
    expect(buildContentSecurityPolicy({ supabaseUrl: 'http://127.0.0.1:54321/path', production: false }))
      .toContain("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321 ");
  });

  it('installs headers on every route while retaining the service-worker rule', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const rules = await config.headers?.();
    expect(env).toHaveBeenCalled();
    expect(rules).toEqual([
      { source: '/:path*', headers: buildSecurityHeaders(options) },
      { source: '/sw.js', headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ] },
    ]);
  });

  it('builds without configured public env', async () => {
    env.mockImplementationOnce(() => { throw new Error('Missing public env'); });
    const rules = await config.headers?.();
    expect(rules?.[0]?.headers).toEqual(buildSecurityHeaders({ production: false }));
  });
});

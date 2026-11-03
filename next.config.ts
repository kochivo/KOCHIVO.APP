import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import { publicEnv } from './src/core/config/env';
import { buildSecurityHeaders } from './src/lib/security-headers';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    let supabaseUrl: string | undefined;
    try {
      supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
    } catch { /* Public env is optional for builds of routes without Supabase. */ }
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders({ supabaseUrl, production: process.env.NODE_ENV === 'production' }),
      },
      {
        // The service worker must never be cached, or clients keep running an old version.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default withSentryConfig(config, {
  silent: true,
  sourcemaps: { disable: true },
  telemetry: false,
  // All three runtime configs disable tracing; retain error capture without unused tracing code.
  bundleSizeOptimizations: { excludeTracing: true },
});

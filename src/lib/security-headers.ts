interface SecurityHeaderOptions {
  supabaseUrl?: string;
  production: boolean;
}

function supabaseOrigins(value?: string): [string, string] {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return [url.origin, `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`];
    }
  } catch { /* Builds without public env still need a restrictive policy. */ }
  return ['https://*.supabase.co', 'wss://*.supabase.co'];
}

export function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const [http, websocket] = supabaseOrigins(options.supabaseUrl);
  return [
    "default-src 'self'",
    // Next inlines RSC payloads and pre-paint boot scripts. Accept unsafe-inline to
    // preserve static rendering; per-request nonces would make every page dynamic.
    // The dev server's React refresh evaluates code; production never gets unsafe-eval.
    `script-src 'self' 'unsafe-inline'${options.production ? '' : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${http}`,
    `media-src 'self' blob: ${http} https:`,
    `connect-src 'self' ${http} ${websocket} https://*.ingest.de.sentry.io`,
    'frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://drive.google.com',
    "font-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function buildSecurityHeaders(options: SecurityHeaderOptions): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
    ...(options.production ? [{
      key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload',
    }] : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

import type { ZodIssue } from 'zod';

export interface PublicEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}

let cached: PublicEnv | undefined;

/**
 * Validated public env. Read lazily so `next build` of pages that never touch Supabase
 * does not fail on a machine without .env.local. Next inlines NEXT_PUBLIC_* at build time,
 * which is why each key is referenced explicitly.
 */
export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const issues: ZodIssue[] = [];
  if (url === undefined) issues.push(missing('NEXT_PUBLIC_SUPABASE_URL'));
  else {
    try { new URL(url.trim()); }
    catch {
      issues.push({ code: 'invalid_format', format: 'url', path: ['NEXT_PUBLIC_SUPABASE_URL'], message: 'Invalid URL' });
    }
  }
  if (key === undefined) issues.push(missing('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
  else if (key.length < 20) issues.push({ origin: 'string', code: 'too_small', minimum: 20,
    inclusive: true, path: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    message: 'Too small: expected string to have >=20 characters' });
  if (issues.length) {
    // Preserve the diagnostic contract without shipping a schema engine for two env values.
    const error = new Error(JSON.stringify(issues, null, 2));
    error.name = 'ZodError';
    throw Object.assign(error, { issues });
  }
  // Missing values already produced issues above; keep narrowing explicit for strict callers.
  if (url === undefined || key === undefined) throw new Error('Missing public environment');
  cached = { NEXT_PUBLIC_SUPABASE_URL: url.trim().replace(/[\t\n\r]/g, ''), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
  return cached;
}

function missing(name: keyof PublicEnv): ZodIssue {
  return { expected: 'string', code: 'invalid_type', path: [name],
    message: 'Invalid input: expected string, received undefined' };
}

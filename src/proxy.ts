import type { NextRequest } from 'next/server';
import { refreshSession } from '@/core/supabase/session';

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Skip static files, the service worker and the offline page so they work without a session.
  matcher: ['/((?!_next/static|_next/image|icons|brand|sw.js|offline|manifest.webmanifest|.*\\.(?:png|gif|webp|svg)$).*)'],
};

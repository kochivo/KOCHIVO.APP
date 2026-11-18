import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/core/config/env';
import { profileTimezone } from '@/lib/timezone';
import type { AppDatabase } from '@/types/app-database';
import { isMcpCaptain } from '../config';

export async function loadMcpActor(request: Request) {
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return { status: 401 } as const;
  const env = publicEnv();
  const db = createClient<AppDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const verified = await db.auth.getClaims(token).catch(() => null);
  const claims = verified?.data?.claims;
  if (!verified || verified.error || !claims?.sub || typeof claims.client_id !== 'string') return { status: 401 } as const;
  const clientId = claims.client_id.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
  if (!clientId) return { status: 401 } as const;
  const { data: profile } = await db.from('profiles').select('role,suspended_at,timezone')
    .eq('id', claims.sub).maybeSingle();
  if (claims.is_anonymous === true || !isMcpCaptain(claims.sub, profile)) return { status: 403 } as const;
  // An unexpired JWT can still pass getClaims after its grant's session is revoked.
  const session = await db.auth.getUser(token).catch(() => null);
  if (!session || session.error || session.data.user?.id !== claims.sub) return { status: 401 } as const;
  return { status: 200, actor: { id: claims.sub, role: 'captain', db },
    client: `mcp:${clientId}`, timezone: profileTimezone(profile?.timezone) } as const;
}

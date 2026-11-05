import { combineChunks, parseCookieHeader, stringFromBase64URL } from '@supabase/ssr';
import { publicEnv } from '@/core/config/env';

/** Reads persisted identity without refreshing an expired token. Only for local, offline data. */
export async function offlineSessionUser(header: string, storageKey: string): Promise<string | null> {
  try {
    const cookies = new Map(parseCookieHeader(header).map(cookie => [cookie.name, cookie.value]));
    const raw = await combineChunks(storageKey, name => cookies.get(name));
    if (!raw) return null;
    const session: unknown = JSON.parse(raw.startsWith('base64-') ? stringFromBase64URL(raw.slice(7)) : raw);
    if (!session || typeof session !== 'object' || !('user' in session)) return null;
    const user = session.user;
    return user && typeof user === 'object' && 'id' in user && typeof user.id === 'string' ? user.id : null;
  } catch { return null; }
}

export function readOfflineUser(): Promise<string | null> {
  const project = new URL(publicEnv().NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  return offlineSessionUser(document.cookie, `sb-${project}-auth-token`);
}

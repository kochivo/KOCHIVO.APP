import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { localDate } from '@/lib/dates';

const completed = new Map<string, string>();
const running = new Set<string>();

export async function refreshInactiveAlerts(now: Date): Promise<void> {
  let userId: string | undefined;
  let ownsLock = false;
  try {
    const client = await loadSupabaseBrowser();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    userId = auth.user?.id;
    if (!userId || running.has(userId)) return;
    running.add(userId);
    ownsLock = true;
    const { data: profile, error: profileError } = await client.from('profiles').select('timezone').eq('id', userId).single();
    if (profileError) throw profileError;
    const today = localDate(now, profile.timezone);
    const key = `kochivo-inactive:${userId}`;
    let saved = completed.get(userId);
    try { saved = window.localStorage.getItem(key) ?? saved; } catch { /* Memory still deduplicates when storage is unavailable. */ }
    if (saved === today) return;
    const { error } = await client.rpc('refresh_inactive_alerts');
    if (error) throw error;
    completed.set(userId, today);
    try { window.localStorage.setItem(key, today); } catch { /* Storage can be disabled. */ }
  } catch (error) {
    console.warn('Could not refresh inactivity notifications', error);
  } finally {
    if (userId && ownsLock) running.delete(userId);
  }
}

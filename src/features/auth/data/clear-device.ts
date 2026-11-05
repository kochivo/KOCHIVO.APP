import { clearDeviceRole } from '@/core/pwa/device-role';
import { rememberLocalUser } from '@/core/offline/remembered-user';

export async function clearDeviceCache() {
  clearDeviceRole();
  rememberLocalUser(null);
  try { window.localStorage.removeItem('kochivo.my-captain'); } catch { /* Storage may be blocked. */ }
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('kochivo-shell-')).map(name => caches.delete(name)));
  }
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_SHELL' });
}

export async function finalDeviceSync() {
  const { localDb, flushOutbox, supabaseTransport } = await import('@/core/offline');
  let db;
  try { db = localDb(); } catch { return; }
  if (!navigator.onLine || !db.userId) return;
  const { loadSupabaseBrowser } = await import('@/core/supabase/lazy');
  await flushOutbox(db, supabaseTransport(await loadSupabaseBrowser(), db.userId));
}

export async function closeDeviceDb() {
  const { localDb, setLocalUser } = await import('@/core/offline');
  let db;
  try { db = localDb(); } catch { return; }
  // Unsent logs and videos remain scoped to their owner for the next login.
  let empty = false;
  try { empty = await db.outbox.count() === 0 && await db.media_queue.count() === 0; }
  finally { await setLocalUser(null); }
  if (empty) await db.delete();
}

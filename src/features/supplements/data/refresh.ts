import { localDb, type KochivoDB } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { SupplementLogRow } from '@/core/offline/tables';
import { supplementHistoryStart } from './captain';

export async function mergeSupplementLogs(db: KochivoDB, logs: SupplementLogRow[], since?: string) {
  await db.transaction('rw', db.supplement_logs, db.outbox, async () => {
    if (since) {
      const expired = await db.supplement_logs.filter(log => log.log_date < since).toArray();
      for (const log of expired) {
        const pending = await db.outbox.where('[table+row_id]').equals(['supplement_logs', log.id]).first();
        if (!pending) await db.supplement_logs.delete(log.id);
      }
    }
    for (const log of logs) {
      const pending = await db.outbox.where('[table+row_id]').equals(['supplement_logs', log.id]).first();
      const current = await db.supplement_logs.get(log.id);
      if (!pending && (!current || Date.parse(current.client_updated_at) < Date.parse(log.client_updated_at))) {
        await db.supplement_logs.put(log);
      }
    }
  });
}

export async function refreshSupplements(now = Date.now()) {
  if (!navigator.onLine) return;
  const db = localDb();
  const client = await loadSupabaseBrowser();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw authError ?? new Error('Unauthenticated');
  if (db.userId && db.userId !== auth.user.id) throw new Error('Local account changed');
  const since = supplementHistoryStart(now);
  const [prescriptions, logs] = await Promise.all([
    client.from('supplements').select('*').eq('player_id', auth.user.id).is('archived_at', null).order('position'),
    client.from('supplement_logs').select('*').eq('player_id', auth.user.id).gte('log_date', since),
  ]);
  if (prescriptions.error || logs.error) throw prescriptions.error ?? logs.error;
  await db.transaction('rw', db.supplements, async () => {
    await db.supplements.where('player_id').equals(auth.user.id).delete();
    await db.supplements.bulkPut(prescriptions.data);
  });
  await mergeSupplementLogs(db, logs.data, since);
}

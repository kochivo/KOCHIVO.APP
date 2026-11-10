import type { KochivoDB } from './db';
import type { SyncRows, SyncTable } from './tables';

/**
 * Write a row locally and queue it for the server in ONE transaction, so the UI (reading
 * the local table) and the queue can never disagree. Re-saving the same row before it
 * syncs keeps a single queue entry: the latest local row is what gets sent.
 */
export async function saveAndQueue<T extends SyncTable>(
  db: KochivoDB,
  table: T,
  row: SyncRows[T],
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).put(row);
    const existing = await db.outbox.where('[table+row_id]').equals([table, row.id]).first();
    if (existing?.id !== undefined) {
      await db.outbox.update(existing.id, {
        revision: existing.revision + 1,
        next_attempt_at: now,
        attempts: 0,
        last_error: undefined,
      });
    } else {
      await db.outbox.add({ owner_id: db.userId, table, row_id: row.id, revision: 1, enqueued_at: now, attempts: 0, next_attempt_at: now });
    }
  });
  announceOutboxWrite();
}

/** Event the background sync listens for, so a save is sent at once instead of on the next 30s tick. */
export const OUTBOX_WRITE_EVENT = 'kochivo:outbox-write';

export function announceOutboxWrite(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(OUTBOX_WRITE_EVENT));
}

export async function pendingCount(db: KochivoDB): Promise<number> {
  return db.outbox.count();
}

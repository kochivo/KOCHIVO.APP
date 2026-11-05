import { backoffDelay } from './backoff';
import type { KochivoDB, OutboxEntry } from './db';
import { SYNC_ORDER, type SyncRows, type SyncTable } from './tables';

/** Sends rows of one table to the server. Must be idempotent (server upserts by id). */
export type SyncTransport = <T extends SyncTable>(table: T, rows: SyncRows[T][]) => Promise<void>;

export interface FlushResult {
  sent: number;
  failed: number;
}

const BATCH_SIZE = 50;

/**
 * Sends every due outbox entry, table by table in FK order. A failing table is retried later
 * with backoff and stops later tables in this run (their rows may depend on it).
 */
export async function flushOutbox(db: KochivoDB, send: SyncTransport, now: number = Date.now()): Promise<FlushResult> {
  const candidates = await db.outbox.where('next_attempt_at').belowOrEqual(now).toArray();
  const due: OutboxEntry[] = [];
  for (const entry of candidates) {
    if (db.userId && entry.owner_id !== db.userId) {
      console.warn('Dropped outbox row with foreign or unknown owner', entry.table, entry.row_id);
      if (entry.id !== undefined) await db.outbox.delete(entry.id);
    } else due.push(entry);
  }
  const result: FlushResult = { sent: 0, failed: 0 };

  for (const table of SYNC_ORDER) {
    const entries = due.filter((e) => e.table === table);
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const ok = await sendBatch(db, send, table, batch, now);
      if (ok) result.sent += batch.length;
      else {
        result.failed = due.length - result.sent;
        return result;
      }
    }
  }
  return result;
}

async function sendBatch(
  db: KochivoDB,
  send: SyncTransport,
  table: SyncTable,
  batch: OutboxEntry[],
  now: number,
): Promise<boolean> {
  const rows = (await db.table(table).bulkGet(batch.map((e) => e.row_id))).filter(Boolean);
  try {
    await send(table, rows as SyncRows[typeof table][]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A failed older request must not postpone an edit that was re-queued while sending.
    await db.transaction('rw', db.outbox, async () => {
      for (const e of batch) {
        // Entries read from the auto-increment outbox table always have a persisted key.
        const current = await db.outbox.get(e.id!);
        if (current?.revision !== e.revision) continue;
        // The persisted key was used to read current above.
        await db.outbox.update(e.id!, {
          attempts: e.attempts + 1,
          next_attempt_at: now + backoffDelay(e.attempts + 1),
          last_error: message,
        });
      }
    });
    return false;
  }
  // Only remove entries that were not re-queued while the request was in flight.
  await db.transaction('rw', db.outbox, async () => {
    for (const e of batch) {
      // Entries read from the auto-increment outbox table always have a persisted key.
      const current = await db.outbox.get(e.id!);
      if (current && current.revision === e.revision) {
        // The same persisted key was used to read current above.
        await db.outbox.delete(e.id!);
      }
    }
  });
  return true;
}

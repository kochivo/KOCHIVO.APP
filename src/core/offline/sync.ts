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
  const due = await db.outbox.where('next_attempt_at').belowOrEqual(now).toArray();
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
    await db.outbox.bulkUpdate(
      batch.map((e) => ({
        // Entries read from the auto-increment outbox table always have a persisted key.
        key: e.id!,
        changes: { attempts: e.attempts + 1, next_attempt_at: now + backoffDelay(e.attempts + 1), last_error: message },
      })),
    );
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

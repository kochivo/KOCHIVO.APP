import { backoffDelay } from './backoff';
import type { KochivoDB, OutboxEntry } from './db';
import { SYNC_DEPENDENCIES, SYNC_ORDER, type SyncRows, type SyncTable } from './tables';

/** Sends rows of one table to the server. Must be idempotent (server upserts by id). */
export type SyncTransport = {
  <T extends SyncTable>(table: T, rows: SyncRows[T][]): Promise<void>;
  /** Checked once per flush, only before the first nonempty send. */
  beforeSend?: () => Promise<void>;
};

export interface FlushResult {
  sent: number;
  failed: number;
}

const BATCH_SIZE = 50;

/**
 * Sends due entries in FK order, isolating failures to their table and dependants.
 */
export async function flushOutbox(db: KochivoDB, send: SyncTransport, now: number = Date.now()): Promise<FlushResult> {
  let identityCheck: Promise<void> | undefined;
  const sendChecked: SyncTransport = async (table, rows) => {
    if (rows.length && send.beforeSend) {
      // Keep a rejected check too: no later table may send under a failed identity.
      identityCheck ??= Promise.resolve().then(() => send.beforeSend?.());
      await identityCheck;
    }
    await send(table, rows);
  };
  const candidates = await db.outbox.where('next_attempt_at').belowOrEqual(now).toArray();
  const due: OutboxEntry[] = [];
  for (const entry of candidates) {
    if (db.userId && entry.owner_id !== db.userId) {
      console.warn('Dropped outbox row with foreign or unknown owner', entry.table, entry.row_id);
      if (entry.id !== undefined) await db.outbox.delete(entry.id);
    } else if (!entry.parked) due.push(entry);
  }
  const result: FlushResult = { sent: 0, failed: 0 };

  for (const table of SYNC_ORDER) {
    const candidates = due.filter((e) => e.table === table);
    const entries = await unblockedEntries(db, table, candidates);
    result.failed += candidates.length - entries.length;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const sent = await sendBatch(db, sendChecked, table, batch, now);
      result.sent += sent;
      if (sent !== batch.length) {
        result.failed += entries.length - i - sent;
        break;
      }
    }
  }
  return result;
}

async function unblockedEntries<T extends SyncTable>(
  db: KochivoDB, table: T, entries: OutboxEntry[],
): Promise<OutboxEntry[]> {
  for (const dependency of SYNC_DEPENDENCIES[table] ?? []) {
    const parents = await db.outbox.filter(e => e.table === dependency.parent && e.owner_id === db.userId).toArray();
    const blockedIds = new Set(parents.map(entry => entry.row_id));
    if (!blockedIds.size) continue;
    const rows = await db.table<SyncRows[T], string>(table).bulkGet(entries.map(entry => entry.row_id));
    entries = entries.filter((_entry, index) => {
      const parentId = rows[index]?.[dependency.key];
      return typeof parentId !== 'string' || !blockedIds.has(parentId);
    });
  }
  return entries;
}

async function sendBatch(
  db: KochivoDB,
  send: SyncTransport,
  table: SyncTable,
  batch: OutboxEntry[],
  now: number,
  isolate = true,
): Promise<number> {
  const rows = (await db.table(table).bulkGet(batch.map((e) => e.row_id))).filter(Boolean);
  try {
    await send(table, rows as SyncRows[typeof table][]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const accountChanged = message === 'Sync account changed';
    const permanent = !accountChanged && typeof error === 'object' && error !== null && 'permanent' in error && error.permanent === true;
    if (permanent && isolate) {
      let sent = 0;
      for (const entry of batch) sent += await sendBatch(db, send, table, [entry], now, false);
      return sent;
    }
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code) ? error.code : 'unknown';
    let parkedCount = 0;
    // A failed older request must not postpone an edit that was re-queued while sending.
    await db.transaction('rw', db.outbox, async () => {
      for (const e of batch) {
        // Entries read from the auto-increment outbox table always have a persisted key.
        const current = await db.outbox.get(e.id!);
        if (current?.revision !== e.revision || current.parked) continue;
        const parked = !accountChanged && (permanent || e.attempts + 1 >= 12);
        // The persisted key was used to read current above.
        await db.outbox.update(e.id!, {
          attempts: e.attempts + 1,
          next_attempt_at: parked ? Number.MAX_SAFE_INTEGER : now + backoffDelay(e.attempts + 1),
          last_error: message,
          parked,
        });
        if (parked) parkedCount++;
      }
    });
    if (parkedCount) void import('@sentry/nextjs').then(({ captureException }) => {
      for (let i = 0; i < parkedCount; i++) captureException(new Error('Outbox entry parked'), { tags: { table, code } });
    }).catch(() => undefined);
    return 0;
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
  return batch.length;
}

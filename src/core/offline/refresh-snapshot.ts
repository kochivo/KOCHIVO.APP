export type SnapshotRefreshResult = 'ready' | 'empty' | 'error' | 'offline';

interface SnapshotTable<Snapshot> {
  put(snapshot: Snapshot): PromiseLike<unknown>;
  delete(key: string): PromiseLike<unknown>;
}

interface RefreshOptions<Snapshot, DB> {
  online?: boolean;
  fetch: () => Promise<Snapshot | null>;
  db: () => DB;
  table: (db: DB) => SnapshotTable<Snapshot>;
  accepts?: (snapshot: Snapshot, db: DB) => boolean;
}

export async function refreshCachedSnapshot<Snapshot, DB>(
  options: RefreshOptions<Snapshot, DB>,
): Promise<SnapshotRefreshResult> {
  if (!(options.online ?? navigator.onLine)) return 'offline';
  try {
    // Capture the binding before network work, so a late response cannot enter another account's cache.
    const db = options.db();
    const table = options.table(db);
    const snapshot = await options.fetch();
    if (snapshot && options.accepts && !options.accepts(snapshot, db)) return 'error';
    if (snapshot) await table.put(snapshot);
    else await table.delete('active');
    return snapshot ? 'ready' : 'empty';
  } catch { return 'error'; }
}

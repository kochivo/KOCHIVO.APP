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
}

export async function refreshCachedSnapshot<Snapshot, DB>(
  options: RefreshOptions<Snapshot, DB>,
): Promise<SnapshotRefreshResult> {
  if (!(options.online ?? navigator.onLine)) return 'offline';
  try {
    const snapshot = await options.fetch();
    const table = options.table(options.db());
    if (snapshot) await table.put(snapshot);
    else await table.delete('active');
    return snapshot ? 'ready' : 'empty';
  } catch { return 'error'; }
}

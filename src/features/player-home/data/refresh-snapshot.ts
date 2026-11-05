import { localDb, refreshCachedSnapshot, type KochivoDB, type ProgramSnapshot } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<ProgramSnapshot | null>;
}

export async function refreshSnapshot(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  return refreshCachedSnapshot({
    online: options.online,
    fetch: options.fetch ?? (async () => {
      const { fetchProgramSnapshot } = await import('./program-snapshot');
      return fetchProgramSnapshot(await loadSupabaseBrowser());
    }),
    db: () => options.db ?? localDb(),
    table: db => db.program_snapshot,
  });
}

import { localDb, refreshCachedSnapshot, type KochivoDB, type ProgramSnapshot } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';
import { fetchProgramSnapshot } from './program-snapshot';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<ProgramSnapshot | null>;
}

export async function refreshSnapshot(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  return refreshCachedSnapshot({
    online: options.online,
    fetch: options.fetch ?? (() => fetchProgramSnapshot(supabaseBrowser())),
    db: () => options.db ?? localDb(),
    table: db => db.program_snapshot,
  });
}

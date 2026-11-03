import { localDb, type KochivoDB, type ProgramSnapshot } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';
import { fetchProgramSnapshot } from './program-snapshot';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<ProgramSnapshot | null>;
}

export async function refreshSnapshot(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  if (!(options.online ?? navigator.onLine)) return 'offline';
  try {
    const snapshot = await (options.fetch ?? (() => fetchProgramSnapshot(supabaseBrowser())))();
    const db = options.db ?? localDb();
    if (snapshot) await db.program_snapshot.put(snapshot);
    else await db.program_snapshot.delete('active');
    return snapshot ? 'ready' : 'empty';
  } catch {
    return 'error';
  }
}

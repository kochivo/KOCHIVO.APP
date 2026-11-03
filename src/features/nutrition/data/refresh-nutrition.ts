import { localDb, type KochivoDB, type NutritionSnapshot } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';
import { fetchNutritionSnapshot } from './nutrition-snapshot';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<NutritionSnapshot | null>;
}

export async function refreshNutrition(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  if (!(options.online ?? navigator.onLine)) return 'offline';
  try {
    const snapshot = await (options.fetch ?? (() => fetchNutritionSnapshot(supabaseBrowser())))();
    const db = options.db ?? localDb();
    if (snapshot) await db.nutrition_snapshot.put(snapshot);
    else await db.nutrition_snapshot.delete('active');
    return snapshot ? 'ready' : 'empty';
  } catch { return 'error'; }
}

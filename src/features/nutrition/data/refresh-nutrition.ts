import { localDb, refreshCachedSnapshot, type KochivoDB, type NutritionSnapshot } from '@/core/offline';
import { supabaseBrowser } from '@/core/supabase/browser';
import { fetchNutritionSnapshot } from './nutrition-snapshot';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<NutritionSnapshot | null>;
}

export async function refreshNutrition(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  return refreshCachedSnapshot({
    online: options.online,
    fetch: options.fetch ?? (() => fetchNutritionSnapshot(supabaseBrowser())),
    db: () => options.db ?? localDb(),
    table: db => db.nutrition_snapshot,
  });
}

import { localDb, refreshCachedSnapshot, type KochivoDB, type NutritionSnapshot } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<NutritionSnapshot | null>;
}

export async function refreshNutrition(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  return refreshCachedSnapshot({
    online: options.online,
    fetch: options.fetch ?? (async () => {
      const { fetchNutritionSnapshot } = await import('./nutrition-snapshot');
      return fetchNutritionSnapshot(await loadSupabaseBrowser());
    }),
    db: () => options.db ?? localDb(),
    table: db => db.nutrition_snapshot,
    accepts: (snapshot, db) => !db.userId || snapshot.player_id === db.userId,
  });
}

import { localDb, refreshCachedSnapshot, type KochivoDB, type NutritionSnapshot } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { refreshMealLogs } from './refresh-meal-logs';

interface RefreshOptions {
  db?: KochivoDB;
  online?: boolean;
  fetch?: () => Promise<NutritionSnapshot | null>;
  day?: string;
}

export async function refreshNutrition(options: RefreshOptions = {}): Promise<'ready' | 'empty' | 'error' | 'offline'> {
  if (options.day && options.online !== false) {
    try { await refreshMealLogs(options.day, options.db); } catch { return 'error'; }
  }
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

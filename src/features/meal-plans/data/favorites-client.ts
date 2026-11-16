import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
type Favorite = { captain_id: string; food_id: string; created_at: string };
type FavoritesDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<AppDatabase['public'], 'Tables'> & {
    Tables: AppDatabase['public']['Tables'] & {
      food_favorites: { Row: Favorite; Insert: Omit<Favorite, 'created_at'>; Update: never; Relationships: [] };
    };
  };
};
// Migration 0127 is scoped to this feature until generated types are refreshed.
export function favoritesClient(client: SupabaseClient<AppDatabase>) {
  return client as unknown as SupabaseClient<FavoritesDatabase>;
}

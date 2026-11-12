import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { Tables } from '@/types/database';

// T-206 limits generated-file edits to tables. Keep the additive RPC contract here.
type CatalogDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      player_package_tier: { Args: { p_player: string }; Returns: Tables<'captain_package_tiers'>[] };
      renew_player_offer: {
        Args: { p_player: string; p_offer: string | null; p_package?: string; p_days?: number; p_amount?: number; p_price?: number };
        Returns: string;
      };
      activate_player_offer: {
        Args: { p_link: string; p_offer: string | null; p_package: string | null; p_kind: string;
          p_quantity: number; p_price_egp: number; p_paid_egp: number; p_free_trial: boolean };
        Returns: undefined;
      };
    };
  };
};

export function catalogRpc(client: SupabaseClient<AppDatabase>) {
  // The runtime client is unchanged; these functions are installed by migration 0099.
  return (client as unknown as SupabaseClient<CatalogDatabase>).rpc.bind(client);
}

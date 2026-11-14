import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { PaymentMethod } from '../payment-methods';

type MethodRow = { captain_id: string; method: PaymentMethod; account_detail: string | null; position: number; updated_at: string };
type WithMethod<T> = T extends { Row: infer R; Insert: infer I; Update: infer U } ?
  Omit<T, 'Row' | 'Insert' | 'Update'> & { Row: R & { method: PaymentMethod | null }; Insert: I & { method?: PaymentMethod | null }; Update: U } : never;
type Schema = AppDatabase['public'];
type MethodDatabase = Omit<AppDatabase, 'public'> & { public: Omit<Schema, 'Tables' | 'Functions'> & {
  Tables: Omit<Schema['Tables'], 'player_payments' | 'player_renewal_requests' | 'payment_collections'> & {
    captain_payment_methods: { Row: MethodRow; Insert: Omit<MethodRow, 'updated_at'>; Update: Partial<Pick<MethodRow, 'account_detail' | 'position'>>; Relationships: [] };
    player_payments: WithMethod<Schema['Tables']['player_payments']>;
    player_renewal_requests: WithMethod<Schema['Tables']['player_renewal_requests']>;
    payment_collections: WithMethod<Schema['Tables']['payment_collections']>;
  };
  Functions: Schema['Functions'] & {
    activate_player_with_method: { Args: { p_link: string; p_package: string | null; p_kind: string; p_quantity: number;
      p_price: number; p_paid: number; p_trial: boolean; p_catalog: boolean; p_method: PaymentMethod | null }; Returns: boolean };
    decide_renewal_with_method: { Args: { p_request: string; p_status: string }; Returns: boolean };
    renew_player_with_method: { Args: { p_player: string; p_days: number | null; p_amount: number | null; p_price: number | null; p_package: string | null; p_method: PaymentMethod | null }; Returns: string };
    collect_payment_with_method: { Args: { p_player: string; p_amount: number; p_method: PaymentMethod | null }; Returns: number };
  };
} };

// Keep the additive schema local until the owner regenerates database types after deployment.
export function paymentMethodClient(client: SupabaseClient<AppDatabase>) {
  return client as unknown as SupabaseClient<MethodDatabase>;
}

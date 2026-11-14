import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { PaymentReceipt, ReceiptMethod } from '../receipts/types';

type ReceiptDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<AppDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: AppDatabase['public']['Tables'] & {
      payment_receipts: { Row: PaymentReceipt; Insert: never; Update: never; Relationships: [] };
    };
    Functions: AppDatabase['public']['Functions'] & {
      submit_payment_receipt: { Args: { p_id: string; p_captain: string; p_amount: number;
        p_method: ReceiptMethod | null; p_photo: string; p_renewal: string | null }; Returns: string };
      accept_payment_receipt: { Args: { p_receipt: string; p_days: number | null; p_package: string | null; p_message: string; p_photo: string; p_revision: number }; Returns: undefined };
      decline_payment_receipt: { Args: { p_receipt: string; p_reason: string; p_photo: string; p_revision: number }; Returns: undefined };
    };
  };
};
export function receiptClient(client: SupabaseClient<AppDatabase>) {
  // Migration 0106 is scoped to billing; keep its additive contract beside its callers.
  return client as unknown as SupabaseClient<ReceiptDatabase>;
}

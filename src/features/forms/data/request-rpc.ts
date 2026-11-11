import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
type RequestDatabase = AppDatabase & {public: AppDatabase['public'] & {Functions: AppDatabase['public']['Functions'] & {
  remind_custom_form_request:{Args:{p_request:string};Returns:boolean};
  send_custom_form_request:{Args:{p_id:string;p_form:string;p_player:string;p_due:string|null};Returns:string};
}}};
// Keep this additive migration's function signatures local until generated types refresh.
export function requestRpc(client:SupabaseClient<AppDatabase>):SupabaseClient<RequestDatabase> {
  return client as SupabaseClient<RequestDatabase>;
}

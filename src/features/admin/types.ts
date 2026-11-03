export type Tier = 'entry' | 'champion' | 'legend' | 'empire';
export type CaptainState = 'suspended' | 'expired' | 'paid' | 'free' | 'unconfirmed';
export type CaptainRow = {
  id: string;
  full_name: string;
  email: string | null;
  email_confirmed: boolean;
  created_at: string;
  tier: Tier;
  tier_ends_at: string | null;
  last_paid_tier: Tier | null;
  last_paid_ends_at: string | null;
  over_limit: boolean;
  active_players: number;
  player_limit: number;
  suspended: boolean;
}
export type PlanTier = { tier: Tier; price_egp: number; player_limit: number; position: number };
export type AuditRow = {
  id: string;
  admin_id: string;
  action: 'activate_plan' | 'suspend' | 'unsuspend';
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
export type ActionResult = { error: string; success?: never } | { success: true; error?: never };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
// Keep this boundary local until the project replaces its placeholder generated types.
export interface AdminDatabase {
  public: {
    Tables: { plan_tiers: Table<PlanTier>; admin_audit_log: Table<AuditRow> };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_captains: { Args: { p_search: string | null; p_limit: number; p_offset: number }; Returns: CaptainRow[] };
      admin_activate_plan: { Args: { p_captain: string; p_tier: Tier; p_months: number; p_payment_ref: string | null }; Returns: string };
      admin_set_suspended: { Args: { p_user: string; p_suspended: boolean; p_reason: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

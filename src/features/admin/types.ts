import type { Database, Tables } from '@/types/database';

export type Tier = 'entry' | 'champion' | 'legend' | 'empire';
export type CaptainState = 'suspended' | 'expired' | 'paid' | 'free' | 'unconfirmed';
export type CaptainRow = Omit<Database['public']['Functions']['admin_captains']['Returns'][number],
  'email' | 'tier' | 'tier_ends_at' | 'last_paid_tier' | 'last_paid_ends_at'> & {
  email: string | null;
  tier: Tier;
  tier_ends_at: string | null;
  last_paid_tier: Tier | null;
  last_paid_ends_at: string | null;
}
export type PlanTier = Omit<Tables<'plan_tiers'>, 'tier'> & { tier: Tier };
export type AuditRow = Omit<Tables<'admin_audit_log'>, 'action' | 'details'> & {
  action: 'activate_plan' | 'suspend' | 'unsuspend' | 'approve_captain' | 'reject_captain';
  details: Record<string, unknown>;
}
export type ActionResult = { error: string; success?: never } | { success: true; error?: never };

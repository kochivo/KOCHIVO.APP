import type { playerStatus, RosterPlayer } from '@/features/roster';
import type { Database, Tables } from '@/types/database';

// The generated RPC type marks amount_egp non-null, but renewals may be recorded without an amount.
export type Payment = Omit<Database['public']['Functions']['captain_last_payments']['Returns'][number], 'amount_egp'> & { amount_egp: number | null };
export type Package = Pick<Tables<'captain_packages'>, 'id' | 'name' | 'price_egp' | 'days'> & {
  kind?: 'days' | 'sessions'; sessions?: number | null;
};
export interface BillingPlayer extends RosterPlayer {
  status: ReturnType<typeof playerStatus>;
  phone: string | null;
  lastPayment: Payment | null;
  /** What the player still owes across renewals paid in installments. */
  due: number;
}
export type Plan = Pick<Tables<'plan_tiers'>, 'tier' | 'price_egp' | 'player_limit'>;
export interface Revenue { thisMonth: number; lastMonth: number; dues: number; owing: number }
export interface BillingData {
  players: BillingPlayer[];
  plan: Plan;
  used: number;
  subscriptionEnd: string | null;
  packages: Package[];
  revenue: Revenue;
}
export type BillingResult = { data: BillingData; error?: never } | { error: string; data?: never };
export interface RenewalInput {
  playerId: string;
  days: number | null;
  amount: number | null;
  price?: number | null;
  packageId?: string | null;
}
export type ActionResult<T> = { data: T; error?: never } | { error: string; data?: never };

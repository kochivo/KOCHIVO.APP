import type { playerStatus, RosterPlayer } from '@/features/roster';
import type { Tables } from '@/types/database';

export type Payment = Tables<'player_payments'>;
export interface BillingPlayer extends RosterPlayer {
  status: ReturnType<typeof playerStatus>;
  phone: string | null;
  lastPayment: Payment | null;
}
export type Plan = Pick<Tables<'plan_tiers'>, 'tier' | 'price_egp' | 'player_limit'>;
export interface BillingData {
  players: BillingPlayer[];
  plan: Plan;
  used: number;
  subscriptionEnd: string | null;
}
export type BillingResult = { data: BillingData; error?: never } | { error: string; data?: never };
export interface RenewalInput { playerId: string; days: number; amount: number | null }

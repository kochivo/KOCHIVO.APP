import type { playerStatus, RosterPlayer } from '@/features/roster';

export interface Payment {
  id: string;
  player_id: string;
  captain_id: string;
  amount_egp: number | null;
  days: number;
  period_start: string;
  period_end: string;
  created_at: string;
}
export interface BillingPlayer extends RosterPlayer {
  status: ReturnType<typeof playerStatus>;
  phone: string | null;
  lastPayment: Payment | null;
}
export interface Plan {
  tier: string;
  price_egp: number;
  player_limit: number;
}
export interface BillingData {
  players: BillingPlayer[];
  plan: Plan;
  used: number;
  subscriptionEnd: string | null;
}
export type BillingResult = { data: BillingData; error?: never } | { error: string; data?: never };
export interface RenewalInput { playerId: string; days: number; amount: number | null }

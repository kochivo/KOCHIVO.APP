import type { Tier } from './types';

/** Counts shown in the "needs a decision today" strip. */
export type AdminActionCounts = {
  pendingCaptains: number;
  expiringSoon: number;
  overLimit: number;
  quietPaid: number;
};

export type AdminTrend = { value: number; previous: number };

export type AdminDashboard = {
  actions: AdminActionCounts;
  /** Monthly plan revenue in EGP from subscriptions active now; previous is the same figure 30 days ago. */
  mrr: AdminTrend;
  captains: AdminTrend;
  paidCaptains: AdminTrend;
  players: AdminTrend;
  /** Captains active in the last 7 days; previous is the 7 days before that. */
  activeCaptains: AdminTrend;
  /** One entry per day, oldest first, 30 entries, dates as YYYY-MM-DD in Africa/Cairo. */
  signups: { day: string; captains: number; players: number }[];
  planMix: { tier: Tier; captains: number }[];
  /** Whole-table counts for the captain tabs, so they do not depend on the loaded page. */
  stateCounts: { all: number; paid: number; free: number; expiringSoon: number; expired: number; unconfirmed: number; suspended: number };
  health: { cronJobs: number; cronFailures24h: number; pendingDeletions: number };
};

/** Extra columns per captain row for the redesigned table. */
export type AdminCaptainActivity = {
  id: string;
  lastActiveAt: string | null;
  expiringSoon: boolean;
  quiet: boolean;
};

export type AdminCaptainDetail = {
  id: string;
  phone: string | null;
  players: number;
  trainedThisWeek: number;
  totalPaidEgp: number;
  history: { tier: Tier; months: number; amountEgp: number; startsAt: string; endsAt: string; paymentRef: string | null }[];
};

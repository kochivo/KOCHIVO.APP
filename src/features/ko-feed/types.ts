export type UrgentKind = 'swap_requested' | 'join_requested' | 'expired' | 'expiring' | 'sessions_used_up' | 'inactive' | 'today_workout' | 'my_expiring';
export type GenerateKind = 'no_program' | 'no_nutrition' | 'log_meal';
type FeedBase = { key: string; player_id: string; player_name: string; data: Record<string, unknown> };
export type KoFeedItem = FeedBase & (
  { kind: UrgentKind; severity: 'urgent' } | { kind: GenerateKind; severity: 'generate' }
);

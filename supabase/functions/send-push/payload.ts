import { messages } from './messages.ts';

export type NotificationType = Exclude<keyof typeof messages.ar,
  'title' | 'subscription_expiring_player' | 'subscription_expired_player' | `rank_up_${string}`>;
export interface PushNotificationRow { id: string; type: NotificationType; payload: unknown; player_id?: string }

export function pushPayload(row: PushNotificationRow, locale: 'ar' | 'en' = 'ar') {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const field = (key: string) => key in payload && typeof Reflect.get(payload, key) === 'string'
    ? String(Reflect.get(payload, key)) : '';
  const player = row.type === 'workout_feedback' ? row.player_id ?? '' : field('player_id');
  const playerExpiry = (row.type === 'subscription_expiring' || row.type === 'subscription_expired') && !player;
  const tier = field('tier');
  const key = row.type === 'rank_up' && (tier === 'champion' || tier === 'elite' || tier === 'legend')
    ? `rank_up_${tier}` as const
    : playerExpiry ? `${row.type}_player` as 'subscription_expiring_player' | 'subscription_expired_player' : row.type;
  const name = field(playerExpiry ? 'captain_name' : row.type === 'workout_reminder' ? 'day_title' : 'name');
  const rank = row.type === 'rank_up' || row.type === 'crown_taken' || row.type === 'crown_lost';
  const path = rank ? '/player/rank' : playerExpiry ? '/player' : row.type === 'captain_approved' ? '/captain' : row.type === 'nutrition_updated' ? '/player/nutrition'
    : row.type === 'plan_assigned' || row.type === 'workout_reminder' ? '/player'
      : row.type === 'join_requested' || !player ? '/captain/players' : `/captain/players/${encodeURIComponent(player)}`;
  return { title: messages[locale].title, body: messages[locale][key].replace('{name}', () => name),
    url: `/${locale}${path}`, tag: row.id };
}

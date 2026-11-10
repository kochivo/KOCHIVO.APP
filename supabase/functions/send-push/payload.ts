import { messages } from './messages.ts';

export type NotificationType = Exclude<keyof typeof messages.ar,
  'title' | 'subscription_expiring_player' | 'subscription_expired_player' | 'crown_close_points' | `rank_up_${string}`>;
export interface PushNotificationRow { id: string; type: NotificationType; payload: unknown; player_id?: string }

export function pushPayload(row: PushNotificationRow, locale: 'ar' | 'en' = 'ar') {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const field = (key: string) => key in payload && typeof Reflect.get(payload, key) === 'string'
    ? String(Reflect.get(payload, key)) : '';
  const player = row.type === 'workout_feedback' ? row.player_id ?? '' : field('player_id');
  const playerExpiry = (row.type === 'subscription_expiring' || row.type === 'subscription_expired') && !player;
  const tier = field('tier');
  const number = (key: string) => {
    const value: unknown = Reflect.get(payload, key);
    return typeof value === 'number' && Number.isFinite(value) && value>=0 ? value : 0;
  };
  const needsWorkouts = number('needs_workouts');
  const gap = number('gap');
  const key = row.type === 'rank_up' && (tier === 'champion' || tier === 'elite' || tier === 'legend')
    ? `rank_up_${tier}` as const
    : row.type === 'crown_close' && needsWorkouts===0 && gap>0 ? 'crown_close_points'
      : playerExpiry ? `${row.type}_player` as 'subscription_expiring_player' | 'subscription_expired_player' : row.type;
  const name = field(playerExpiry ? 'captain_name' : row.type === 'workout_reminder' ? 'day_title' : 'name');
  const rank = row.type === 'rank_up' || row.type === 'crown_taken' || row.type === 'crown_lost'
    || row.type === 'crown_close' || row.type === 'crown_defend';
  const path = rank ? '/player/rank' : playerExpiry ? '/player' : row.type === 'captain_approved' ? '/captain' : row.type === 'nutrition_updated' ? '/player/nutrition'
    : row.type === 'plan_assigned' || row.type === 'workout_reminder' ? '/player'
      : row.type === 'join_requested' || !player ? '/captain/players' : `/captain/players/${encodeURIComponent(player)}`;
  const body = row.type === 'crown_close'
    ? messages[locale][key].replace('{n}', String(needsWorkouts)).replace('{gap}', String(gap))
    : messages[locale][key].replace('{name}', () => name);
  return { title: messages[locale].title, body,
    url: `/${locale}${path}`, tag: row.id };
}

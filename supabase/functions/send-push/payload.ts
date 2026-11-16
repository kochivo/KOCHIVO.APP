import { messages } from './messages.ts';

export type NotificationType = Exclude<keyof typeof messages.ar,
  'title' | 'subscription_expiring_player' | 'subscription_expired_player' | 'crown_close_points' | `rank_up_${string}`
  | 'coach_replied_form_check' | 'swap_decided_declined'>;
export interface PushNotificationRow { id: string; type: NotificationType; payload: unknown; player_id?: string }

export function pushPayload(row: PushNotificationRow, locale: 'ar' | 'en' = 'ar', style: 'egyptian' | 'standard' = 'egyptian') {
  const dictionary = locale === 'ar' && style === 'standard' ? messages.arStd : messages[locale];
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
  const key = row.type === 'coach_replied' && field('kind') === 'form_check' ? 'coach_replied_form_check'
    : row.type === 'swap_decided' && field('status') === 'declined' ? 'swap_decided_declined'
    : row.type === 'rank_up' && (tier === 'champion' || tier === 'elite' || tier === 'legend')
    ? `rank_up_${tier}` as const
    : row.type === 'crown_close' && needsWorkouts===0 && gap>0 ? 'crown_close_points'
      : playerExpiry ? `${row.type}_player` as 'subscription_expiring_player' | 'subscription_expired_player' : row.type;
  const captainEvent = ['checkin_submitted', 'form_answered', 'swap_requested', 'form_check_submitted', 'receipt_submitted'].includes(row.type);
  const name = field(playerExpiry || row.type === 'coach_replied' || row.type === 'swap_decided' ? 'captain_name'
    : row.type === 'workout_reminder' ? 'day_title' : row.type === 'player_pain' || captainEvent ? 'display_name' : 'name');
  const rank = row.type === 'rank_up' || row.type === 'crown_taken' || row.type === 'crown_lost'
    || row.type === 'crown_close' || row.type === 'crown_defend';
  const playerPath = player ? `/captain/players/${encodeURIComponent(player)}` : '';
  const importantPath = row.type === 'receipt_submitted' ? '/captain/billing'
    : row.type === 'coach_replied' ? '/player/captain' : row.type === 'swap_decided' ? '/player'
    : row.type === 'swap_requested' ? playerPath || '/captain/players'
    : row.type === 'form_check_submitted' ? '/captain/tasks'
    : row.type === 'checkin_submitted' ? playerPath ? `${playerPath}/checkins` : '/captain/players'
    : row.type === 'form_answered' ? playerPath ? `${playerPath}/assessments${field('request_id')
      ? `?requestId=${encodeURIComponent(field('request_id'))}#assessment-details` : ''}` : '/captain/players' : undefined;
  const path = importantPath ?? (row.type === 'ramadan_soon' ? '/captain/settings#ramadan' : row.type === 'pain_answered' ? '/player/captain' : row.type === 'player_pain' && player ? `/captain/players/${encodeURIComponent(player)}#pain-reports`
    : rank ? '/player/rank' : playerExpiry ? '/player' : row.type === 'captain_approved' ? '/captain' : row.type === 'nutrition_updated' ? '/player/nutrition'
    : row.type === 'plan_assigned' || row.type === 'workout_reminder' ? '/player'
      : row.type === 'join_requested' || !player ? '/captain/players' : `/captain/players/${encodeURIComponent(player)}`);
  const body = row.type === 'crown_close'
    ? dictionary[key].replace('{n}', String(needsWorkouts)).replace('{gap}', String(gap))
    : dictionary[key].replace('{name}', () => name);
  return { title: dictionary.title, body,
    url: `/${locale}${path}`, tag: row.id };
}

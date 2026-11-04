import { messages } from './messages.ts';

export type NotificationType = Exclude<keyof typeof messages.ar, 'title'>;
export interface PushNotificationRow { id: string; type: NotificationType; payload: unknown }

export function pushPayload(row: PushNotificationRow, locale: 'ar' | 'en' = 'ar') {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const field = (key: string) => key in payload && typeof Reflect.get(payload, key) === 'string'
    ? String(Reflect.get(payload, key)) : '';
  const name = field(row.type === 'workout_reminder' ? 'day_title' : 'name');
  const player = field('player_id');
  const path = row.type === 'nutrition_updated' ? '/player/nutrition'
    : row.type === 'plan_assigned' || row.type === 'workout_reminder' ? '/player'
      : row.type === 'join_requested' || !player ? '/captain/players' : `/captain/players/${encodeURIComponent(player)}`;
  return { title: messages[locale].title, body: messages[locale][row.type].replace('{name}', () => name),
    url: `/${locale}${path}`, tag: row.id };
}

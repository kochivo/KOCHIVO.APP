export type NotificationType = 'plan_assigned' | 'nutrition_updated' | 'player_joined' | 'player_inactive';
export interface Notification {
  id: string;
  type: NotificationType;
  payload: { name: string; player_id?: string; plan_id?: string };
  is_read: boolean;
  created_at: string;
}
export interface ReadState { rows: Notification[]; count: number }

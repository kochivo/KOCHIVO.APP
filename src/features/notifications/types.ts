export type NotificationType = 'plan_assigned' | 'nutrition_updated' | 'player_joined' | 'player_inactive'
  | 'join_requested' | 'workout_reminder' | 'workout_feedback' | 'captain_approved' | 'sessions_used_up'
  | 'subscription_expiring' | 'subscription_expired';
export interface Notification {
  id: string;
  type: NotificationType;
  payload: { name?: string; player_id?: string; plan_id?: string; captain_name?: string; access_until?: string; days_left?: number };
  is_read: boolean;
  created_at: string;
}
export interface ReadState { rows: Notification[]; count: number }

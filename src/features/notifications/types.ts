import type { NotificationType } from '@/types/enums';
export type { NotificationType } from '@/types/enums';
export interface Notification {
  id: string;
  type: NotificationType;
  payload: { name?: string; player_id?: string; plan_id?: string; captain_name?: string; access_until?: string; days_left?: number;
    tier?: string; needs_workouts?: number; gap?: number; request_id?: string; form_id?: string };
  is_read: boolean;
  created_at: string;
}
export interface ReadState { rows: Notification[]; count: number }

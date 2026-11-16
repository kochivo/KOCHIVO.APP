import type { NotificationType } from '@/types/enums';
export type { NotificationType } from '@/types/enums';
export interface Notification {
  id: string;
  user_id?: string;
  type: NotificationType;
  payload: { name?: string; player_id?: string; plan_id?: string; captain_name?: string; access_until?: string; days_left?: number;
    tier?: string; medal?: string; display_name?: string; needs_workouts?: number; gap?: number; request_id?: string; form_id?: string;
    report_id?: string; reply?: string; checkin_id?: string; form_check_id?: string; receipt_id?: string;
    program_exercise_id?: string; kind?: 'checkin' | 'form_check'; status?: 'approved' | 'declined' };
  is_read: boolean;
  created_at: string;
}
export interface ReadState { rows: Notification[]; count: number }

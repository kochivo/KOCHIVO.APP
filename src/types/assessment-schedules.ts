export type AssessmentKind = 'once' | 'week' | 'month' | 'days' | 'on_join';
export type AssessmentSchedule = {
  id: string; form_id: string; captain_id: string; player_id: string | null;
  kind: AssessmentKind; every_days: number | null; weekday: number | null; day: number | null;
  hour: number; minute: number; starts_on: string; ends_on: string | null; max_times: number | null;
  remind_after_hours: 12 | 24 | null; paused_at: string | null; created_at: string; updated_at: string;
};
export type AssessmentSchedulesTable = {
  Row: AssessmentSchedule;
  Insert: Omit<AssessmentSchedule, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
  Update: Partial<Omit<AssessmentSchedule, 'id' | 'created_at' | 'updated_at'>>;
  Relationships: [];
};

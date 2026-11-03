interface InboxBase {
  id: string;
  player_id: string;
  player_name: string;
  created_at: string;
  reviewed_at: string | null;
  reply: string | null;
}
export type InboxItem = InboxBase & (
  | { kind: 'form'; exercise_name: string; note: string | null }
  | { kind: 'checkin'; week_start: string; body_weight_kg: number | null; waist_cm: number | null; notes: string | null }
);
export type Result<T> = { data: T; error?: never } | { error: string; data?: never };

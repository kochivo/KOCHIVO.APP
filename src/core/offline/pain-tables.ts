export const painAreas = ['neck', 'shoulder_l', 'shoulder_r', 'elbow_l', 'elbow_r', 'wrist_l', 'wrist_r',
  'upper_back', 'lower_back', 'chest', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r', 'other'] as const;
export type PainArea = typeof painAreas[number];
export type PainReply = 'swap_2w' | 'reduce_20' | 'rest_week' | 'talk';
export interface PainReportRow {
  exercise_id?: string;
  id: string; captain_id: string; session_id: string | null; program_exercise_id: string | null;
  set_index: number | null; area: PainArea; side_view: 'front' | 'back'; severity: number;
  kind: 'sharp' | 'strain' | 'tired'; created_at: string;
}
export interface PainLoadHint {
  player_id: string; program_exercise_id: string; factor: number; until: string; since?: string;
}

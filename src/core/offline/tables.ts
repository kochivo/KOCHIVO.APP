/**
 * The offline sync contract. Local rows use the exact server column names (snake_case)
 * so there is no mapping layer to drift. player_id is never sent: the server sets it from auth.uid().
 * Ids come from stableId() (ids.ts): session = (program_day_id, training_date),
 * set = (session_id, program_exercise_id, set_index), meal log = (meal_id, log_date).
 * Must stay in step with supabase/migrations/0006_workout_logs.sql and 0007_nutrition.sql.
 */

import type { Tables } from '@/types/database';
import type { Narrow } from '@/types/app-database';
import type { SupplementTiming } from '@/types/enums';
import type { PainReportRow } from './pain-tables';
import type { Macros } from '@/lib/macros';

type LocalRow<Name extends 'workout_sessions' | 'set_logs' | 'meal_logs' | 'daily_checks' | 'supplement_logs'> =
  Omit<Tables<Name>, 'player_id' | 'server_updated_at'>;

// Local sessions retain their day; sync nulls deleted plan references on the server.
export type WorkoutSessionRow = Narrow<LocalRow<'workout_sessions'>, {
  program_day_id: string;
  // Older cached rows predate session feedback.
  session_rpe?: Tables<'workout_sessions'>['session_rpe'];
  player_note?: Tables<'workout_sessions'>['player_note'];
}>;

// Local sets retain their plan exercise; sync nulls deleted plan references on the server.
export type SetLogRow = Narrow<LocalRow<'set_logs'>, { program_exercise_id: string; drop_index?: number }>;

// Synced meal history can outlive its plan reference.
export type MealLogRow = Narrow<LocalRow<'meal_logs'>, {
  meal_id: string | null; swaps: Record<string, string>; eaten_macros?: { [K in keyof Macros]: number } | null;
}>;

export interface SyncRows {
  pain_reports: PainReportRow;
  daily_checks: DailyCheckRow;
  supplement_logs: SupplementLogRow;
  workout_sessions: WorkoutSessionRow;
  set_logs: SetLogRow;
  meal_logs: MealLogRow;
  check_ins: CheckInRow;
}

export type SyncTable = keyof SyncRows;

/** Flush order respects foreign keys: a session must exist before its sets. */
export const SYNC_ORDER: readonly SyncTable[] = ['workout_sessions', 'set_logs', 'meal_logs', 'supplement_logs', 'daily_checks', 'pain_reports', 'check_ins'];

export const SYNC_DEPENDENCIES: {
  [T in SyncTable]?: readonly { parent: SyncTable; key: keyof SyncRows[T] }[];
} = {
  pain_reports: [{ parent: 'workout_sessions', key: 'session_id' }],
  set_logs: [{ parent: 'workout_sessions', key: 'session_id' }],
};

export type DailyCheckRow = LocalRow<'daily_checks'>;
export type SupplementLogRow = LocalRow<'supplement_logs'>;

// Weekly check-ins: player-owned columns only (the server sets player_id from auth.uid()
// and captain_id from the trigger). photo_paths holds null placeholders until each photo
// uploads; photo_total is local-only and guards the queue-until-complete check.
export interface CheckInRow {
  id: string;
  week_start: string;
  body_weight_kg: number | null;
  waist_cm: number | null;
  notes: string | null;
  photo_paths: (string | null)[];
  body_fat_pct: number | null;
  photo_poses: string[];
  photo_total: number;
}

// The supplements timing CHECK restricts server text to these values.
export type SupplementRow = Narrow<Tables<'supplements'>, { timing: SupplementTiming }>;

/**
 * The offline sync contract. Local rows use the exact server column names (snake_case)
 * so there is no mapping layer to drift. player_id is never sent: the server sets it from auth.uid().
 * Ids come from stableId() (ids.ts): session = (program_day_id, training_date),
 * set = (session_id, program_exercise_id, set_index), meal log = (meal_id, log_date).
 * Must stay in step with supabase/migrations/0006_workout_logs.sql and 0007_nutrition.sql.
 */

export interface WorkoutSessionRow {
  id: string;
  program_day_id: string;
  /** YYYY-MM-DD in the player's timezone (see lib/dates.ts). */
  training_date: string;
  started_at: string;
  completed_at: string | null;
  client_updated_at: string;
}

export interface SetLogRow {
  id: string;
  session_id: string;
  program_exercise_id: string;
  /** Copied from the program so strength history survives program edits. */
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  completed_at: string;
  client_updated_at: string;
  deleted_at: string | null;
}

export interface MealLogRow {
  id: string;
  meal_id: string;
  log_date: string;
  /** meal_item_id → meal_item_alternative_id chosen with the swap button. */
  swaps: Record<string, string>;
  completed_at: string | null;
  client_updated_at: string;
  deleted_at: string | null;
}

export interface SyncRows {
  workout_sessions: WorkoutSessionRow;
  set_logs: SetLogRow;
  meal_logs: MealLogRow;
}

export type SyncTable = keyof SyncRows;

/** Flush order respects foreign keys: a session must exist before its sets. */
export const SYNC_ORDER: readonly SyncTable[] = ['workout_sessions', 'set_logs', 'meal_logs'];

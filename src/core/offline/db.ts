import Dexie, { type Table } from 'dexie';
import type { DailyCheckRow, SupplementLogRow, SupplementRow } from './tables';
import type { MealLogRow, SetLogRow, SyncTable, WorkoutSessionRow } from './tables';

export interface SnapshotExercise {
  id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps_min: number;
  reps_max: number | null;
  rest_seconds: number;
  superset_group: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
  name_ar: string | null;
  name_en: string;
  media_path: string | null;
  video_url?: string | null;
}

export interface SnapshotDay {
  id: string;
  position: number;
  title: string;
  exercises: SnapshotExercise[];
  weekday?: number | null;
  is_rest_day?: boolean;
  cardio?: { id: string; day_id: string; position: number; kind: string; minutes: number; intensity: string; notes: string }[];
}

export interface ProgramSnapshot {
  id: 'active';
  player_id: string;
  program_id: string;
  title: string;
  notes: string | null;
  settings: { advanced?: boolean; repeatWeekly?: boolean };
  starts_on?: string;
  training_days: number[];
  days: SnapshotDay[];
}

export interface OutboxEntry {
  owner_id?: string;
  id?: number;
  table: SyncTable;
  row_id: string;
  /** Bumped on every local re-save, so a sync that sent an older version keeps the entry. */
  revision: number;
  enqueued_at: number;
  attempts: number;
  next_attempt_at: number;
  last_error?: string;
}

export interface MediaQueueEntry {
  id?: number;
  kind: 'form_check';
  /** Server row id, fixed at enqueue so a retried insert hits 23505 instead of duplicating. */
  form_check_id: string;
  blob: Blob;
  mime: string;
  exercise_id: string;
  set_log_id: string | null;
  note: string | null;
  created_at: number;
  attempts: number;
  next_attempt_at: number;
  video_path?: string;
  last_error?: string;
}

export interface NutritionFood {
  name: string;
  grams: number;
  photo_path: string | null;
  per100g: { kcal: number; protein: number; carbs: number; fat: number };
}

export interface NutritionAlternative extends NutritionFood { id: string }

export interface NutritionItem extends NutritionFood {
  id: string;
  position: number;
  alternatives: NutritionAlternative[];
}

export interface NutritionMeal {
  id: string;
  position: number;
  name: string;
  items: NutritionItem[];
}

export interface NutritionSnapshot {
  id: 'active';
  player_id: string;
  plan_id: string;
  title: string;
  targets: { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };
  meals: NutritionMeal[];
}

/**
 * On-device database. Feature caches (today's program snapshot, nutrition plan) are added
 * here as new versions — never change an existing version's schema, add version(n+1).
 */
export class KochivoDB extends Dexie {
  daily_checks!: Table<DailyCheckRow, string>;
  supplement_logs!: Table<SupplementLogRow, string>;
  supplements!: Table<SupplementRow, string>;
  workout_sessions!: Table<WorkoutSessionRow, string>;
  set_logs!: Table<SetLogRow, string>;
  meal_logs!: Table<MealLogRow, string>;
  outbox!: Table<OutboxEntry, number>;
  program_snapshot!: Table<ProgramSnapshot, string>;
  nutrition_snapshot!: Table<NutritionSnapshot, string>;
  media_queue!: Table<MediaQueueEntry, number>;

  constructor(name = 'kochivo', readonly userId?: string) {
    super(name);
    this.version(1).stores({
      workout_sessions: 'id, training_date',
      set_logs: 'id, session_id, &[session_id+program_exercise_id+set_index]',
      meal_logs: 'id, &[meal_id+log_date]',
      outbox: '++id, &[table+row_id], next_attempt_at',
    });
    this.version(2).stores({ program_snapshot: 'id' });
    this.version(3).stores({ nutrition_snapshot: 'id' });
    this.version(4).stores({ media_queue: '++id, next_attempt_at' });
    this.version(5).stores({ supplement_logs: 'id, &[supplement_id+log_date]', supplements: 'id, player_id' });
    this.version(6).stores({ daily_checks: 'id, log_date' });
  }
}

let instance: KochivoDB | undefined;
let currentUser: string | null = null;

export async function setLocalUser(userId: string | null): Promise<void> {
  if (currentUser === userId && instance) return;
  instance?.close();
  instance = undefined;
  currentUser = userId;
  if (!userId) return;
  const db = new KochivoDB(`kochivo-${userId}`, userId);
  instance = db;
  const { migrateLegacyDb } = await import('./legacy-db');
  await migrateLegacyDb(db, userId);
}

export function localDb(): KochivoDB {
  if (!instance || !currentUser) throw new Error('Local user is not authenticated');
  return instance;
}

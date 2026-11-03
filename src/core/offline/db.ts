import Dexie, { type Table } from 'dexie';
import type { MealLogRow, SetLogRow, SyncTable, WorkoutSessionRow } from './tables';

export interface OutboxEntry {
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

/**
 * On-device database. Feature caches (today's program snapshot, nutrition plan) are added
 * here as new versions — never change an existing version's schema, add version(n+1).
 */
export class KochivoDB extends Dexie {
  workout_sessions!: Table<WorkoutSessionRow, string>;
  set_logs!: Table<SetLogRow, string>;
  meal_logs!: Table<MealLogRow, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor(name = 'kochivo') {
    super(name);
    this.version(1).stores({
      workout_sessions: 'id, training_date',
      set_logs: 'id, session_id, &[session_id+program_exercise_id+set_index]',
      meal_logs: 'id, &[meal_id+log_date]',
      outbox: '++id, &[table+row_id], next_attempt_at',
    });
  }
}

let instance: KochivoDB | undefined;

export function localDb(): KochivoDB {
  instance ??= new KochivoDB();
  return instance;
}

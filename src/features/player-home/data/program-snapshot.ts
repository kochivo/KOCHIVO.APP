import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgramSnapshot, SnapshotExercise } from '@/core/offline';
import type { Database } from '@/types/database';

export type { ProgramSnapshot } from '@/core/offline';

type ExerciseResponse = Omit<SnapshotExercise, 'name_ar' | 'name_en' | 'media_path'> & {
  exercises: Pick<SnapshotExercise, 'name_ar' | 'name_en' | 'media_path'> | null;
};
export interface ProgramResponse {
  id: string;
  title: string;
  notes: string | null;
  settings: { advanced?: boolean };
  program_days: { id: string; position: number; title: string; program_exercises: ExerciseResponse[] }[];
}

type ReadTable<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };
interface SnapshotDatabase {
  public: {
    Tables: {
      programs: ReadTable<ProgramResponse & { player_id: string; status: string }>;
      player_intake: ReadTable<{ player_id: string; training_days: number[] }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export function mapProgramSnapshot(program: ProgramResponse, trainingDays: number[], playerId: string): ProgramSnapshot {
  return {
    id: 'active', player_id: playerId, program_id: program.id, title: program.title, notes: program.notes,
    settings: program.settings, training_days: [...trainingDays],
    days: [...program.program_days].sort((a, b) => a.position - b.position).map((day) => ({
      id: day.id, position: day.position, title: day.title,
      exercises: [...day.program_exercises].sort((a, b) => a.position - b.position).map(({ exercises, ...exercise }) => ({
        ...exercise, name_ar: exercises?.name_ar ?? null, name_en: exercises?.name_en ?? '',
        media_path: exercises?.media_path ?? null,
      })),
    })),
  };
}

export async function fetchProgramSnapshot(client: SupabaseClient<Database>): Promise<ProgramSnapshot | null> {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  // Replace this narrow schema view when generated database types include the program tables.
  const reader = client as unknown as SupabaseClient<SnapshotDatabase>;
  const [program, intake] = await Promise.all([
    reader.from('programs').select('id,title,notes,settings,program_days(id,position,title,program_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,superset_group,rpe,tempo,notes,exercises(name_ar,name_en,media_path)))')
      .eq('player_id', auth.user.id).eq('status', 'active').maybeSingle<ProgramResponse>(),
    reader.from('player_intake').select('training_days').eq('player_id', auth.user.id).maybeSingle<{ training_days: number[] }>(),
  ]);
  if (program.error) throw program.error;
  if (intake.error) throw intake.error;
  return program.data ? mapProgramSnapshot(program.data, intake.data?.training_days ?? [], auth.user.id) : null;
}

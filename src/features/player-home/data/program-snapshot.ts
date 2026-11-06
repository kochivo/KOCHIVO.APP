import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ProgramSnapshot } from '@/core/offline';
import type { Database, Tables } from '@/types/database';

export type { ProgramSnapshot } from '@/core/offline';

type ExerciseResponse = Pick<Tables<'program_exercises'>,
  'id' | 'exercise_id' | 'position' | 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'superset_group' | 'rpe' | 'tempo' | 'notes'> & {
  rir?: number | null;
  exercises: Pick<Tables<'exercises'>, 'name_ar' | 'name_en' | 'media_path'> & { video_url?: string | null } | null;
};
export type ProgramResponse = Pick<Tables<'programs'>, 'id' | 'title' | 'notes' | 'settings'> & {
  program_days: (Pick<Tables<'program_days'>, 'id' | 'position' | 'title'> & {
    weekday?: number | null; is_rest_day?: boolean; program_cardio?: Tables<'program_cardio'>[];
    program_exercises: ExerciseResponse[];
  })[];
};
const settingsSchema = z.object({ advanced: z.boolean().optional(), repeatWeekly: z.boolean().optional(),
  weeklyStartedOn: z.iso.date().optional() }).passthrough();
export function mapProgramSnapshot(program: ProgramResponse, trainingDays: number[], playerId: string): ProgramSnapshot {
  const settings = settingsSchema.parse(program.settings);
  if (program.program_days.some(day => day.weekday != null)) settings.repeatWeekly ??= true;
  return {
    id: 'active', player_id: playerId, program_id: program.id, title: program.title, notes: program.notes,
    settings, starts_on: settings.weeklyStartedOn, training_days: [...trainingDays],
    days: [...program.program_days].sort((a, b) => a.position - b.position).map((day) => ({
      id: day.id, position: day.position, title: day.title,
      weekday: day.weekday ?? null, is_rest_day: day.is_rest_day ?? false,
      cardio: [...(day.program_cardio ?? [])].sort((a, b) => a.position - b.position),
      exercises: [...day.program_exercises].sort((a, b) => a.position - b.position).map(({ exercises, ...exercise }) => ({
        ...exercise, rir: exercise.rir ?? null, name_ar: exercises?.name_ar ?? null, name_en: exercises?.name_en ?? '',
        media_path: exercises?.media_path ?? null,
        video_url: exercises?.video_url ?? null,
      })),
    })),
  };
}

export async function fetchProgramSnapshot(client: SupabaseClient<Database>): Promise<ProgramSnapshot | null> {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  const [program, intake] = await Promise.all([
    client.from('programs').select('id,title,notes,settings,program_days(id,position,title,weekday,is_rest_day,program_cardio(*),program_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,superset_group,rpe,rir,tempo,notes,exercises(name_ar,name_en,media_path,video_url)))')
      .eq('player_id', auth.user.id).eq('status', 'active').maybeSingle(),
    client.from('player_intake').select('training_days').eq('player_id', auth.user.id).maybeSingle(),
  ]);
  if (program.error) throw program.error;
  if (intake.error) throw intake.error;
  return program.data ? mapProgramSnapshot(program.data, intake.data?.training_days ?? [], auth.user.id) : null;
}

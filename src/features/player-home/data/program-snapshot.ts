import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { ProgramSnapshot } from '@/core/offline';
import type { Tables } from '@/types/database';
import type { AppDatabase as Database } from '@/types/app-database';
import type { PainLoadHint } from '@/core/offline/pain-tables';
import type { DayWarmup } from '@/features/programs';
import { setPlanSchema } from '@/lib/set-plan';

export type { ProgramSnapshot } from '@/core/offline';

type ExerciseResponse = Pick<Tables<'program_exercises'>,
  'id' | 'exercise_id' | 'position' | 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'superset_group' | 'rpe' | 'tempo' | 'notes'> & {
  rir?: number | null;
  alternatives?: string[]; set_plan?: Tables<'program_exercises'>['set_plan'];
  exercises: Pick<Tables<'exercises'>, 'name_ar' | 'name_en' | 'media_path'> & { video_url?: string | null; body_part?: string } | null;
};
export type ProgramResponse = Pick<Tables<'programs'>, 'id' | 'title' | 'notes' | 'settings'> & { captain_id?: string;
  program_days: (Pick<Tables<'program_days'>, 'id' | 'position' | 'title'> & {
    weekday?: number | null; is_rest_day?: boolean; program_cardio?: Tables<'program_cardio'>[];
    warmup?: DayWarmup;
    program_exercises: ExerciseResponse[];
  })[];
};
const settingsSchema = z.object({ advanced: z.boolean().optional(), repeatWeekly: z.boolean().optional(),
  weeklyStartedOn: z.iso.date().optional() }).passthrough();
type Alternative = NonNullable<ProgramSnapshot['days'][number]['exercises'][number]['alternative_exercises']>[number];
export function mapProgramSnapshot(program: ProgramResponse, trainingDays: number[], playerId: string, alternatives: Alternative[] = []): ProgramSnapshot {
  const settings = settingsSchema.parse(program.settings);
  if (program.program_days.some(day => day.weekday != null)) settings.repeatWeekly ??= true;
  return {
    id: 'active', player_id: playerId, captain_id: program.captain_id, program_id: program.id, title: program.title, notes: program.notes,
    settings, starts_on: settings.weeklyStartedOn, training_days: [...trainingDays],
    days: [...program.program_days].sort((a, b) => a.position - b.position).map((day) => ({
      id: day.id, position: day.position, title: day.title,
      weekday: day.weekday ?? null, is_rest_day: day.is_rest_day ?? false,
      warmup: day.warmup ?? { items: [], ramp: false },
      cardio: [...(day.program_cardio ?? [])].sort((a, b) => a.position - b.position),
      exercises: [...day.program_exercises].sort((a, b) => a.position - b.position).map(({ exercises, set_plan, ...exercise }) => ({
        ...exercise, rir: exercise.rir ?? null, name_ar: exercises?.name_ar ?? null, name_en: exercises?.name_en ?? '',
        ...(set_plan ? { set_plan: setPlanSchema.parse(set_plan) } : {}),
        ...(exercise.alternatives?.length ? { alternative_exercises: exercise.alternatives.flatMap(id => alternatives.find(row => row.id === id) ?? []) } : {}),
        media_path: exercises?.media_path ?? null,
        video_url: exercises?.video_url ?? null,
        // The pain check needs the body part on every device, not only in the captain workspace build.
        body_part: exercises?.body_part ?? null,
      })),
    })),
  };
}

export async function fetchProgramSnapshot(client: SupabaseClient<Database>): Promise<ProgramSnapshot | null> {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  const expired = await client.rpc('expire_pain_swaps');
  if (expired.error) throw expired.error;
  const exerciseFields = 'name_ar,name_en,media_path,video_url,body_part';
  const [program, intake] = await Promise.all([
    client.from('programs').select(`id,captain_id,title,notes,settings,program_days(id,position,title,weekday,is_rest_day,warmup,program_cardio(*),program_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,superset_group,rpe,rir,tempo,notes,alternatives,set_plan,exercises(${exerciseFields})))`)
      .eq('player_id', auth.user.id).eq('status', 'active').returns<ProgramResponse[]>().maybeSingle(),
    client.from('player_intake').select('training_days').eq('player_id', auth.user.id).maybeSingle(),
  ]);
  if (program.error) throw program.error;
  if (intake.error) throw intake.error;
  if (!program.data) return null;
  const ids = [...new Set(program.data.program_days.flatMap(day => day.program_exercises.flatMap(row => row.alternatives ?? [])))];
  const alternatives = ids.length ? await client.from('exercises').select('id,name_ar,name_en,media_path,video_url,body_part').in('id', ids)
    : { data: [], error: null };
  if (alternatives.error) throw alternatives.error;
  const hints = await client.from('pain_load_hints').select('*').eq('player_id', auth.user.id);
  if (hints.error) throw hints.error;
  const snapshot = mapProgramSnapshot(program.data, intake.data?.training_days ?? [], auth.user.id, alternatives.data ?? []);
  const byExercise = new Map((hints.data as PainLoadHint[]).map(row => [row.program_exercise_id, row]));
  const allIds = [...new Set([...ids, ...snapshot.days.flatMap(day => day.exercises.map(row => row.exercise_id))])];
  const tags = allIds.length ? await client.from('exercise_generator_tags').select('exercise_id,pattern,stress').in('exercise_id', allIds) : { data: [], error: null };
  if (tags.error) throw tags.error;
  const byId = new Map(tags.data?.map(row => [row.exercise_id, row]));
  for (const day of snapshot.days) for (const row of day.exercises) {
    row.pain_hint = byExercise.get(row.id); row.pattern = byId.get(row.exercise_id)?.pattern;
    row.alternative_exercises = row.alternative_exercises?.map(alt => ({ ...alt, pattern: byId.get(alt.id)?.pattern, stress: byId.get(alt.id)?.stress }));
  }
  return snapshot;
}

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isWeeklyProgram } from '@/core/offline/program-cycle';
import { pickTodayDay } from '@/features/player-home';
import { isRestDay, mapProgramSnapshot } from '@/features/player-home/server';
import type { AppDatabase } from '@/types/app-database';
import type { Tables } from '@/types/database';
import type { ToolContext } from '../types';

type ProgramResponse = Parameters<typeof mapProgramSnapshot>[0];
type ScheduleDatabase = {
  public: Omit<AppDatabase['public'], 'Views'> & {
    Views: AppDatabase['public']['Views'] & {
      ai_player_training_days: { Row: { training_days: number[] }; Relationships: [] };
      ai_player_workout_history: {
        Row: Pick<Tables<'workout_sessions'>, 'id' | 'player_id' | 'program_day_id' | 'training_date' | 'completed_at'>;
        Relationships: [];
      };
    };
  };
};

export async function playerWorkout(ctx: ToolContext, today: string) {
  const { id, db } = ctx.actor;
  const program = await db.from('programs')
    .select('id,title,notes,settings,program_days(id,position,title,weekday,is_rest_day,program_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,superset_group,rpe,tempo,notes,set_plan,exercises(name_ar,name_en,media_path)))')
    .eq('player_id', id).eq('status', 'active').eq('is_template', false)
    .abortSignal(ctx.signal).returns<ProgramResponse[]>().maybeSingle();
  if (program.error) throw program.error;
  if (!program.data?.program_days.length) return null;

  const snapshot = mapProgramSnapshot(program.data, [], id);
  if (isWeeklyProgram(snapshot)) {
    const day = pickTodayDay(snapshot, [], today);
    return { day, rest: !day || day.is_rest_day };
  }

  // The view exposes only the signed-in player's training days from private intake.
  const scheduleDb = db as unknown as SupabaseClient<ScheduleDatabase>;
  const sessions = () => scheduleDb.from('ai_player_workout_history').select('id,program_day_id,training_date,completed_at')
    .eq('player_id', id).in('program_day_id', snapshot.days.map(day => day.id)).abortSignal(ctx.signal);
  const [schedule, logged, latest] = await Promise.all([
    scheduleDb.from('ai_player_training_days').select('training_days').abortSignal(ctx.signal).maybeSingle(),
    sessions().eq('training_date', today).order('id').limit(1).maybeSingle(),
    sessions().lt('training_date', today).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (schedule.error) throw schedule.error;
  if (logged.error) throw logged.error;
  if (latest.error) throw latest.error;
  snapshot.training_days = schedule.data?.training_days ?? [];
  const history = [logged.data, latest.data].filter(row => row !== null);
  const day = pickTodayDay(snapshot, history, today);
  return { day, rest: isRestDay(snapshot, history, today) || Boolean(day?.is_rest_day) };
}

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { isRestDay, mapProgramSnapshot } from '@/features/player-home/server';

export async function loadMealDay(client: SupabaseClient<AppDatabase>, playerId: string, today: string) {
  const [program, intake, sessions, decision] = await Promise.all([
    client.from('programs').select('id,title,notes,settings,program_days(id,position,title,weekday,is_rest_day)')
      .eq('player_id', playerId).eq('status', 'active').eq('is_template', false).maybeSingle(),
    client.from('player_intake').select('training_days').eq('player_id', playerId).maybeSingle(),
    client.from('workout_sessions').select('*').eq('player_id', playerId).eq('training_date', today),
    client.from('readiness_decisions').select('decision').eq('player_id', playerId).eq('decision_date', today).maybeSingle(),
  ]);
  if (program.error || intake.error || sessions.error || decision.error)
    throw program.error ?? intake.error ?? sessions.error ?? decision.error;
  if (decision.data?.decision === 'rest') return true;
  if (!program.data) return null;
  const snapshot = mapProgramSnapshot({ ...program.data, program_days: program.data.program_days.map(day => ({ ...day, program_exercises: [] })) },
    intake.data?.training_days ?? [], playerId);
  return isRestDay(snapshot, sessions.data.flatMap(row => row.program_day_id ? [{ ...row, program_day_id: row.program_day_id }] : []), today);
}

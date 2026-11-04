import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { saturdayWeek, weeklyWeekday } from '@/lib/dates';
import { waterGoalMl } from '../water';

export async function fetchCoachReadiness(playerId: string, today: string) {
  const client = await loadSupabaseBrowser();
  const week = saturdayWeek(today);
  const [checks, decisions, sessions, program, intake, weight] = await Promise.all([
    client.from('daily_checks').select('*').eq('player_id', playerId).is('deleted_at', null)
      .gte('log_date', week[0] ?? today).lte('log_date', week[6] ?? today),
    client.from('readiness_decisions').select('*').eq('player_id', playerId)
      .gte('decision_date', week[0] ?? today).lte('decision_date', week[6] ?? today),
    client.from('workout_sessions').select('id,program_day_id,training_date,completed_at').eq('player_id', playerId)
      .lte('training_date', today).order('training_date', { ascending: false }).limit(1000),
    client.from('programs').select('settings,program_days(id,position,weekday,is_rest_day,program_exercises(sets))')
      .eq('player_id', playerId).eq('status', 'active').maybeSingle(),
    client.from('player_intake').select('training_days,weight_kg').eq('player_id', playerId).maybeSingle(),
    client.from('check_ins').select('body_weight_kg').eq('player_id', playerId).not('body_weight_kg', 'is', null)
      .order('week_start', { ascending: false }).limit(1),
  ]);
  for (const result of [checks, decisions, sessions, program, intake, weight]) if (result.error) throw result.error;
  const days = [...(program.data?.program_days ?? [])].sort((a, b) => a.position - b.position);
  const weekly = days.some(day => day.weekday !== null);
  const relevant = sessions.data?.filter(session => days.some(day => day.id === session.program_day_id)) ?? [];
  const logged = relevant.find(session => session.training_date === today);
  const latest = relevant.filter(session => session.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '') || b.id.localeCompare(a.id))[0];
  const index = days.findIndex(day => day.id === latest?.program_day_id);
  const day = weekly ? days.find(day => day.weekday === weeklyWeekday(today)) :
    logged ? days.find(day => day.id === logged.program_day_id) : days[(index + 1) % days.length];
  const trainingDays = intake.data?.training_days ?? [];
  return { checks: checks.data ?? [], decisions: decisions.data ?? [], sessions: sessions.data ?? [],
    exercises: day?.is_rest_day ? [] : day?.program_exercises ?? [],
    goal: waterGoalMl(weight.data?.[0]?.body_weight_kg ?? intake.data?.weight_kg),
    training: week.filter(date => weekly ? days.some(day => day.weekday === weeklyWeekday(date) && !day.is_rest_day) :
      trainingDays.length === 0 || trainingDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())),
  };
}

export type CoachReadiness = Awaited<ReturnType<typeof fetchCoachReadiness>>;

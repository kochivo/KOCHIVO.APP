import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { getTimezone } from '@/core/timezone/server';
import { localDate, saturdayWeek } from '@/lib/dates';
import { fetchPlanSummary } from '@/features/billing/server';
import { monthlyPayments } from '../workspace-maths';
import { weekComparison } from '../home/model';

export interface ActivityEvent { id: string; playerId: string; name: string; kind: 'workout' | 'assessment' | 'weight'; at: string; title?: string; value?: number; sets?: number }
export async function loadHomeActivity(captain: string) {
  const client = await supabaseServer();
  // One embedded read across the captain's players; each event stream is bounded per player.
  const result = await client.from('coach_clients').select(`player_id,
    profiles!coach_clients_player_id_fkey(full_name,
      workout_sessions!workout_sessions_player_id_fkey(id,completed_at,program_days(title),set_logs(count)),
      form_requests!form_requests_player_id_fkey(id,answered_at,forms!form_requests_form_id_fkey(title)),
      check_ins!check_ins_player_id_fkey(id,created_at,body_weight_kg))`)
    .eq('captain_id', captain).is('archived_at', null)
    .not('profiles.workout_sessions.completed_at', 'is', null)
    .not('profiles.form_requests.answered_at', 'is', null)
    .not('profiles.check_ins.body_weight_kg', 'is', null)
    .order('completed_at', { referencedTable: 'profiles.workout_sessions', ascending: false })
    .order('answered_at', { referencedTable: 'profiles.form_requests', ascending: false })
    .order('created_at', { referencedTable: 'profiles.check_ins', ascending: false })
    .limit(5, { referencedTable: 'profiles.workout_sessions' })
    .limit(5, { referencedTable: 'profiles.form_requests' })
    .limit(5, { referencedTable: 'profiles.check_ins' });
  if (result.error) throw result.error;
  const events: ActivityEvent[] = [];
  for (const row of result.data) {
    const profile = row.profiles;
    if (!profile) continue;
    const base = { playerId: row.player_id, name: profile.full_name };
    for (const event of profile.workout_sessions) if (event.completed_at) events.push({ ...base, id: event.id, kind: 'workout', at: event.completed_at, title: event.program_days?.title, sets: event.set_logs?.[0]?.count });
    for (const event of profile.form_requests) if (event.answered_at) events.push({ ...base, id: event.id, kind: 'assessment', at: event.answered_at, title: event.forms?.title });
    for (const event of profile.check_ins) if (event.body_weight_kg !== null) events.push({ ...base, id: event.id, kind: 'weight', at: event.created_at, value: event.body_weight_kg });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id)).slice(0, 5);
}

export async function loadHomeSummary(now: Date) {
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error('Unauthorized');
  const captain = auth.data.claims.sub;
  const timezone = await getTimezone();
  const today = localDate(now, timezone);
  const week = saturdayWeek(today);
  const previous = new Date(`${week[0] ?? today}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 7);
  const previousStart = localDate(previous, 'UTC');
  // Broad UTC bounds include every timezone; calendar-month filtering below is exact.
  const first = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const start = new Date(first.getTime() - 86400000).toISOString();
  const end = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 2)).toISOString();
  const [payments, meals, programs, sessions, plan, activity, lastPayments, assessments] = await Promise.all([
    client.from('player_payments').select('created_at,amount_egp').eq('captain_id', captain).gte('created_at', start).lt('created_at', end),
    client.from('nutrition_plans').select('player_id').eq('captain_id', captain).eq('status', 'active').eq('is_template', false),
    client.from('programs').select('player_id,program_days(id,weekday,is_rest_day)').eq('captain_id', captain).eq('status', 'active').eq('is_template', false),
    client.from('workout_sessions').select('player_id,training_date,program_day_id').not('completed_at', 'is', null).gte('training_date', previousStart).lte('training_date', week[6]),
    fetchPlanSummary(), loadHomeActivity(captain),
    client.rpc('captain_last_payments'),
    client.from('form_requests').select('player_id').eq('captain_id', captain).not('answered_at', 'is', null).is('reviewed_at', null),
  ]);
  if (payments.error || meals.error || programs.error || sessions.error || lastPayments.error || assessments.error) throw payments.error ?? meals.error ?? programs.error ?? sessions.error ?? lastPayments.error ?? assessments.error;
  const adherence = weekComparison(programs.data.map(program => ({ playerId: program.player_id,
    days: program.program_days.filter(day => !day.is_rest_day).map(day => day.id) })),
  sessions.data.map(session => ({ playerId: session.player_id, dayId: session.program_day_id, date: session.training_date })), today);
  return { today, timezone, adherence: adherence.current, previousAdherence: adherence.previous, paid: monthlyPayments(payments.data, now, timezone),
    limit: plan?.plan.player_limit ?? null, mealPlanPlayers: new Set(meals.data.flatMap(row => row.player_id ? [row.player_id] : [])), activity,
    lastPayments: new Map(lastPayments.data.map(row => [row.player_id, localDate(new Date(row.created_at), timezone)])),
    assessments: assessments.data.reduce((counts, row) => counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1), new Map<string, number>()) };
}

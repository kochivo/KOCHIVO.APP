import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { foodName } from '@/lib/display-name';
import { getLocale } from '@/core/i18n/server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { mapProgramSnapshot, pickTodayDay } from '@/features/player-home/server';
import type { ProgramResponse } from '@/features/player-home';
import { mapNutritionSnapshot } from '@/features/nutrition/server';
import type { WorkoutSessionRow } from '@/core/offline';
import { localDate } from '@/lib/dates';
import { activityWeek } from '../week';
const input = z.object({ playerId: z.uuid(), today: z.iso.date() });

export async function fetchPlayerPreview(playerId: string, today: string) {
  const locale = await getLocale();
  const t = await getT(messages, locale);
  const error = t('failed');
  if (!input.safeParse({ playerId, today }).success) return { error: t('invalid') };
  try {
    const client = await supabaseServer();
    const ownership = await client.rpc('is_captain_of', { p_player: playerId });
    if (ownership.error) return { error };
    if (!ownership.data) return { data: null };
    const start = new Date(`${today}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    const since = localDate(start, 'UTC');
    const food = 'name_ar,name_en,photo_path,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g';
    const sessionFields = 'id,program_day_id,training_date,started_at,completed_at,client_updated_at,session_rpe,player_note';
    const [program, intake, nutrition, profile, sessions, meals] = await Promise.all([
      client.from('programs').select('id,captain_id,title,notes,settings,program_days(id,position,title,weekday,is_rest_day,warmup,program_cardio(*),program_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,superset_group,rpe,rir,tempo,notes,alternatives,set_plan,exercises(name_ar,name_en,media_path,video_url,body_part)))')
        .eq('player_id', playerId).eq('status', 'active').returns<ProgramResponse[]>().maybeSingle(),
      client.from('player_intake').select('training_days').eq('player_id', playerId).maybeSingle(),
      client.from('nutrition_plans').select(`id,title,target_kcal,target_protein,target_carbs,target_fat,meals(id,position,name,meal_items(id,position,grams,foods(${food}),meal_item_alternatives(id,grams,foods(${food}))))`)
        .eq('player_id', playerId).eq('status', 'active').maybeSingle(),
      client.from('profiles').select('full_name').eq('id', playerId).maybeSingle(),
      client.from('workout_sessions').select(sessionFields).eq('player_id', playerId).gte('training_date', since).lte('training_date', today),
      client.from('meal_logs').select('log_date,completed_at,deleted_at').eq('player_id', playerId).gte('log_date', since).lte('log_date', today),
    ]);
    if ([program, intake, nutrition, profile, sessions, meals].some((result) => result.error)) return { error };
    if (!profile.data) return { data: null };
    // A player without an active program is still previewable; the screen shows the empty state.
    const snapshot = program.data ? mapProgramSnapshot(program.data, intake.data?.training_days ?? [], playerId) : null;
    // Rotation depends on the latest completion even if the player skipped the last seven days.
    const history = snapshot?.days.length ? await client.from('workout_sessions').select(sessionFields)
      .eq('player_id', playerId).in('program_day_id', snapshot.days.map((day) => day.id))
      .lte('training_date', today).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).order('id', { ascending: false }).limit(1) : null;
    if (history?.error) return { error };
    const previewSessions = [...(sessions.data ?? []), ...(history?.data ?? [])]
      .filter((row): row is typeof row & WorkoutSessionRow => row.program_day_id !== null);
    return { data: { name: profile.data.full_name, program: snapshot,
      todayDay: snapshot ? pickTodayDay(snapshot, previewSessions, today) ?? null : null,
      nutrition: nutrition.data ? mapNutritionSnapshot({ ...nutrition.data, meals: nutrition.data.meals.map(meal => ({
        ...meal, meal_items: meal.meal_items.map(item => ({
          ...item, foods: item.foods ? { ...item.foods, name_ar: foodName(item.foods, locale) } : null,
          meal_item_alternatives: item.meal_item_alternatives.map(alternative => ({
            ...alternative, foods: alternative.foods ? { ...alternative.foods, name_ar: foodName(alternative.foods, locale) } : null,
          })),
        })),
      })) }, playerId) : null,
      sessions: previewSessions,
      week: activityWeek(today, sessions.data ?? [], meals.data ?? []),
      ...(sessions.data?.length ? { feedbackSessions: sessions.data } : {}),
    } };
  } catch (caught) { unstable_rethrow(caught); return { error }; }
}

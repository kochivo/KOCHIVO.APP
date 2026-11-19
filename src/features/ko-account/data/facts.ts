import 'server-only';
import { getTimezone } from '@/core/timezone/server';
import { nutritionDay, playerMealLogs, playerNutritionPlan, playerWorkout } from '@/features/ai-tools/server';
import type { AnswerSource } from '@/features/ko-core';
import { localDate } from '@/lib/dates';
import type { KoActor } from './account';
import { latinDigits, privateContact } from './answer-guard';
import { mealToolContext } from './log-meal';
import { progressMonth, readMyPoints, readProgress, readRoster, readTeamProgress, shift } from './read-progress';

type Workout = Awaited<ReturnType<typeof playerWorkout>>;
type Nutrition = ReturnType<typeof nutritionDay>;
type Logs = Awaited<ReturnType<typeof playerMealLogs>>;
type Section = readonly [AnswerSource, readonly string[]];
type Context = { id: string; name: string };

// Estimate up to 1,500 multilingual tokens at two UTF-8 bytes per token.
export const factsBudget = 3000;
const encoder = new TextEncoder();
const uuid = /\b[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}\b/gi;

function clean(value: string) {
  return latinDigits(value.normalize('NFKC').replace(/\p{Cf}/gu, '')).replace(uuid, '').split(/(\b\d{4}-\d{2}-\d{2}\b)/g)
    .map((part, index) => index % 2 ? part : part.replace(privateContact, ''))
    .join('').replace(/\s+/g, ' ').trim();
}

export function formatFacts(sections: readonly Section[]) {
  if (!sections.length) return '';
  const budget = Math.floor(factsBudget / sections.length);
  return sections.map(([id, values]) => {
    const prefix = '[' + id + ']';
    let line = prefix;
    for (const value of values) {
      const safe = clean(value);
      if (!safe) continue;
      const next = line + (line === prefix ? ' ' : '; ') + safe;
      if (encoder.encode(next).length <= budget - 1) line = next;
    }
    return line === prefix ? prefix + ' unavailable' : line;
  }).join('\n');
}

export function workoutFacts(workout: Workout) {
  if (!workout) return ['no program'];
  if (workout.rest || !workout.day) return ['rest day'];
  return [workout.day.title || 'workout', ...workout.day.exercises.map(row =>
    (row.name_ar || row.name_en || '') + ': ' + row.sets + ' sets x ' +
    (row.reps_max && row.reps_max !== row.reps_min ? row.reps_min + '-' + row.reps_max : row.reps_min) + ' reps')];
}

export function nutritionFacts(nutrition: Nutrition | null, logs: Logs) {
  if (!nutrition) return ['no nutrition plan'];
  const { targets, remaining, meals } = nutrition;
  const logged = new Map(logs.map(row => [row.meal_id, row.completed_at]));
  return [
    'kcal remaining ' + remaining.kcal + ' / target ' + targets.kcal,
    'protein g remaining ' + remaining.protein + ' / target ' + targets.protein,
    ...meals.flatMap(meal => [
      meal.name + (logged.get(meal.id) ? ' (logged eaten)' : logged.has(meal.id) ? ' (logged skipped)' : ' (not logged)'),
      ...meal.items.map(item => meal.name + ': ' + item.name + ' ' + item.grams + ' g'),
    ]),
  ];
}

async function playerProgress(actor: KoActor, today: string) {
  const [points, last] = await Promise.all([
    readMyPoints(actor),
    actor.db.from('workout_sessions').select('training_date').eq('player_id', actor.id)
      .not('completed_at', 'is', null).lte('training_date', today).order('training_date', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (last.error) throw last.error;
  const month = points && progressMonth(points);
  return [
    month ? 'month done ' + month.done + ', planned ' + month.planned + ', adherence ' + month.adherence + '%' : 'month progress unavailable',
    ...(points ? [
      'rank ' + (points.tier ?? 'unavailable') + ', lifetime points ' + (points.lifetime ?? 'unavailable'),
      'month position ' + (points.month_position ?? 'unavailable'),
      points.crown_needs_workouts > 0 ? 'workouts needed for crown ' + points.crown_needs_workouts :
        'points to crown ' + (points.crown_gap ?? 'unavailable'),
    ] : []),
    'last workout ' + (last.data?.training_date ?? 'unavailable'),
  ];
}

async function captainName(actor: KoActor) {
  const { data, error } = await actor.db.rpc('my_captain_profile');
  if (error) throw error;
  return data[0]?.full_name ?? 'no captain';
}

async function playerFacts(actor: KoActor, now: number, signal: AbortSignal) {
  const ctx = await mealToolContext(actor, now, signal);
  const today = localDate(ctx.now, ctx.timezone);
  const [workout, tomorrow, plan, logs, progress, captain] = await Promise.all([
    playerWorkout(ctx, today), playerWorkout(ctx, shift(today, 1)), playerNutritionPlan(ctx),
    playerMealLogs(ctx, today), playerProgress(actor, today), captainName(actor),
  ]);
  return formatFacts([
    ['workout_today', workoutFacts(workout)], ['workout_tomorrow', workoutFacts(tomorrow)],
    ['nutrition_today', nutritionFacts(plan && nutritionDay(plan, logs, today, workout?.rest ?? false), logs)],
    ['progress', progress], ['captain', [captain]],
  ]);
}

async function captainFacts(actor: KoActor, now: number, context?: Context) {
  const today = localDate(new Date(now), await getTimezone());
  const roster = await readRoster(actor);
  const team = roster.length ? await readTeamProgress(actor, today, roster) : null;
  const sections: Section[] = [['team_summary', [
    'roster count ' + roster.length,
    'inactive 7+ days: ' + (team?.inactive.length ?? 0),
    'subscriptions ending within 7 days: ' + (team?.expiring.length ?? 0),
    'crown leader: ' + (team?.leader?.display_name || roster.find(row => row.player_id === team?.leader?.player_id)?.full_name || 'none'),
    ...(team?.inactive.slice(0, 10).map(row => 'inactive: ' + row.full_name) ?? []),
    ...(team?.expiring.slice(0, 10).map(row => 'expiring: ' + row.full_name + ' ' + row.access_until) ?? []),
  ]]];
  if (context) {
    const summary = await readProgress(actor, { kind: 'player_summary', args: {} }, 'en', now, context);
    sections.push(['player_summary', summary.split('\n')]);
  }
  return formatFacts(sections);
}

export function loadFacts(actor: KoActor, now: number, signal: AbortSignal, context?: Context) {
  return actor.role === 'player' ? playerFacts(actor, now, signal) : captainFacts(actor, now, context);
}

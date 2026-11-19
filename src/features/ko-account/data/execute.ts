import { getPlayerTimezone } from '@/core/timezone/server';
import { z } from 'zod';
import { uuidv7 } from '@/core/offline/ids';
import { createT } from '@/core/i18n/messages';
import { localDate } from '@/lib/dates';
import type { ArabicStyle } from '@/core/i18n/locale';
import { playerWorkout } from '@/features/ai-tools/server';
import { currentExercise, resolvePlayer } from './account';
import type { KoActor } from './account';
import { approvalLifetimeMs, issueApproval } from './approval';
import type { Approval } from './approval';
import { buildDraft } from './drafts';
import { buildTrainingDraft } from './training-draft';
import type { Intent } from './intents';
import { matchNamed } from './match';
import { readMeal } from './meal';
import { messages } from '../messages';
import { prepareSwap } from './swap';
import { readProgress } from './read-progress';
import { matchPlanMeal, mealToolContext } from './log-meal';

type Locale = 'ar' | 'en';
import type { AccountReply } from '@/features/ko-core';
export type { AccountReply } from '@/features/ko-core';
export const say = (text: string): Extract<AccountReply, { kind: 'message' }> => ({ kind: 'message', text });
const range = (min: number, max: number | null, separator = '–') => max !== null && max !== min ? `${min}${separator}${max}` : String(min);

export async function executeIntent(actor: KoActor, intent: Intent, locale: Locale, secret: string, now: number,
  contextPlayer?: { id: string; name: string }, signal = new AbortController().signal, style?: ArabicStyle): Promise<AccountReply> {
  const t = createT(messages, locale);
  const actionT = createT(messages, locale, style);
  const action = (kind: Approval['kind'], player: string, payload: Approval['payload'], title: string, detail: string, label: string,
    id = uuidv7(now)): AccountReply => {
    return { kind: 'message', text: '', actions: [{ id, title, detail,
      token: issueApproval({ kind, payload, player, actor: actor.id, id, expires: now + approvalLifetimeMs, label }, secret) }] };
  };
  if (intent.kind === 'answer' || intent.kind === 'remember') return say(t('unclear'));
  if (intent.kind === 'clarify') {
    if (!('reason' in intent)) return say(intent.args.question);
    const { reason } = intent;
    if (reason === 'answer') return say(actionT(actor.role === 'captain' ? 'clarify_answer_captain' : 'clarify_answer_player'));
    return say((reason === 'log_meal' || reason === 'my_workout' ? actionT : t)(`clarify_${reason}`));
  }
  if (intent.kind === 'my_workout') {
    if (actor.role !== 'player') return say(actionT('unclear'));
    const ctx = await mealToolContext(actor, now, signal);
    const tomorrow = intent.args.day === 'tomorrow';
    let date = localDate(ctx.now, ctx.timezone);
    if (tomorrow) {
      // Advance the local calendar date even when the next day has a different UTC offset.
      const calendarDay = new Date(`${date}T12:00:00Z`);
      calendarDay.setUTCDate(calendarDay.getUTCDate() + 1);
      date = localDate(calendarDay, 'UTC');
    }
    const workout = await playerWorkout(ctx, date);
    if (!workout) return say(actionT('workoutNoProgram'));
    if (workout.rest || !workout.day) return say(actionT(tomorrow ? 'workoutRestTomorrow' : 'workoutRestToday'));
    const title = workout.day.title || actionT('workoutUntitled');
    const lines = workout.day.exercises.slice(0, 10).map(row => actionT('workoutExercise', {
      name: (locale === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? '',
      sets: row.sets, reps: range(row.reps_min, row.reps_max, '-'),
    }));
    const cardio = workout.day.cardio?.map(({ kind, minutes }) => actionT('workoutCardio', { kind, minutes })) ?? [];
    return say([actionT(tomorrow ? 'workoutTomorrow' : 'workoutToday', { title }), ...lines, ...cardio].join('\n'));
  }
  if (intent.kind === 'my_progress' || intent.kind === 'why_not_counted' ||
      intent.kind === 'player_summary' || intent.kind === 'team_summary')
    return say(await readProgress(actor, intent, locale, now, contextPlayer));
  if (intent.kind === 'swap_exercise') {
    const result = await prepareSwap(actor, intent.args.exercise, intent.args.injury, locale, intent.args.reason);
    if (!result.payload) return say(result.text);
    return { kind: 'message', text: result.text, optionsToken: issueApproval({
      actor: actor.id, player: actor.id, id: uuidv7(now), kind: 'swap_options', label: '',
      expires: now + approvalLifetimeMs, payload: result.payload,
    }, secret) };
  }
  if (intent.kind === 'read_nutrition' || intent.kind === 'meal_photo') {
    if (actor.role !== 'player') return say(t('unclear'));
    const rows = await readMeal(actor, intent.args.meal, intent.args.foods, locale,
      intent.kind === 'read_nutrition' ? { now, signal } : undefined);
    const portions = rows?.map(row => t('portion', { ...row, alternative: row.alternative ? t('alternative') : '' })).join('\n');
    return say(intent.kind === 'meal_photo'
      ? `${t('photo', { foods: intent.args.foods.join('، ') })}\n\n${portions || t('noMeal')}`
      : portions || t('noMeal'));
  }
  if (intent.kind === 'log_meal') {
    if (actor.role !== 'player') return say(t('unclear'));
    const { meal, names } = await matchPlanMeal(await mealToolContext(actor, now, signal), intent.args.meal);
    if (!meal) return say(names.length ? actionT('mealChoices', { names: names.join(', ') }) : actionT('mealPlanEmpty'));
    const { id: mealId, name } = meal;
    const eaten = intent.args.eaten ?? true;
    return action('meal_log', actor.id, { mealId, eaten, name }, actionT(eaten ? 'actionEaten' : 'actionSkipped', { name }), '', '');
  }
  if (actor.role === 'player' && intent.kind !== 'read_exercise') return say(t('unclear'));
  const player = intent.args.player === undefined && contextPlayer
    ? contextPlayer : await resolvePlayer(actor, intent.args.player);
  if (!player) return say(t('athlete'));
  const preview = (kind: Approval['kind'], payload: Approval['payload'], text: string, label: string, title: string) =>
    action(kind, player.id, payload, title, `${t('target', { name: player.name })}\n${text}`, label);

  if (intent.kind === 'read_exercise' || intent.kind === 'update_exercise') {
    const rows = await currentExercise(actor, player.id, intent.args.exercise, intent.args.day);
    const matches = matchNamed(rows, intent.args.exercise);
    const localized = (row: (typeof rows)[number]) => (locale === 'ar' ? row.name_ar ?? row.name_en : row.name_en ?? row.name_ar) ?? intent.args.exercise;
    if (matches.length > 1) return say(t('exerciseAmbiguous', { matches: matches.slice(0, 5).map(row => `${localized(row)} / ${row.day}`).join('، ') }));
    const row = matches[0];
    if (!row) return say(t('exerciseMissing'));
    const name = localized(row);
    const current = range(row.reps_min, row.reps_max);
    if (intent.kind === 'read_exercise') {
      const result = t('exercise', {
        name, day: row.day, sets: t('exerciseSets', { n: row.sets, sets: row.sets }),
        reps: t(row.reps_max === null || row.reps_max === row.reps_min ? 'exerciseReps' : 'exerciseReps.other', { n: row.reps_min, reps: current }),
      });
      const instructions = (locale === 'ar' ? row.instructions_ar ?? row.instructions_en : row.instructions_en).slice(0, 6);
      return say(intent.args.how && instructions.length ? [result, ...instructions].join('\n') : result);
    }
    const { sets, reps } = intent.args;
    if (sets === undefined && reps === undefined) return say(t('missingValues'));
    const snapshot = await actor.db.from('program_exercises').select('sets,reps_min,reps_max,set_plan')
      .eq('id', row.id).single();
    if (snapshot.error) throw snapshot.error;
    if (snapshot.data.sets !== row.sets || snapshot.data.reps_min !== row.reps_min || snapshot.data.reps_max !== row.reps_max)
      return say(t('changed'));
    return preview('exercise', { id: row.id, sets: sets ?? null, reps: reps ?? null, previousSets: row.sets,
      previousReps: row.reps_min, previousMax: row.reps_max, previousSetPlan: z.json().parse(snapshot.data.set_plan) }, t('change', { name, day: row.day,
      before: `${row.sets} × ${current}`, after: `${sets ?? row.sets} × ${reps ?? current}` }), name,
    actionT('actionExercise', { exercise: name, name: player.name }));
  }
  if (intent.kind === 'create_training') {
    const id = uuidv7(now);
    const draft = await buildTrainingDraft(actor, player, intent.args, id, now, locale, actionT);
    if (!draft) return say(actionT('trainingFailed'));
    const { title } = draft.payload;
    return action('training', player.id, draft.payload, actionT('actionTraining', { title }),
      `${actionT('target', { name: player.name })}\n${draft.preview}`, title, id);
  }
  if (intent.kind === 'create_nutrition') {
    const draft = await buildDraft(actor, intent);
    if (!draft) return say(t('catalog'));
    const targets = `\n${t('targets', intent.args.targets)}`;
    const actual = draft.actual ? `\n${t('actual', { ...draft.actual })}` : '';
    return preview('nutrition', draft.payload,
      `${t('draft', { title: intent.args.title })}${targets}${actual}\n${draft.preview}`, intent.args.title,
      actionT('actionNutrition', { title: intent.args.title, name: player.name }));
  }
  if (intent.kind === 'renew_subscription') {
    const { data, error } = await actor.db.from('coach_clients').select('access_until,sessions_left,frozen_at,pending')
      .eq('captain_id', actor.id).eq('player_id', player.id).is('archived_at', null).maybeSingle();
    if (error) throw error;
    if (!data?.access_until || data.sessions_left !== null || data.frozen_at || data.pending) return say(t('unavailableRenewal'));
    return preview('renew', { days: intent.args.days, previous: data.access_until },
      t('renew', { n: intent.args.days, days: intent.args.days, previous: data.access_until }), player.name,
      actionT('actionRenew', { n: intent.args.days, name: player.name, days: intent.args.days }));
  }
  return preview('reminder', { date: localDate(new Date(now), await getPlayerTimezone(player.id)) },
    t('reminder'), player.name, actionT('actionReminder', { name: player.name }));
}

export async function commitApproval(actor: KoActor, action: Approval, token: string, locale: Locale, style?: ArabicStyle) {
  const t = createT(messages, locale, style);
  const { data, error } = await actor.db.rpc('ko_apply_action', { p_token: token });
  if (error?.code === '40001') return say(t('changed'));
  if (error) throw error;
  const result = z.object({
    replayed: z.boolean().optional(), until: z.string().optional(), sent: z.boolean().optional(),
    sets: z.number().optional(), reps: z.number().optional(), max: z.number().nullable().optional(),
  }).parse(data);
  if (result.replayed) return say(t('replay'));
  if (action.kind === 'training' || action.kind === 'nutrition') return say(t('savedDraft', { title: action.label }));
  if (action.kind === 'renew' && result.until) return say(t('renewed', { until: result.until }));
  if (action.kind === 'reminder') return say(t(result.sent ? 'sent' : 'alreadySent'));
  if (action.kind === 'exercise' && result.sets !== undefined && result.reps !== undefined) {
    return say(t('savedExercise', {
      name: action.label, sets: t('exerciseSets', { n: result.sets, sets: result.sets }),
      reps: t(result.max == null || result.max === result.reps ? 'exerciseReps' : 'exerciseReps.other',
        { n: result.reps, reps: range(result.reps, result.max ?? null) }),
    }));
  }
  return say(t('done'));
}

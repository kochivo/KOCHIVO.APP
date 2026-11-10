import { z } from 'zod';
import { uuidv7 } from '@/core/offline/ids';
import { createT } from '@/core/i18n/messages';
import { localDate } from '@/lib/dates';
import { currentExercise, resolvePlayer } from './account';
import type { KoActor } from './account';
import { issueApproval } from './approval';
import type { Approval } from './approval';
import { buildDraft } from './drafts';
import type { Intent } from './intents';
import { matchNamed } from './match';
import { readMeal } from './meal';
import { messages } from './messages';
import { prepareSwap } from './swap';
import { readProgress } from './read-progress';

type Locale = 'ar' | 'en';
export type AccountReply = { kind: 'message'; text: string; optionsToken?: string } | { kind: 'confirm'; text: string; token: string };
export const say = (text: string): AccountReply => ({ kind: 'message', text });
const range = (min: number, max: number | null) => max !== null && max !== min ? `${min}–${max}` : String(min);

export async function executeIntent(actor: KoActor, intent: Intent, locale: Locale, secret: string, now: number, contextPlayer?: { id: string; name: string }): Promise<AccountReply> {
  const t = createT(messages, locale);
  if (intent.kind === 'clarify') return say(intent.args.question);
  if (intent.kind === 'my_progress' || intent.kind === 'why_not_counted' ||
      intent.kind === 'player_summary' || intent.kind === 'team_summary')
    return say(await readProgress(actor, intent, locale, now, contextPlayer));
  if (intent.kind === 'swap_exercise') {
    const result = await prepareSwap(actor, intent.args.exercise, intent.args.injury, locale, intent.args.reason);
    if (!result.payload) return say(result.text);
    return { kind: 'message', text: result.text, optionsToken: issueApproval({
      actor: actor.id, player: actor.id, id: uuidv7(now), kind: 'swap_options', label: '',
      expires: now + 600_000, payload: result.payload,
    }, secret) };
  }
  if (intent.kind === 'read_nutrition' || intent.kind === 'meal_photo') {
    if (actor.role !== 'player') return say(t('unclear'));
    const rows = await readMeal(actor, intent.args.meal, intent.args.foods, locale);
    const portions = rows?.map(row => t('portion', { ...row, alternative: row.alternative ? t('alternative') : '' })).join('\n');
    return say(intent.kind === 'meal_photo'
      ? `${t('photo', { foods: intent.args.foods.join('، ') })}\n\n${portions || t('noMeal')}`
      : portions || t('noMeal'));
  }
  if (actor.role === 'player' && intent.kind !== 'read_exercise') return say(t('unclear'));
  const player = intent.args.player === undefined && contextPlayer
    ? contextPlayer : await resolvePlayer(actor, intent.args.player);
  if (!player) return say(t('athlete'));
  const preview = (kind: Approval['kind'], payload: Approval['payload'], text: string, label: string) => ({
    kind: 'confirm' as const,
    text: `${t('target', { name: player.name })}\n${text}\n\n${t('confirm')}`,
    token: issueApproval({ kind, payload, player: player.id, actor: actor.id, id: uuidv7(now), expires: now + 600_000, label }, secret),
  });

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
      const result = t('exercise', { name, day: row.day, sets: row.sets, reps: current });
      const instructions = (locale === 'ar' ? row.instructions_ar ?? row.instructions_en : row.instructions_en).slice(0, 6);
      return say(intent.args.how && instructions.length ? [result, ...instructions].join('\n') : result);
    }
    const { sets, reps } = intent.args;
    if (sets === undefined && reps === undefined) return say(t('missingValues'));
    return preview('exercise', { id: row.id, sets: sets ?? null, reps: reps ?? null, previousSets: row.sets,
      previousReps: row.reps_min, previousMax: row.reps_max }, t('change', { name, day: row.day,
      before: `${row.sets} × ${current}`, after: `${sets ?? row.sets} × ${reps ?? current}` }), name);
  }
  if (intent.kind === 'create_training' || intent.kind === 'create_nutrition') {
    const draft = await buildDraft(actor, intent);
    if (!draft) return say(t('catalog'));
    const targets = intent.kind === 'create_nutrition' ? `\n${t('targets', intent.args.targets)}` : '';
    const actual = draft.actual ? `\n${t('actual', { ...draft.actual })}` : '';
    return preview(intent.kind === 'create_training' ? 'training' : 'nutrition', draft.payload,
      `${t('draft', { title: intent.args.title })}${targets}${actual}\n${draft.preview}`, intent.args.title);
  }
  if (intent.kind === 'renew_subscription') {
    const { data, error } = await actor.db.from('coach_clients').select('access_until,sessions_left,frozen_at,pending')
      .eq('captain_id', actor.id).eq('player_id', player.id).is('archived_at', null).maybeSingle();
    if (error) throw error;
    if (!data?.access_until || data.sessions_left !== null || data.frozen_at || data.pending) return say(t('unavailableRenewal'));
    return preview('renew', { days: intent.args.days, previous: data.access_until },
      t('renew', { days: intent.args.days, previous: data.access_until }), player.name);
  }
  return preview('reminder', { date: localDate(new Date(now)) }, t('reminder'), player.name);
}

export async function commitApproval(actor: KoActor, action: Approval, token: string, locale: Locale): Promise<AccountReply> {
  const t = createT(messages, locale);
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
    return say(t('savedExercise', { name: action.label, sets: result.sets, reps: range(result.reps, result.max ?? null) }));
  }
  return say(t('done'));
}

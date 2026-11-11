import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import { swapOptions } from '@/features/program-generator';
import type { KoActor } from './account';
import { matchNamed } from './match';
import { messages } from '../messages';

const injurySchema = z.enum(['knee', 'shoulder', 'lower_back']);
export const swapPayloadSchema = z.strictObject({
  programExercise: z.uuid(), injury: injurySchema.optional(), options: z.array(z.uuid()).min(1).max(3),
  reason: z.enum(['injury', 'discomfort']).default('injury'),
}).refine(args => args.reason !== 'injury' || args.injury !== undefined);
type Injury = z.infer<typeof injurySchema>;
type Locale = 'ar' | 'en';

export async function prepareSwap(actor: KoActor, exercise: string, injury: Injury | undefined, locale: Locale,
  reason: 'injury' | 'busy' | 'discomfort' = 'injury') {
  const t = createT(messages, locale);
  if (actor.role !== 'player' || (reason === 'injury' && !injury)) return { text: t('unclear') };
  const program = await actor.db.from('programs')
    .select('program_days(title,program_exercises(id,exercise_id,exercises(name_ar,name_en)))')
    .eq('player_id', actor.id).eq('status', 'active').eq('is_template', false).maybeSingle();
  if (program.error) throw program.error;
  const rows = (program.data?.program_days ?? []).flatMap(day => day.program_exercises.flatMap(row => row.exercises
    ? [{ id: row.id, exercise_id: row.exercise_id, ...row.exercises, day: day.title }] : []));
  const matches = matchNamed(rows, exercise);
  const label = (row: { name_ar: string | null; name_en: string }) => locale === 'ar' ? row.name_ar ?? row.name_en : row.name_en;
  if (matches.length > 1) return { text: t('exerciseAmbiguous', {
    matches: matches.slice(0, 5).map(row => `${label(row)} / ${row.day}`).join('، '),
  }) };
  const row = matches[0];
  if (!row) return { text: t('exerciseMissing') };
  const candidates = [];
  for (let offset = 0; ; offset += 500) {
    const page = await actor.db.from('exercise_generator_tags')
      .select('exercise_id,pattern,stress,exercises!inner(name_ar,name_en,body_part,equipment)').order('exercise_id').range(offset, offset + 499);
    if (page.error) throw page.error;
    candidates.push(...page.data);
    if (page.data.length < 500) break;
  }
  const source = candidates.find(candidate => candidate.exercise_id === row.exercise_id);
  const seen = new Set([row.exercise_id]);
  const options = reason === 'busy' ? [...candidates].sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)).filter(candidate => {
    if (!source?.exercises.body_part || !source.exercises.equipment || !candidate.exercises.equipment || seen.has(candidate.exercise_id) ||
      candidate.exercises.body_part !== source.exercises.body_part || candidate.exercises.equipment === source.exercises.equipment) return false;
    seen.add(candidate.exercise_id);
    return true;
  }).slice(0, 3) : swapOptions(row.exercise_id, reason === 'injury' && injury ? [injury] : [], candidates);
  if (!options.length) return { text: reason === 'busy' ? `${t('swapBusyNone')}\n${t('swapToday')}` : t('swapNone') };
  const numbered = options.map((option, i) => t('swapOption', { number: i + 1, name: label(option.exercises) })).join('، ');
  if (reason === 'busy') return { text: `${t('swapBusyChoices', { name: label(row), options: numbered })}\n${t('swapToday')}` };
  return { text: t('swapChoices', { name: label(row), options: numbered }),
  payload: { programExercise: row.id, ...(reason === 'injury' && injury ? { injury } : { reason }), options: options.map(option => option.exercise_id) } };
}

export async function chooseSwap(actor: KoActor, payload: unknown, text: string, locale: Locale) {
  const t = createT(messages, locale);
  const choice = text.trim().replace(/[١٢٣]/g, digit => String('١٢٣'.indexOf(digit) + 1));
  const parsed = swapPayloadSchema.safeParse(payload);
  if (actor.role !== 'player' || !parsed.success || !/^[1-3]$/.test(choice)) return { kind: 'message' as const, text: t('expired') };
  const target = parsed.data.options[Number(choice) - 1];
  if (!target) return { kind: 'message' as const, text: t('expired') };
  const { error } = await actor.db.rpc('request_exercise_swap', {
    p_program_exercise_id: parsed.data.programExercise, p_to_exercise_id: target, p_injury: parsed.data.injury ?? null,
    ...(parsed.data.reason === 'discomfort' && { p_reason: 'discomfort', p_injury: null }),
  });
  if (error) throw error;
  return { kind: 'message' as const, text: t('swapSent') };
}

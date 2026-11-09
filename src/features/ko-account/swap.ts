import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import { swapOptions } from '@/features/program-generator';
import type { KoActor } from './account';
import { matchNamed } from './match';
import { messages } from './messages';

const injurySchema = z.enum(['knee', 'shoulder', 'lower_back']);
export const swapPayloadSchema = z.strictObject({
  programExercise: z.uuid(), injury: injurySchema, options: z.array(z.uuid()).min(1).max(3),
});
type Injury = z.infer<typeof injurySchema>;
type Locale = 'ar' | 'en';

export async function prepareSwap(actor: KoActor, exercise: string, injury: Injury, locale: Locale) {
  const t = createT(messages, locale);
  if (actor.role !== 'player') return { text: t('unclear') };
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
      .select('exercise_id,pattern,stress,exercises!inner(name_ar,name_en)').order('exercise_id').range(offset, offset + 499);
    if (page.error) throw page.error;
    candidates.push(...page.data);
    if (page.data.length < 500) break;
  }
  const options = swapOptions(row.exercise_id, [injury], candidates);
  if (!options.length) return { text: t('swapNone') };
  return { text: t('swapChoices', { name: label(row), options: options.map((option, i) =>
    t('swapOption', { number: i + 1, name: label(option.exercises) })).join('، ') }),
  payload: { programExercise: row.id, injury, options: options.map(option => option.exercise_id) } };
}

export async function chooseSwap(actor: KoActor, payload: unknown, text: string, locale: Locale) {
  const t = createT(messages, locale);
  const choice = text.trim().replace(/[١٢٣]/g, digit => String('١٢٣'.indexOf(digit) + 1));
  const parsed = swapPayloadSchema.safeParse(payload);
  if (actor.role !== 'player' || !parsed.success || !/^[1-3]$/.test(choice)) return { kind: 'message' as const, text: t('expired') };
  const target = parsed.data.options[Number(choice) - 1];
  if (!target) return { kind: 'message' as const, text: t('expired') };
  const { error } = await actor.db.rpc('request_exercise_swap', {
    p_program_exercise_id: parsed.data.programExercise, p_to_exercise_id: target, p_injury: parsed.data.injury,
  });
  if (error) throw error;
  return { kind: 'message' as const, text: t('swapSent') };
}

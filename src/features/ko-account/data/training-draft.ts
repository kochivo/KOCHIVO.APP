import 'server-only';
import { createHash } from 'node:crypto';
import type { Translator } from '@/core/i18n/messages';
import { uuidv7 } from '@/core/offline/ids';
import { dayFocus, generateProgram, initialBrief, loadCandidates, toProgramDraft } from '@/features/program-generator/server';
import type { messages } from '../messages';
import type { KoActor } from './account';
import type { Intent } from './intents';

type TrainingArgs = Extract<Intent, { kind: 'create_training' }>['args'];
const spread: Readonly<Partial<Record<number, number[]>>> = {
  2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5],
};
const weekdayKeys = ['trainingSat', 'trainingSun', 'trainingMon', 'trainingTue', 'trainingWed', 'trainingThu', 'trainingFri'] as const;

export async function buildTrainingDraft(actor: KoActor, player: { id: string; name: string }, args: TrainingArgs,
  approvalId: string, now: number, locale: 'ar' | 'en', t: Translator<typeof messages>) {
  const [intake, candidates] = await Promise.all([
    actor.db.from('player_intake').select('training_days,experience,session_minutes,injuries').eq('player_id', player.id).maybeSingle(),
    loadCandidates(actor.db),
  ]);
  if (intake.error || candidates.error) return null;
  const row = intake.data;
  const defaults = initialBrief(row && {
    trainingDays: row.training_days, experience: row.experience, sessionMinutes: row.session_minutes, injuries: row.injuries,
  }, createHash('sha256').update(approvalId).digest().readUInt32BE(), player.id);
  const { goal = defaults.goal, minutes = defaults.minutes, level = defaults.level,
    equipment = defaults.equipment, injuries = defaults.injuries } = args;
  const weekdays = args.weekdays?.map(day => (day + 1) % 7)
    ?? (args.days === undefined ? defaults.weekdays : spread[args.days]);
  const result = generateProgram({ ...defaults, goal, weekdays, minutes, level, equipment, injuries }, candidates.data);
  if (result.error || !weekdays) return null;

  const defaultTitle = t('trainingTitle', { goal: t(`trainingGoal_${goal}`), days: weekdays.length, player: player.name });
  const title = args.title ?? Array.from(defaultTitle).slice(0, 80).join('').trimEnd();
  const draft = toProgramDraft(result.data, uuidv7(now), title, () => uuidv7(now));
  const lines: string[] = [];
  const days = draft.days.map((day, index) => {
    const weekday = weekdayKeys[index];
    const focus = dayFocus(weekdays.length, lines.length);
    const dayTitle = day.is_rest_day ? '' : t(`trainingFocus_${focus}`);
    if (!day.is_rest_day && weekday) {
      const exercises = day.exercises.map(({ library, sets, reps_min, reps_max }) => {
        const name = (locale === 'ar' ? library?.name_ar || library?.name_en : library?.name_en || library?.name_ar)
          || t('trainingExerciseUnknown');
        const reps = reps_max !== null && reps_max !== reps_min ? `${reps_min}-${reps_max}` : String(reps_min);
        return t('trainingExercise', { name, sets, reps });
      });
      lines.push(t('trainingDay', { weekday: t(weekday), title: dayTitle, exercises: exercises.join(t('trainingSeparator')) }));
    }
    // The approval RPC passes this weekday directly to the Saturday-first program table.
    return {
      id: day.id, program_id: day.program_id, weekday: day.weekday ?? index, position: day.position, title: dayTitle,
      is_rest_day: day.is_rest_day ?? false, cardio: [],
      exercises: day.exercises.map(({ id, day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, superset_group }) =>
        ({ id, day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, superset_group })),
    };
  });
  return { payload: { id: draft.id, title, days, repeatWeekly: draft.repeatWeekly ?? true },
    preview: [...lines, t('trainingEditHint')].join('\n') };
}

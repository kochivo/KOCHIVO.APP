import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

import type { DraftDay, DraftExercise, ProgramDraft } from './types';

export function exerciseSummary(row: DraftExercise, locale: Locale): string {
  const t = createT(messages, locale);
  const number = (value: number) => formatNumber(value, locale);
  const count = row.reps_max ?? row.reps_min;
  const reps = row.reps_max === null ? t('failure').toLocaleLowerCase(locale)
    : row.reps_min === row.reps_max ? t('repCount', { n: count, count: number(count) })
      : t('rangeRepCount', { n: count, count: t('repsRange', { min: number(row.reps_min), max: number(count) }) });
  return t('prescription', { sets: t('setCount', { n: row.sets, count: number(row.sets) }), reps,
    rest: t('restValue', { count: number(row.rest_seconds) }) }) +
    (row.rir == null ? '' : t('rirSuffix', { count: number(row.rir) }));
}
export function weekdayStatus(day: DraftDay, locale: Locale): string {
  const t = createT(messages, locale);
  return day.is_rest_day ? t('restStatus') : t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) });
}

export function daySummary(day: DraftDay) {
  return {
    exercises: day.exercises.length,
    sets: day.exercises.reduce((total, row) => total + row.sets, 0),
    minutes: Math.round(day.exercises.reduce((total, row) => total + row.sets * (40 + row.rest_seconds), 0) / 60 / 5) * 5
      + (day.cardio ?? []).reduce((total, row) => total + row.minutes, 0),
  };
}
export function validateForActivation(draft: ProgramDraft, t: Translator<typeof messages> = createT(messages, 'ar')): string[] {
  const errors: string[] = [];
  if (!draft.player_id) errors.push(t('chooseAPlayerForThisProgram'));
  if (!draft.title.trim() || draft.title.length > 80) errors.push(t('enterAProgramNameUpTo80'));
  if (!draft.days.some(day => !day.is_rest_day && (day.exercises.length > 0 || day.cardio?.length))) errors.push(t('addADayWithAtLeastOne'));
  return errors;
}
export function escapeSearch(query: string): string {
  return query.replace(/[\\%_]/g, character => `\\${character}`);
}

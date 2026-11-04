import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';

import type { DraftDay, ProgramDraft } from './types';

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

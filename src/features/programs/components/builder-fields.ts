import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { toggleSuperset } from '../draft';
import { messages } from '../messages';
import type { DraftExercise, ProgramDraft } from '../types';

export type RepsMode = 'fixed' | 'range' | 'failure';
export const restPresets = [30, 45, 60, 90, 120, 180, 240] as const;
export function repsMode(row: Pick<DraftExercise, 'reps_min' | 'reps_max'>): RepsMode {
  return row.reps_max === null ? 'failure' : row.reps_max === row.reps_min ? 'fixed' : 'range';
}
export function clampReps(mode: RepsMode, minimum: number, maximum: number) {
  const bound = (value: number) => Number.isFinite(value) ? Math.max(1, Math.min(100, Math.round(value))) : 1;
  const reps_min = bound(minimum);
  return { reps_min, reps_max: mode === 'failure' ? null : mode === 'fixed' ? reps_min : Math.max(reps_min, bound(maximum)) };
}
export function restText(seconds: number, locale: Locale) {
  return createT(messages, locale)('restValue', { count: formatNumber(seconds, locale) });
}
export function toggleNextSuperset(draft: ProgramDraft, dayId: string, id: string): ProgramDraft {
  const day = draft.days.find(item => item.id === dayId);
  const index = day?.exercises.findIndex(item => item.id === id) ?? -1;
  const row = day?.exercises[index];
  if (!row || !day) return draft;
  const next = day.exercises[index + 1];
  const ids = row.superset_group !== null
    ? day.exercises.filter(item => item.superset_group === row.superset_group).map(item => item.id)
    : next ? [row.id, next.id] : [];
  return ids.length < 2 ? draft : toggleSuperset(draft, dayId, ids);
}

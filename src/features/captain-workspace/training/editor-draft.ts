import { dayWarmupSchema, emptyWarmup } from '@/features/programs';
import type { DayWarmup, DraftDay, ProgramDraft } from '@/features/programs';

export type Update = (operation: (draft: ProgramDraft) => ProgramDraft) => void;
export const trainingDays = (draft: ProgramDraft) => draft.days.filter(day => !day.is_rest_day);
export const weekly = (draft: ProgramDraft) => draft.days.some(day => day.weekday != null);
export const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export function editDay(draft: ProgramDraft, id: string, change: (day: DraftDay) => DraftDay): ProgramDraft {
  return { ...draft, days: draft.days.map(day => day.id === id ? change(day) : day) };
}
export function editWarmup(draft: ProgramDraft, id: string, warmup: DayWarmup): ProgramDraft {
  return editDay(draft, id, day => ({ ...day, warmup: dayWarmupSchema.parse(warmup) }));
}
export function linkNext(draft: ProgramDraft, dayId: string, id: string): ProgramDraft {
  return editDay(draft, dayId, day => {
    const index = day.exercises.findIndex(row => row.id === id), row = day.exercises[index];
    if (!row) return day;
    if (row.superset_group !== null) return { ...day, exercises: day.exercises.map(item => item.superset_group === row.superset_group ? { ...item, superset_group: null } : item) };
    const next = day.exercises[index + 1];
    if (!next) return day;
    let group = 1;
    while (day.exercises.some(item => item.superset_group === group)) group++;
    // Include the next row's whole group so a third linked row is never orphaned.
    return { ...day, exercises: day.exercises.map(item => item.id === row.id || item.id === next.id ||
      (next.superset_group !== null && item.superset_group === next.superset_group) ? { ...item, superset_group: group } : item) };
  });
}
export function convertWeek(draft: ProgramDraft, id: () => string): ProgramDraft {
  if (weekly(draft) || draft.days.length > 7) return draft;
  return { ...draft, repeatWeekly: true, days: weekdays.map((_, weekday) => {
    const old = draft.days[weekday];
    return { id: old?.id ?? id(), program_id: draft.id, title: old?.title ?? '', position: weekday + 1,
      exercises: old?.exercises ?? [], cardio: old?.cardio ?? [], weekday, warmup: old?.warmup ?? emptyWarmup(),
      is_rest_day: !(old?.exercises.length || old?.cardio?.length) };
  }) };
}
export function restDay(draft: ProgramDraft, id: string, rest: boolean): ProgramDraft {
  return editDay(draft, id, day => ({ ...day, is_rest_day: rest,
    exercises: rest ? [] : day.exercises, cardio: rest ? [] : day.cardio }));
}

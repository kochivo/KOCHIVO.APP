import { dayWarmupSchema, emptyWarmup, resizePlan } from '@/features/programs';
import type { DayWarmup, DraftDay, DraftExercise, ProgramDraft } from '@/features/programs';

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
function linkRows(day: DraftDay, first: DraftExercise | undefined, second: DraftExercise | undefined): DraftDay {
  if (!first || !second) return day;
  const groups = [first.superset_group, second.superset_group].filter(group => group !== null);
  const members = day.exercises.filter(item => item.id === first.id || item.id === second.id ||
    (item.superset_group !== null && groups.includes(item.superset_group)));
  if (members.length > 3) return day;
  let group = 1;
  while (day.exercises.some(item => item.superset_group === group)) group++;
  const sets = Math.max(...members.map(item => item.sets));
  return { ...day, exercises: day.exercises.map(item => members.includes(item)
    ? { ...item, sets, set_plan: item.set_plan ? resizePlan(item.set_plan, sets) : item.set_plan, superset_group: group } : item) };
}
export function linkAbove(draft: ProgramDraft, dayId: string, id: string): ProgramDraft {
  return editDay(draft, dayId, day => {
    const index = day.exercises.findIndex(row => row.id === id);
    return linkRows(day, day.exercises[index - 1], day.exercises[index]);
  });
}
export function linkNext(draft: ProgramDraft, dayId: string, id: string): ProgramDraft {
  return editDay(draft, dayId, day => {
    const index = day.exercises.findIndex(row => row.id === id), row = day.exercises[index];
    if (!row) return day;
    if (row.superset_group !== null) return { ...day, exercises: day.exercises.map(item => item.superset_group === row.superset_group ? { ...item, superset_group: null } : item) };
    return linkRows(day, row, day.exercises[index + 1]);
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

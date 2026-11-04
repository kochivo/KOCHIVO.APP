import type { CardioRow, ProgramDraft } from './types';

export const weekdayKeys = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export const isWeekly = (draft: ProgramDraft) => draft.days.some(day => day.weekday != null);

export function convertToWeek(draft: ProgramDraft, id: () => string): ProgramDraft {
  if (draft.days.length > 7 || isWeekly(draft)) return draft;
  return { ...draft, repeatWeekly: true, days: weekdayKeys.map((_, weekday) => {
    const old = draft.days[weekday];
    return { id: old?.id ?? id(), program_id: draft.id, position: weekday + 1, title: old?.title ?? '',
      exercises: old?.exercises ?? [], cardio: old?.cardio ?? [], weekday,
      is_rest_day: !(old?.exercises.length || old?.cardio?.length) };
  }) };
}

export function setRestDay(draft: ProgramDraft, id: string, rest: boolean, confirmed: boolean): ProgramDraft {
  return { ...draft, days: draft.days.map(day => {
    if (day.id !== id || (rest && (day.exercises.length || day.cardio?.length) && !confirmed)) return day;
    return { ...day, is_rest_day: rest, exercises: rest ? [] : day.exercises, cardio: rest ? [] : day.cardio };
  }) };
}

export function editCardio(draft: ProgramDraft, id: string, cardio: CardioRow[]): ProgramDraft {
  return { ...draft, days: draft.days.map(day => day.id !== id ? day : {
    ...day, is_rest_day: cardio.length ? false : day.weekday != null && !day.exercises.length ? true : day.is_rest_day,
    cardio: cardio.map((row, index) => ({ ...row, position: index + 1 })),
  }) };
}

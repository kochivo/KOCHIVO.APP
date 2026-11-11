import type { DraftDay, ProgramDraft } from '@/features/programs';

export const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export interface WeekCell { id: string; weekday?: typeof weekdays[number]; day?: DraftDay; rest: boolean }

export function weekCells(program: ProgramDraft): WeekCell[] {
  if (program.days.some(day => day.weekday != null)) {
    return weekdays.map((weekday, index) => {
      const day = program.days.find(day => day.weekday === index);
      return { id: day?.id ?? `rest-${index}`, weekday, day, rest: !day || !!day.is_rest_day };
    });
  }
  return [...program.days].sort((a, b) => a.position - b.position)
    .map(day => ({ id: day.id, day, rest: !!day.is_rest_day }));
}

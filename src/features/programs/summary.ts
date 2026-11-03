import type { DraftDay, ProgramDraft } from './types';

export function daySummary(day: DraftDay) {
  return {
    exercises: day.exercises.length,
    sets: day.exercises.reduce((total, row) => total + row.sets, 0),
    minutes: Math.round(day.exercises.reduce((total, row) => total + row.sets * (40 + row.rest_seconds), 0) / 60 / 5) * 5,
  };
}
export function validateForActivation(draft: ProgramDraft): string[] {
  const errors: string[] = [];
  if (!draft.player_id) errors.push('اختار لاعب للبرنامج');
  if (!draft.title.trim() || draft.title.length > 80) errors.push('اكتب اسم للبرنامج لحد ٨٠ حرف');
  if (!draft.days.some(day => day.exercises.length > 0)) errors.push('ضيف يوم فيه تمرين واحد على الأقل');
  return errors;
}
export function escapeSearch(query: string): string {
  return query.replace(/[\\%_]/g, character => `\\${character}`);
}

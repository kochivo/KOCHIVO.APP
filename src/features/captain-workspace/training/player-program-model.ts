import type { ProgramDraft, DraftExercise, DraftDay } from '@/features/programs';

export type ProgramSummaryExercise = Pick<DraftExercise, 'id' | 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'set_plan'> & {
  library: { name_ar: string | null; name_en: string; media_path: string | null } | null;
};
export type ProgramSummaryCardio = Pick<NonNullable<DraftDay['cardio']>[number], 'id' | 'kind' | 'minutes' | 'intensity' | 'notes'>;
export interface ProgramSummary {
  id: string; title: string; startedOn: string | null; totalWeeks: number | null;
  days: { id: string; title: string; position: number; rest: boolean; exercises: ProgramSummaryExercise[]; cardio?: ProgramSummaryCardio[] }[];
}

export function programSummary(program: ProgramDraft): ProgramSummary {
  return {
    id: program.id, title: program.title,
    // Creation/subscription dates are not assignment starts. The current model stores neither assignment start nor length.
    startedOn: null, totalWeeks: null,
    days: [...program.days].sort((a, b) => a.position - b.position).map(day => ({
      id: day.id, title: day.title, position: day.position, rest: day.is_rest_day ?? false,
      cardio: [...(day.cardio ?? [])].sort((a, b) => a.position - b.position).map(row => ({
        id: row.id, kind: row.kind, minutes: row.minutes, intensity: row.intensity, notes: row.notes,
      })),
      exercises: [...day.exercises].sort((a, b) => a.position - b.position).map(row => ({
        id: row.id, sets: row.sets, reps_min: row.reps_min, reps_max: row.reps_max,
        rest_seconds: row.rest_seconds, set_plan: row.set_plan,
        library: row.library ? { name_ar: row.library.name_ar, name_en: row.library.name_en, media_path: row.library.media_path } : null,
      })),
    })),
  };
}

import { swapOptions } from '@/features/program-generator';
import type { DraftDay, LibraryExercise, ProgramDraft } from '@/features/programs';
import { daySummary, warmupMinutes } from '@/features/programs';

export type TaggedExercise = { exercise_id: string; pattern: string; stress: string[]; library: LibraryExercise };
export type TrainingContext = { fatPct: number | null; candidates: TaggedExercise[] };

const supportedInjuries = ['knee', 'shoulder', 'lower_back'] as const;
export type SupportedInjury = typeof supportedInjuries[number];

export function checkDays(programDays: number, trainingDays: readonly number[]): boolean {
  return programDays <= trainingDays.length;
}

export function checkMinutes(minutes: number, sessionMinutes: number): boolean {
  return minutes <= sessionMinutes;
}

export function injuryOverlap(stress: readonly string[] | undefined, injuries: readonly string[]): SupportedInjury[] {
  return supportedInjuries.filter(injury => injuries.includes(injury) && stress?.includes(injury));
}

export function injuryCount(stresses: readonly (readonly string[] | undefined)[], injuries: readonly string[]): number {
  return stresses.filter(stress => injuryOverlap(stress, injuries).length > 0).length;
}

export function swapSuggestion<T extends { exercise_id: string; pattern: string; stress: readonly string[] }>(
  exerciseId: string, injuries: readonly string[], candidates: readonly T[],
): T[] {
  return swapOptions(exerciseId, injuries.filter(injury => supportedInjuries.some(value => value === injury)), candidates).slice(0, 1);
}

export function selectedMinutes(day: DraftDay): number | null {
  if (day.is_rest_day) return 0;
  return day.exercises.length ? daySummary(day).minutes + warmupMinutes(day.warmup) : null;
}

export function replaceInjuryExercise(draft: ProgramDraft, dayId: string, rowId: string, library: LibraryExercise): ProgramDraft {
  return { ...draft, days: draft.days.map(day => day.id !== dayId ? day : { ...day,
    exercises: day.exercises.map(row => row.id !== rowId ? row : { ...row, exercise_id: library.id, library,
      alternatives: row.alternatives?.filter(id => id !== library.id),
      alternative_library: row.alternative_library?.filter(item => item.id !== library.id),
    }),
  }) };
}

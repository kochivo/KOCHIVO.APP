import type { Tables } from '@/types/database';
import type { DayWarmup } from './warmup';

export type ProgramStatus = Tables<'programs'>['status'];
export type LibraryExercise = Pick<Tables<'exercises'>,
  'id' | 'name_ar' | 'name_en' | 'body_part' | 'equipment' | 'media_path'> & {
    owner_id?: string | null; target?: string | null; video_url?: string | null; is_own?: boolean;
  };
export type ExerciseRow = Pick<Tables<'program_exercises'>,
  'id' | 'day_id' | 'exercise_id' | 'position' | 'superset_group' | 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'rir' | 'notes'>;
export type DraftExercise = ExerciseRow & { library: LibraryExercise | null };
export type CardioRow = Omit<Tables<'program_cardio'>, 'intensity'> & { intensity: 'low' | 'moderate' | 'high' };
export type DraftDay = Pick<Tables<'program_days'>, 'id' | 'program_id' | 'title' | 'position'> & {
  warmup: DayWarmup;
  weekday?: number | null; is_rest_day?: boolean; cardio?: CardioRow[]; exercises: DraftExercise[];
};
export type ProgramDraft = Pick<Tables<'programs'>, 'id' | 'player_id' | 'title' | 'status'> & {
  days: DraftDay[]; settings?: Tables<'programs'>['settings']; repeatWeekly?: boolean;
};
export type ProgramRow = Pick<Tables<'programs'>, 'id' | 'player_id' | 'title' | 'status' | 'captain_id' | 'is_template'>;
export type ExercisePatch = Partial<Pick<ExerciseRow, 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds' | 'rir' | 'notes'>>;
export type Result<T> = { data: T; error?: never } | { error: string; data?: never };

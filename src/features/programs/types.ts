export type ProgramStatus = 'draft' | 'active' | 'archived';
export type LibraryExercise = {
  id: string; name_ar: string | null; name_en: string; body_part: string;
  equipment: string | null; media_path: string | null;
};
export type ExerciseRow = {
  id: string; day_id: string; exercise_id: string; position: number;
  superset_group: number | null; sets: number; reps_min: number;
  reps_max: number | null; rest_seconds: number;
};
export type DraftExercise = ExerciseRow & { library: LibraryExercise | null };
export type DraftDay = { id: string; program_id: string; title: string; position: number; exercises: DraftExercise[] };
export type ProgramDraft = { id: string; player_id: string | null; title: string; status: ProgramStatus; days: DraftDay[] };
export type ProgramRow = Omit<ProgramDraft, 'days'> & { captain_id: string; is_template: boolean };
export type ExercisePatch = Partial<Pick<ExerciseRow, 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds'>>;
export type Result<T> = { data: T; error?: never } | { error: string; data?: never };
type Table<Row, Insert = Partial<Row>> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };
export type ProgramsDatabase = { public: {
  Tables: {
    programs: Table<ProgramRow>;
    program_days: Table<Omit<DraftDay, 'exercises'>>;
    program_exercises: Table<ExerciseRow>;
    exercises: Table<LibraryExercise>;
  };
  Views: Record<string, never>;
  Functions: { activate_program: { Args: { p_program: string }; Returns: undefined } };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

export type TemplateKind = 'program' | 'nutrition';
export type Template = { id: string; title: string; kind: TemplateKind; created_at: string; count: number };
export type TemplateResult<T> = { data: T; error?: never } | { error: string; data?: never };
type Table<Row, Update = never, Relations extends { foreignKeyName: string; columns: string[];
  isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }[] = []> = {
  Row: Row; Insert: never; Update: Update; Relationships: Relations;
};
type TemplateRow = { id: string; title: string; captain_id: string; is_template: boolean; created_at: string };
export type TemplatesDatabase = { public: {
  Tables: {
    profiles: Table<{ id: string; role: string }>;
    programs: Table<TemplateRow, { title: string }>;
    nutrition_plans: Table<TemplateRow, { title: string }>;
    program_days: Table<{ program_id: string }, never, [{ foreignKeyName: 'program_days_program_id_fkey';
      columns: ['program_id']; isOneToOne: false; referencedRelation: 'programs'; referencedColumns: ['id'] }]>;
    meals: Table<{ plan_id: string }, never, [{ foreignKeyName: 'meals_plan_id_fkey';
      columns: ['plan_id']; isOneToOne: false; referencedRelation: 'nutrition_plans'; referencedColumns: ['id'] }]>;
  };
  Views: Record<string, never>;
  Functions: {
    program_to_template: { Args: { p_program: string; p_title: string }; Returns: string };
    nutrition_plan_to_template: { Args: { p_plan: string; p_title: string }; Returns: string };
    assign_program_template: { Args: { p_template: string; p_player: string }; Returns: string };
    assign_nutrition_template: { Args: { p_template: string; p_player: string }; Returns: string };
  };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };

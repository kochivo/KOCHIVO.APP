export type TemplateKind = 'program' | 'nutrition';
export type Template = { id: string; title: string; kind: TemplateKind; created_at: string; count: number; starter: boolean;
  uses?: number; level?: 'beginner' | 'intermediate' | 'advanced'; minutes?: number;
  place?: 'gym' | 'dumbbells' | 'bodyweight'; protein?: number | null; split?: boolean; archived?: boolean };
export type TemplateResult<T> = { data: T; error?: never } | { error: string; data?: never };

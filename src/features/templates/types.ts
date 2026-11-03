export type TemplateKind = 'program' | 'nutrition';
export type Template = { id: string; title: string; kind: TemplateKind; created_at: string; count: number; starter: boolean };
export type TemplateResult<T> = { data: T; error?: never } | { error: string; data?: never };

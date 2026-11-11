import type { CustomFormFactKey, CustomFormKind, CustomFormQuestionType } from '@/types/enums';

export type Option = { value: string; label_ar: string; label_en: string };
export type AlertRule = { operator: 'eq' | 'gt' | 'lt'; value: string | number | boolean };
export type Schedule = { every: 'week'; weekday: number; hour: number } | { every: 'month'; day: number; hour: number };
export type Question = {
  id: string; form_id: string; position: number; label_ar: string; label_en: string;
  type: CustomFormQuestionType; required: boolean; options: Option[];
  maps_to: CustomFormFactKey | null; alert_on: AlertRule | null;
};
export type FormDraft = {
  id: string; captain_id: string; title: string; kind: CustomFormKind;
  schedule: Schedule | null; remind_after_hours: number | null; questions: Question[];
};
export type Template = {
  kind: Exclude<CustomFormKind, 'custom'>; schedule: Schedule | null;
  questions: Omit<Question, 'id' | 'form_id'>[];
};
export type Metrics = { active: number; sent: number; answered: number; recipients: number; averageHours: number | null };
export type LibraryData = { forms: FormDraft[]; metrics: Metrics; byForm: Record<string, Metrics> };

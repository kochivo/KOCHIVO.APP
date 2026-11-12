import { uuidv7 } from '@/core/offline/ids';
import { messages } from './messages';
import type { FormDraft, Question, Template } from './types';

export const mappingTypes: Record<NonNullable<Question['maps_to']>, Question['type'][]> = {
  weight: ['number'], targetWeight: ['number'], height: ['number'], age: ['number'],
  sessionMinutes: ['number'], waist: ['number'], sex: ['choice'], experience: ['choice'],
  trainingDays: ['multi'], injuries: ['multi'], medical: ['multi'], allergies: ['multi'], note: ['text'],
};
export function copyTemplate(template: Template, captain: string, id = uuidv7, locale: 'ar' | 'en' = 'ar'): FormDraft {
  const formId = id();
  return { id: formId, captain_id: captain, title: template.key === 'photos' ? messages[locale].photo : messages[locale].kinds[template.kind], kind: template.kind,
    schedule: template.schedule ? { ...template.schedule } : null, remind_after_hours: template.schedule ? 24 : null,
    questions: template.questions.map(q => ({ ...structuredClone(q), id: id(), form_id: formId })),
  };
}
export function newQuestion(formId: string, position: number, id = uuidv7): Question {
  return { id: id(), form_id: formId, position, label_ar: messages.ar.newQuestionAr,
    label_en: '', type: 'text', required: false, options: [], maps_to: null, alert_on: null };
}
export function reorderQuestions(questions: Question[], from: number, to: number): Question[] {
  if (from < 0 || to < 0 || from >= questions.length || to >= questions.length) return questions;
  const next = [...questions];
  const [question] = next.splice(from, 1);
  if (!question) return questions;
  next.splice(to, 0, question);
  return next.map((q, position) => ({ ...q, position }));
}
export function validateForm(form: FormDraft): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push('title');
  if (!form.questions.length) errors.push('questions');
  for (const q of form.questions) {
    if (!q.label_ar.trim()) errors.push('label');
    if (q.maps_to && !mappingTypes[q.maps_to]?.includes(q.type)) errors.push('mapping');
    if (['choice', 'multi'].includes(q.type) && (!q.options.length || q.options.some(o => !o.label_ar.trim())
      || new Set(q.options.map(o => o.value)).size !== q.options.length)) errors.push('options');
    if (q.alert_on && (typeof q.alert_on.value === 'number' && !Number.isFinite(q.alert_on.value)
      || (q.alert_on.operator !== 'eq' && (!['number', 'scale'].includes(q.type)
      || typeof q.alert_on.value !== 'number')) || q.alert_on.value === '')) errors.push('alert');
  }
  const s = form.schedule;
  if (s && (!Number.isInteger(s.hour) || s.hour < 0 || s.hour > 23
    || (s.every === 'week' ? !Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6
      : !Number.isInteger(s.day) || s.day < 1 || s.day > 31))) errors.push('schedule');
  if (form.remind_after_hours !== null && (!Number.isInteger(form.remind_after_hours)
    || form.remind_after_hours < 1 || form.remind_after_hours > 32767)) errors.push('reminder');
  return [...new Set(errors)];
}

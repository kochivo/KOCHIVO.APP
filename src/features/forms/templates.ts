import { messages } from './messages';
import type { Question, Template } from './types';

type Key = keyof typeof messages.en.labels;
const question = (key: Key, type: Question['type'], maps_to: Question['maps_to'] = null,
  alert_on: Question['alert_on'] = null): Omit<Question, 'id' | 'form_id'> => ({
  position: 0, label_ar: messages.ar.labels[key], label_en: messages.en.labels[key],
  type, maps_to, alert_on, required: key === 'weight', options: type === 'multi' ? [
    { value: 'pain', label_ar: messages.ar.pain, label_en: messages.en.pain },
    { value: 'none', label_ar: messages.ar.noIssues, label_en: messages.en.noIssues },
  ] : [],
});
const numbered = (questions: Template['questions']) => questions.map((q, position) => ({ ...q, position }));

export const templates: [Template, ...Template[]] = [
  { kind: 'checkin', schedule: { every: 'week', weekday: 5, hour: 9 }, questions: numbered([
    question('weight', 'number', 'weight'), question('waist', 'number', 'waist'),
    question('sleep', 'scale'), question('adherence', 'number'),
    question('injuries', 'multi', 'injuries', { operator: 'eq', value: 'pain' }),
    question('note', 'text', 'note'),
  ]) },
  { kind: 'onboarding', schedule: null, questions: numbered([
    question('weight', 'number', 'weight'), question('height', 'number', 'height'),
    question('age', 'number', 'age'), question('targetWeight', 'number', 'targetWeight'),
    question('medical', 'multi', 'medical'), question('allergies', 'multi', 'allergies'),
  ]) },
  { kind: 'progress', schedule: { every: 'month', day: 1, hour: 9 }, questions: numbered([
    question('weight', 'number', 'weight'), question('waist', 'number', 'waist'),
    question('photos', 'photos'), question('note', 'text', 'note'),
  ]) },
  { kind: 'injury', schedule: null, questions: numbered([
    question('injuries', 'multi', 'injuries', { operator: 'eq', value: 'pain' }), question('note', 'text', 'note'),
  ]) },
  { kind: 'update', schedule: null, questions: numbered([
    question('weight', 'number', 'weight'), question('targetWeight', 'number', 'targetWeight'),
    question('sessionMinutes', 'number', 'sessionMinutes'), question('note', 'text', 'note'),
  ]) },
  { key: 'photos', kind: 'progress', schedule: null, questions: numbered([
    question('photos', 'photos'), question('note', 'text', 'note'),
  ]) },
];

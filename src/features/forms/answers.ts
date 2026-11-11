import { stableId } from '@/core/offline/ids';
import type { QuestionValue } from './components/question-field';
import type { AlertRule, Question } from './types';
export type AnswerDraft = Record<string, { value: QuestionValue; photo_paths: string[] }>;
export function validAnswer(q: Question, value: QuestionValue, paths: readonly string[] = []): boolean {
  if (q.type === 'photos') return !q.required || paths.length > 0;
  if (value === null || value === '' || Array.isArray(value) && !value.length) return !q.required;
  if (q.type === 'number' || q.type === 'scale') return typeof value === 'number' && Number.isFinite(value)
    && (q.type !== 'scale' || Number.isInteger(value) && value >= 1 && value <= 10);
  if (q.type === 'yesno') return typeof value === 'boolean';
  if (q.type === 'choice') return typeof value === 'string' && q.options.some(o => o.value === value);
  if (q.type === 'multi') return Array.isArray(value) && value.every(v => q.options.some(o => o.value === v));
  return typeof value === 'string' && value.length <= 10000;
}
export function matchesAlert(rule: AlertRule | null, value: unknown): boolean {
  if (!rule) return false;
  if (rule.operator === 'eq') return Array.isArray(value) ? value.includes(rule.value) : value === rule.value;
  return typeof value === 'number' && typeof rule.value === 'number'
    && (rule.operator === 'gt' ? value > rule.value : value < rule.value);
}
export async function answerRows(requestId: string, questions: readonly Question[], draft: AnswerDraft) {
  return Promise.all(questions.map(async q => ({ id: await stableId(requestId,q.id), request_id: requestId,
    question_id: q.id, value: draft[q.id]?.value ?? null, photo_paths: draft[q.id]?.photo_paths ?? [] })));
}

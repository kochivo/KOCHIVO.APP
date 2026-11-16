import type { Tables } from '@/types/database';
import type { RequestData } from '../request-types';
import type { Question } from '../types';
import { decodeQuestion } from './validation';

export function requestQuestions(request: RequestData['request'] & { question_snapshot?: unknown },
  current: Question[], answers: RequestData['answers']): Question[] {
  if (Array.isArray(request.question_snapshot)) {
    // The database trigger owns this JSON and captures complete question rows.
    const snapshot = (request.question_snapshot as Tables<'form_questions'>[]).map(decodeQuestion)
      .filter(q => request.answered_at || request.reviewed_at || current.some(live => live.id === q.id));
    return [...snapshot, ...current.filter(q => !snapshot.some(old => old.id === q.id) && answers.some(a => a.question_id === q.id))];
  }
  // Legacy completed requests have no historical question list. Answers are the
  // only reliable evidence; current questions may have been added since sending.
  return request.answered_at || request.reviewed_at ? current.filter(q => answers.some(a => a.question_id === q.id)) : current;
}

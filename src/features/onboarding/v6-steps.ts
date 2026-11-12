import { makeIntakeSchema } from './data/intake-schema';
import type { IntakeDraft } from './wizard';

export const questions = [
  'full_name', 'sex', 'birth_year', 'height_cm', 'weight_kg', 'target_weight_kg',
  'training_days', 'session_minutes', 'experience', 'injuries', 'medical', 'allergies', 'notes',
] as const;
export type IntakeQuestion = typeof questions[number];
export const optionalQuestions: readonly IntakeQuestion[] = ['target_weight_kg', 'injuries', 'medical', 'allergies', 'notes'];
export function questionValid(field: IntakeQuestion, draft: IntakeDraft, now: Date) {
  return makeIntakeSchema(now).intakeSchema.shape[field].safeParse(draft[field]).success;
}

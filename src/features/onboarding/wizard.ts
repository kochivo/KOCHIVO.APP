import { makeIntakeSchema } from './data/intake-schema';
import type { Intake } from './data/intake-schema';

export const stepOrder = ['basics', 'schedule', 'health', 'food'] as const;
export type IntakeStep = typeof stepOrder[number];
export type IntakeDraft = Partial<Intake>;
export type StepProps = {
  draft: IntakeDraft;
  update: (patch: IntakeDraft) => void;
  errors: Partial<Record<keyof Intake, string>>;
  touch: (field: keyof Intake) => void;
};

export function canAdvance(step: IntakeStep, draft: IntakeDraft, now: Date): boolean {
  return makeIntakeSchema(now).stepSchemas[step].safeParse(draft).success;
}

export function progress(step: IntakeStep): number {
  return (stepOrder.indexOf(step) + 1) / stepOrder.length * 100;
}

function exclusive<Key extends string>(keys: Key[] = []): Key[] {
  return [...new Set(keys.filter((key) => key !== 'none' || keys.length === 1))];
}

export function toPayload(draft: IntakeDraft) {
  return {
    birth_year: draft.birth_year, sex: draft.sex, height_cm: draft.height_cm,
    weight_kg: draft.weight_kg, target_weight_kg: draft.target_weight_kg ?? null,
    training_days: draft.training_days, session_minutes: draft.session_minutes, experience: draft.experience,
    injuries: exclusive(draft.injuries), medical: exclusive(draft.medical), allergies: exclusive(draft.allergies),
    notes: draft.notes?.trim() || null,
  };
}

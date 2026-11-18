import { makeIntakeSchema } from './data/intake-schema';
import type { Intake } from './data/intake-schema';

// Optional intake screens can be inserted here when their schema lands.
export const stepOrder = ['basics', 'schedule', 'health', 'food'] as const;
export type IntakeStep = typeof stepOrder[number];
export type IntakeDraft = Partial<Intake>;
export type StepProps = {
  draft: IntakeDraft;
  update: (patch: IntakeDraft) => void;
  errors: Partial<Record<keyof Intake, string>>;
  touch: (field: keyof Intake) => void;
};

export const sampleMeasurements = { birth_year: 1998, height_cm: 170, weight_kg: 75 } as const;

export const metricBounds = {
  height_cm: { min: 100, max: 250, step: 0.5 },
  weight_kg: { min: 25, max: 300, step: 0.5 },
  target_weight_kg: { min: 25, max: 300, step: 0.5 },
} as const;
export type Metric = keyof typeof metricBounds;

export function clampMetric(field: Metric, value: number): number {
  const { min, max } = metricBounds[field];
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

export type CompletionStage = 'preparing' | 'success';
export async function completeIntake(
  save: () => Promise<{ error?: string }>,
  show: (stage: CompletionStage) => void,
  redirect: () => void,
  wait: (milliseconds: number) => Promise<void>,
) {
  const result = await save();
  if (result.error) return result;
  show('preparing');
  await wait(1200);
  show('success');
  await wait(1200);
  redirect();
  return result;
}

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
    full_name: draft.full_name?.trim(), birth_year: draft.birth_year, sex: draft.sex, height_cm: draft.height_cm,
    weight_kg: draft.weight_kg, target_weight_kg: draft.target_weight_kg ?? null,
    training_days: draft.training_days, session_minutes: draft.session_minutes, experience: draft.experience,
    injuries: exclusive(draft.injuries), medical: exclusive(draft.medical), allergies: exclusive(draft.allergies),
    notes: draft.notes?.trim() || null,
    food_budget_monthly_egp: draft.food_budget_monthly_egp ?? null,
  };
}

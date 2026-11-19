import type { Macros } from './macros';

const defaultPlanTargets: Readonly<Macros> = { kcal: 2000, protein: 150, carbs: 225, fat: 56 };

export function planTargets(targets: { [Key in keyof Macros]: number | null }): Macros {
  return {
    kcal: targets.kcal ?? defaultPlanTargets.kcal,
    protein: targets.protein ?? defaultPlanTargets.protein,
    carbs: targets.carbs ?? defaultPlanTargets.carbs,
    fat: targets.fat ?? defaultPlanTargets.fat,
  };
}

export function positive(...values: number[]) {
  if (values.some(value => !Number.isFinite(value) || value <= 0)) throw new RangeError('Expected positive finite values');
}

export function validateTrainingDays(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 7) throw new RangeError('Expected 0–7 training days');
}

/** Rounded to 10 kcal: the resulting weekly mean may differ by at most 5 kcal/day. */
export function cycle(avgKcal: number, trainingDays: number) {
  positive(avgKcal);
  validateTrainingDays(trainingDays);
  const round10 = (value: number) => Math.round(value / 10) * 10;
  if (trainingDays === 0 || trainingDays === 7) return { training: round10(avgKcal), rest: round10(avgKcal) };
  const training = round10(avgKcal * 1.08);
  return { training, rest: round10((7 * avgKcal - trainingDays * training) / (7 - trainingDays)) };
}

export function dayTargets(targets: Macros, trainingDays: number, day: 'training' | 'rest'): Macros {
  // An empty numeric input is temporarily zero; save validation reports it without crashing the editor.
  if (!Number.isFinite(targets.kcal) || targets.kcal <= 0) return targets;
  const kcal = cycle(targets.kcal, trainingDays)[day];
  return { ...targets, kcal, carbs: Math.max(0, Math.round((kcal - targets.protein * 4 - targets.fat * 9) / 4)) };
}

export type Goal = 'cut' | 'maintain' | 'bulk';
export interface BodyInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  bodyFatPct?: number;
}

function positive(...values: number[]) {
  if (values.some(value => !Number.isFinite(value) || value <= 0)) throw new RangeError('Expected positive finite values');
}
function days(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 7) throw new RangeError('Expected 0–7 training days');
}
function rawBmr(input: BodyInputs) {
  positive(input.weightKg, input.heightCm, input.age);
  if (input.bodyFatPct !== undefined) {
    if (!Number.isFinite(input.bodyFatPct) || input.bodyFatPct < 0 || input.bodyFatPct >= 100) throw new RangeError('Invalid body fat');
    return 370 + 21.6 * input.weightKg * (1 - input.bodyFatPct / 100);
  }
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === 'male' ? 5 : -161);
}

export function bmr(input: BodyInputs): number {
  return Math.round(rawBmr(input));
}

/** Days/week: 0–1 → 1.2, 2–3 → 1.375, 4–5 → 1.55, 6–7 → 1.725.
 * Sessions ≥75 minutes add .05; the overall factor cannot exceed 1.9. */
export function activityFactor(trainingDays: number, sessionMinutes: number): number {
  days(trainingDays);
  if (!Number.isFinite(sessionMinutes) || sessionMinutes < 0) throw new RangeError('Invalid session duration');
  const base = trainingDays <= 1 ? 1.2 : trainingDays <= 3 ? 1.375 : trainingDays <= 5 ? 1.55 : 1.725;
  return Math.min(1.9, base + (sessionMinutes >= 75 ? .05 : 0));
}

/** BMR is explicit because it cannot be recovered from TDEE alone. Pass unrounded values. */
export function targetKcal(tdee: number, goal: Goal, rateKgPerWeek: number, bmrKcal: number): number {
  positive(tdee, bmrKcal);
  if (!Number.isFinite(rateKgPerWeek) || rateKgPerWeek < 0) throw new RangeError('Invalid weekly rate');
  const change = rateKgPerWeek * 7700 / 7;
  return Math.round(goal === 'cut' ? Math.max(bmrKcal, tdee - change) : goal === 'bulk' ? tdee + change : tdee);
}

export function calculateEnergy(body: BodyInputs, trainingDays: number, sessionMinutes: number, goal: Goal, rate: number) {
  const basal = rawBmr(body);
  const tdee = basal * activityFactor(trainingDays, sessionMinutes);
  return { bmr: Math.round(basal), tdee: Math.round(tdee), target: targetKcal(tdee, goal, rate, basal) };
}

export function macros(kcal: number, weightKg: number, { proteinGPerKg = 2, fatPct = 25 } = {}) {
  positive(kcal, weightKg);
  if (![proteinGPerKg, fatPct].every(Number.isFinite) || proteinGPerKg < 0 || fatPct < 0 || fatPct > 100) {
    throw new RangeError('Invalid macro allocation');
  }
  const protein = Math.round(weightKg * proteinGPerKg);
  const fat = Math.round(kcal * fatPct / 100 / 9);
  const remainder = kcal - protein * 4 - fat * 9;
  if (remainder < 0) throw new RangeError('Macros exceed calories');
  const carbs = Math.round(remainder / 4);
  return { grams: { protein, fat, carbs }, percentages: {
    protein: protein * 4 / kcal * 100, fat: fat * 9 / kcal * 100, carbs: carbs * 4 / kcal * 100,
  } };
}

/** Rounded to 10 kcal: the resulting weekly mean may differ by at most 5 kcal/day. */
export function cycle(avgKcal: number, trainingDays: number) {
  positive(avgKcal);
  days(trainingDays);
  const round10 = (value: number) => Math.round(value / 10) * 10;
  if (trainingDays === 0 || trainingDays === 7) return { training: round10(avgKcal), rest: round10(avgKcal) };
  const training = round10(avgKcal * 1.08);
  return { training, rest: round10((7 * avgKcal - trainingDays * training) / (7 - trainingDays)) };
}

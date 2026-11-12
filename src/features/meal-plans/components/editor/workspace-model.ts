import type { PlayerFacts } from '@/features/player-file';
import { calculateEnergy, macros } from '../../energy';
import { copyTrainingMeals } from '../../editor-rules';
import type { PlanDraft } from '../../types';

export function automaticTargets(facts: PlayerFacts) {
  const weightKg = facts.weight?.value;
  const heightCm = facts.height?.value;
  const age = facts.age?.value;
  const sex = facts.sex?.value;
  const trainingDays = facts.trainingDays?.value.length;
  const sessionMinutes = facts.sessionMinutes?.value;
  if (weightKg === undefined || heightCm === undefined || age === undefined ||
    (sex !== 'male' && sex !== 'female') || trainingDays === undefined || sessionMinutes === undefined) return null;
  const target = facts.targetWeight?.value;
  const goal = target == null || target === weightKg ? 'maintain' : target < weightKg ? 'cut' : 'bulk';
  try {
    const energy = calculateEnergy({ weightKg, heightCm, age, sex }, trainingDays, sessionMinutes, goal, goal === 'bulk' ? .25 : .5);
    return { kcal: energy.target, ...macros(energy.target, weightKg).grams };
  } catch { return null; }
}

export function openRestDay(draft: PlanDraft, id: () => string): PlanDraft {
  if (draft.meals.some(meal => meal.dayType === 'rest')) return draft;
  return copyTrainingMeals({ ...draft, meals: draft.meals.map(meal =>
    !meal.dayType || meal.dayType === 'all' ? { ...meal, dayType: 'training' } : meal) }, id);
}

export function tileState(planned: number, target: number) {
  const percent = target > 0 ? Math.round(planned / target * 100) : planned > 0 ? 100 : 0;
  return { percent, over: planned > target, bar: Math.min(100, Math.max(0, percent)) };
}

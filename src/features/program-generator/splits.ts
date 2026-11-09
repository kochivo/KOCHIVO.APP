import type { GeneratorBrief } from './brief';
import type { Pattern } from './pick';

type DayRecipe = readonly Pattern[];
export const injuryPatterns: Record<GeneratorBrief['injuries'][number], readonly Pattern[]> = {
  knee: ['squat', 'lunge', 'legs_iso'], shoulder: ['h_push', 'v_push', 'shoulder_iso', 'chest_iso'],
  lower_back: ['hinge', 'squat'],
};
const substitutes: Record<Pattern, readonly Pattern[]> = {
  squat: ['hinge', 'legs_iso', 'core'], lunge: ['hinge', 'legs_iso', 'calves'], hinge: ['legs_iso', 'core'],
  h_push: ['chest_iso', 'triceps'], v_push: ['h_push', 'triceps'],
  h_pull: ['v_pull', 'biceps'], v_pull: ['h_pull', 'biceps'],
  chest_iso: ['core'], shoulder_iso: ['core'], biceps: ['core'], triceps: ['core'],
  legs_iso: ['core'], calves: ['core'], core: [],
};

export function slotPatterns(pattern: Pattern): Pattern[] {
  const ordered: Pattern[] = [pattern];
  // Breadth first preserves each recipe's direct preferences before indirect fallbacks.
  for (const current of ordered) for (const substitute of substitutes[current]) {
    if (!ordered.includes(substitute)) ordered.push(substitute);
  }
  return ordered;
}
const fullA: DayRecipe = ['squat', 'h_push', 'h_pull', 'hinge', 'core', 'biceps', 'calves', 'triceps'];
const fullB: DayRecipe = ['hinge', 'v_pull', 'h_push', 'lunge', 'core', 'triceps', 'calves', 'biceps'];
const fullC: DayRecipe = ['lunge', 'h_pull', 'v_push', 'squat', 'core', 'biceps', 'calves', 'legs_iso'];
const upper: DayRecipe = ['h_push', 'h_pull', 'v_push', 'v_pull', 'biceps', 'triceps', 'shoulder_iso', 'chest_iso'];
const lower: DayRecipe = ['squat', 'hinge', 'lunge', 'legs_iso', 'calves', 'core', 'legs_iso', 'core'];
const push: DayRecipe = ['h_push', 'v_push', 'h_push', 'chest_iso', 'triceps', 'shoulder_iso', 'triceps', 'core'];
const pull: DayRecipe = ['h_pull', 'v_pull', 'h_pull', 'biceps', 'shoulder_iso', 'biceps', 'core', 'core'];
const splits: Record<number, readonly DayRecipe[]> = {
  2: [fullA, fullB], 3: [fullA, fullB, fullC], 4: [upper, lower, upper, lower],
  5: [push, pull, lower, upper, lower], 6: [push, pull, lower, push, pull, lower],
};

export function slotRecipes(brief: GeneratorBrief): Pattern[][] {
  const count = brief.minutes === 45 ? 4 : brief.minutes === 60 ? 6 : 8;
  return (splits[brief.weekdays.length] ?? []).map(day => day.map(pattern => {
    if (pattern === 'v_pull' && brief.equipment !== 'gym' && brief.level === 'beginner') return 'h_pull';
    if (brief.equipment !== 'bodyweight') return pattern;
    // The bodyweight catalog has insufficient genuine overhead presses or chest/delt isolations.
    if (pattern === 'v_push' || pattern === 'chest_iso') return 'h_push';
    if (pattern === 'shoulder_iso') return 'core';
    return pattern;
  }).sort((a, b) => Number(!['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull'].includes(a))
    - Number(!['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull'].includes(b))).slice(0, count));
}

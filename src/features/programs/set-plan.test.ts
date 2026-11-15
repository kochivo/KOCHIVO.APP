import { expect, it } from 'vitest';
import { planLabel, resizePlan, targetForSet, uniformPlan, setPlanSchema } from './set-plan';
import { addDay, addExercise, updateExercise } from './draft';

const row = { sets: 3, reps_min: 8, reps_max: 12, rir: 2 };
it('creates independent uniform targets and falls back for old snapshots', () => {
  const plan = uniformPlan(row);
  expect(plan).toEqual(Array.from({ length: 3 }, () => ({ reps_min: 8, reps_max: 12, rir: 2 })));
  expect(plan[0]).not.toBe(plan[1]);
  expect(targetForSet({ ...row, rir: undefined }, 0)).toEqual({ reps_min: 8, reps_max: 12, rir: null });
});
it('repeats the last target when growing and trims without mutating', () => {
  const plan = [{ reps_min: 12, reps_max: 12, rir: null }, { reps_min: 8, reps_max: null, rir: 0 }];
  expect(resizePlan(plan, 4)).toEqual([plan[0], plan[1], plan[1], plan[1]]);
  expect(resizePlan(plan, 1)).toEqual([plan[0]]);
  expect(plan).toHaveLength(2);
  expect(targetForSet({ ...row, set_plan: plan }, 1)).toEqual(plan[1]);
  expect(planLabel([{ reps_min: 12, reps_max: 12, rir: null }, { reps_min: 10, reps_max: 10, rir: 2 },
    { reps_min: 8, reps_max: 8, rir: 3 }])).toBe('12 · 10 · 8');
});
it('validates integer targets, ranges and nullable RIR', () => {
  for (const target of [{ reps_min: 0, reps_max: null, rir: null }, { reps_min: 8.5, reps_max: 12, rir: 2 },
    { reps_min: 8, reps_max: 7, rir: 2 }, { reps_min: 8, reps_max: null, rir: 6 }, { reps_min: 8 }]) {
    expect(setPlanSchema.safeParse([target]).success).toBe(false);
  }
});
it('accepts drop prescriptions and rejects unsafe drop settings', () => {
  const target = { reps_min: 8, reps_max: 12, rir: 2 };
  expect(setPlanSchema.safeParse([{ ...target, drop: { count: 2, percent: 20, mode: 'failure', reps: null } }]).success).toBe(true);
  for (const drop of [{ count: 4, percent: 20, mode: 'failure' }, { count: 2, percent: 50, mode: 'failure' },
    { count: 2, percent: 20, mode: 'reps' }]) {
    expect(setPlanSchema.safeParse([{ ...target, drop }]).success).toBe(false);
  }
});
it('keeps the set count and target plan in step through draft edits', () => {
  const library = { id: 'exercise', name_ar: null, name_en: 'Bench', body_part: 'chest', equipment: null, media_path: null };
  let draft = addExercise(addDay({ id: 'p', player_id: null, title: 'P', status: 'draft', days: [] }, 'd'), 'd', library, 'r');
  draft = updateExercise(draft, 'd', 'r', { set_plan: uniformPlan(row), alternatives: ['alt'] });
  draft = updateExercise(draft, 'd', 'r', { sets: 4 });
  expect(draft.days[0]?.exercises[0]?.set_plan).toHaveLength(4);
  expect(draft.days[0]?.exercises[0]?.alternatives).toEqual(['alt']);
});

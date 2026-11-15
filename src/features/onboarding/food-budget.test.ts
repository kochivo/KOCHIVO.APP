import { expect, it } from 'vitest';
import { makeIntakeSchema } from './data/intake-schema';
import { toPayload } from './wizard';
import { questionValid } from './v6-steps';

const schema = makeIntakeSchema(new Date('2026-11-15T12:00:00Z')).stepSchemas.food;
it('preserves an optional monthly budget and rejects out-of-range amounts', () => {
  expect(schema.parse({ notes: null, food_budget_monthly_egp: 4500 }).food_budget_monthly_egp).toBe(4500);
  expect(schema.safeParse({ notes: null, food_budget_monthly_egp: 299 }).success).toBe(false);
  expect(schema.safeParse({ notes: null, food_budget_monthly_egp: 100001 }).success).toBe(false);
  expect(schema.safeParse({ notes: null, food_budget_monthly_egp: '' }).success).toBe(true);
});
it('keeps the budget when submitting or skipping the optional notes question', () => {
  expect(toPayload({ food_budget_monthly_egp: 4500 }).food_budget_monthly_egp).toBe(4500);
  expect(questionValid('notes', { notes: '', food_budget_monthly_egp: 299 }, new Date('2026-11-15T12:00:00Z'))).toBe(false);
});

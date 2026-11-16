'use server';
import { z } from 'zod';
import { listPlayerPlans, loadPlan } from './plan-io';

export async function currentFoodPlan(playerId: string) {
  if (!z.uuid().safeParse(playerId).success) throw new Error('Invalid player');
  const plans = await listPlayerPlans(playerId);
  if (!plans.ok) throw new Error(plans.error);
  const plan = plans.data.find(row => row.status === 'active') ?? plans.data.find(row => row.status === 'draft');
  if (!plan) return null;
  const result = await loadPlan(plan.id);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

'use server';
import { applyDecisionAt } from './decision-internal';
import type { ActionResult } from '@/lib/action-result';
import type { Decision } from '../score';

export async function applyDecision(playerId: string, decision: Decision): Promise<ActionResult<Decision>> {
  return applyDecisionAt(playerId, decision, new Date());
}

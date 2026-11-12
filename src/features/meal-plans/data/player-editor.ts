'use server';

import { getT } from '@/core/i18n/server';
import { uuidv7 } from '@/core/offline/ids';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { fail, ok } from '@/lib/action-result';
import { planClient } from './client';
import { loadEditorContext } from './editor-context';
import { listPlayerPlans, loadPlan, savePlan } from './plan-io';
import { automaticTargets } from '../components/editor/workspace-model';
import { messages } from '../components/editor/workspace/messages';
import { messages as planMessages } from '../messages';
import type { PlanDraft } from '../types';
import { draftSchema } from './plan-schema';

export async function loadPlayerEditor(playerId: string) {
  if (!captainWorkspaceEnabled()) throw new Error('Workspace disabled');
  const [context, plans, t] = await Promise.all([loadEditorContext(playerId), listPlayerPlans(playerId), getT(messages)]);
  if (!plans.ok) throw new Error(plans.error);
  const selected = plans.data.find(plan => plan.status === 'draft') ?? plans.data.find(plan => plan.status === 'active');
  if (selected) {
    const result = await loadPlan(selected.id);
    if (!result.ok) throw new Error(result.error);
    return { context, plans: plans.data, draft: result.data, fresh: false };
  }
  const targets = automaticTargets(context.facts);
  const draft: PlanDraft = { id: uuidv7(), playerId, title: t('title', { name: context.name }).slice(0, 80), status: 'draft',
    targets: targets ?? { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [] };
  return { context, plans: plans.data, draft, fresh: true };
}

// Insert only on the first edit/send, never as a side effect of reading the route.
export async function savePlayerEditor(draft: PlanDraft) {
  const t = await getT(planMessages);
  if (!captainWorkspaceEnabled()) return fail(t('couldntSaveTryAgain'));
  if (!draft.playerId || !draftSchema.safeParse(draft).success) return fail(t('checkThePlanNameMealsTargetsAnd'));
  const client = await planClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return fail(t('signInFirst'));
  const result = await client.from('nutrition_plans').upsert({ id: draft.id, player_id: draft.playerId,
    captain_id: data.user.id, title: draft.title }, { onConflict: 'id', ignoreDuplicates: true });
  if (result.error) return fail(t('couldntSaveTryAgain'));
  return savePlan(draft);
}

export async function createReplacementPlan(playerId: string) {
  if (!captainWorkspaceEnabled()) throw new Error('Workspace disabled');
  const [context, t] = await Promise.all([loadEditorContext(playerId), getT(messages)]);
  const draft: PlanDraft = { id: uuidv7(), playerId, title: t('title', { name: context.name }).slice(0, 80), status: 'draft',
    targets: automaticTargets(context.facts) ?? { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [] };
  const result = await savePlayerEditor(draft);
  return result.ok ? ok(draft.id) : result;
}

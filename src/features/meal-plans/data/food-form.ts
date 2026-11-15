import 'server-only';

import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { fail, ok } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { messages } from '../messages';
import type { Food } from '../types';
import { planClient, toFood } from './client';
import type { FoodRow } from './client';
import { foodFields } from './editor-fields';

async function loadFood(id: string, copy: boolean): Promise<ActionResult<Food>> {
  const t = await getT(messages);
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(id).success) return fail(t('foodUnavailableTryAgain'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) return fail(t('signInFirst'));
  let request = client.from('foods').select('*').eq('id', id).is('archived_at', null);
  // Global rows can seed an insert, but are never loaded as editable captain rows.
  request = copy ? request.is('owner_id', null) : request.eq('owner_id', user.data.user.id);
  // The generated database types predate units; foodFields validates its runtime shape.
  const { data, error } = await request.maybeSingle().overrideTypes<FoodRow | null, { merge: false }>();
  if (error || !data) return fail(t('foodUnavailableTryAgain'));
  return ok({ ...toFood(data), ...foodFields(data) });
}

export async function loadFoodForEdit(id: string) {
  return loadFood(id, false);
}

export async function loadFoodForCopy(id: string) {
  return loadFood(id, true);
}

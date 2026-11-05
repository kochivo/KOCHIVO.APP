'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { z } from 'zod';
import { readError } from '@/core/supabase/errors';
import { planClient } from './client';
import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';

export async function activatePlan(id: string): Promise<ActionResult<void>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return fail(t('planNotFound'));
  const client = await planClient();
  const { error } = await client.rpc('activate_nutrition_plan', { p_plan: id });
  if (error) return fail(readError(error).code === '22023' ? t('addAMealAndFoodFirst') : t('couldntActivateTryAgain'));
  return ok(undefined);
}

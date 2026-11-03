'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { z } from 'zod';
import { readError } from '@/core/supabase/errors';
import { planClient } from './client';

export async function activatePlan(id: string): Promise<void> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) throw new Error(t('planNotFound'));
  const client = await planClient();
  const { error } = await client.rpc('activate_nutrition_plan', { p_plan: id });
  if (error) throw new Error(readError(error).code === '22023' ? t('addAMealAndFoodFirst') : t('couldntActivateTryAgain'));
}

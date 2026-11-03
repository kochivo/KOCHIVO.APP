'use server';
import { z } from 'zod';
import { readError } from '@/core/supabase/errors';
import { planClient } from './client';

export async function activatePlan(id: string): Promise<void> {
  z.uuid().parse(id);
  const client = await planClient();
  const { error } = await client.rpc('activate_nutrition_plan', { p_plan: id });
  if (error) throw new Error(readError(error).code === '22023' ? 'ضيف وجبة وأكلة الأول' : 'التفعيل متعملش. جرّب تاني');
}

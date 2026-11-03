'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import type { Result } from '../types';

export async function activateProgram(id: string): Promise<Result<true>> {
  if (!z.uuid().safeParse(id).success) return { error: 'البرنامج مش موجود' };
  try {
    const client = await supabaseServer();
    const { error } = await client.rpc('activate_program', { p_program: id });
    if (error) return { error: readError(error).code === '22023' ? 'ضيف يوم فيه تمرين واختار لاعب الأول' :
      isPermissionDenied(error) ? 'البرنامج مش متاح ليك' : 'التفعيل متعملش. جرّب تاني' };
    revalidatePath('/captain');
    revalidatePath('/player');
    return { data: true };
  } catch { return { error: 'التفعيل متعملش. جرّب تاني' }; }
}

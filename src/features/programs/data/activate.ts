'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import type { ProgramsDatabase, Result } from '../types';

export async function activateProgram(id: string): Promise<Result<true>> {
  if (!z.uuid().safeParse(id).success) return { error: 'البرنامج مش موجود' };
  try {
    const client = await supabaseServer() as unknown as SupabaseClient<ProgramsDatabase>;
    const { error } = await client.rpc('activate_program', { p_program: id });
    if (error) return { error: error.code === '22023' ? 'ضيف يوم فيه تمرين واختار لاعب الأول' :
      error.code === '42501' ? 'البرنامج مش متاح ليك' : 'التفعيل متعملش. جرّب تاني' };
    revalidatePath('/captain');
    revalidatePath('/player');
    return { data: true };
  } catch { return { error: 'التفعيل متعملش. جرّب تاني' }; }
}

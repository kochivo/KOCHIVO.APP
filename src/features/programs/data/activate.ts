'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import type { Result } from '../types';

export async function activateProgram(id: string): Promise<Result<true>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return { error: t('programNotFound') };
  try {
    const client = await supabaseServer();
    const { error } = await client.rpc('activate_program', { p_program: id });
    if (error) return { error: readError(error).code === '22023' ? t('addAnExerciseDayAndChooseA') :
      isPermissionDenied(error) ? t('youCantAccessThisProgram') : t('couldntActivateTryAgain') };
    revalidatePath('/captain');
    revalidatePath('/player');
    return { data: true };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntActivateTryAgain') }; }
}

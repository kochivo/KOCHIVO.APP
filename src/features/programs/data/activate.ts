'use server';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { isPermissionDenied, readError } from '@/core/supabase/errors';

export async function activateProgram(id: string): Promise<ActionResult<true>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return fail(t('programNotFound'));
  try {
    const client = await supabaseServer();
    const { error } = await client.rpc('activate_program', { p_program: id });
    if (error) return fail(readError(error).code === '22023' ? t('addAnExerciseDayAndChooseA') :
      isPermissionDenied(error) ? t('youCantAccessThisProgram') : t('couldntActivateTryAgain'));
    revalidatePath('/captain');
    revalidatePath('/player');
    return ok(true);
  } catch (error) { unstable_rethrow(error); return fail(t('couldntActivateTryAgain')); }
}

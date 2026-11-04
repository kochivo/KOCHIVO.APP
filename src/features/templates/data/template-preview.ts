'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { nutritionPreview, programPreview } from '../preview-model';
import type { TemplatePreview } from '../preview-model';
import type { TemplateResult } from '../types';

const identity = z.object({ kind: z.enum(['program', 'nutrition']), id: z.uuid() }).strict();

export async function previewTemplate(input: unknown): Promise<TemplateResult<TemplatePreview>> {
  const t = await getT(messages);
  const parsed = identity.safeParse(input);
  if (!parsed.success) return { error: t('templateOrSourceNotFound') };
  const { kind, id } = parsed.data;
  try {
    const client = await supabaseServer();
    const user = await client.auth.getClaims();
    if (user.error || !user.data?.claims.sub) return { error: t('signInFirst') };
    const captain = user.data.claims.sub;
    if (kind === 'program') {
      const row = await client.from('programs')
        .select('program_days(position,title,program_exercises(position,sets,reps_min,reps_max,exercises(name_ar,name_en)))')
        .eq('id', id).eq('captain_id', captain).eq('is_template', true).maybeSingle();
      if (row.error) throw row.error;
      return row.data ? { data: programPreview(row.data) } : { error: t('templateOrSourceNotFound') };
    }
    const row = await client.from('nutrition_plans')
      .select('meals(position,name,meal_items(position,grams,foods(name_ar,name_en,kcal_per_100g)))')
      .eq('id', id).eq('captain_id', captain).eq('is_template', true).maybeSingle();
    if (row.error) throw row.error;
    return row.data ? { data: nutritionPreview(row.data) } : { error: t('templateOrSourceNotFound') };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Template preview failed', error);
    return { error: t('couldntLoadPreview') };
  }
}

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';

import { supabaseServer } from '@/core/supabase/server';
import { makeIntakeSchema } from './intake-schema';
import type { TablesInsert } from '@/types/database';

export async function saveIntakeAt(input: unknown, now: Date): Promise<{ error?: string }> {
  const t = await getT(messages);
  const parsed = makeIntakeSchema(now, t).intakeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t('reviewYourAnswers') };
  try {
    const client = await supabaseServer();
    const { data, error: authError } = await client.auth.getClaims();
    if (authError || !data?.claims.sub) return { error: t('signInFirst') };
    // The name lives on the profile so the captain's roster shows who joined.
    const { full_name, ...intake } = parsed.data;
    const { error: nameError } = await client.from('profiles').update({ full_name }).eq('id', data.claims.sub);
    if (nameError) return { error: t('couldntSendYourAnswersTryAgain') };
    // Preserve the validated additive field while generated types await regeneration.
    const payload: TablesInsert<'player_intake'> = {
      ...intake, player_id: data.claims.sub, completed_at: now.toISOString(),
    };
    const { error } = await client.from('player_intake').upsert(payload, { onConflict: 'player_id' });
    if (error) return { error: t('couldntSendYourAnswersTryAgain') };
    return {};
  } catch {
    return { error: t('couldntSendYourAnswersTryAgain') };
  }
}

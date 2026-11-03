import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';

import { supabaseServer } from '@/core/supabase/server';
import { makeIntakeSchema } from './intake-schema';

export async function saveIntakeAt(input: unknown, now: Date): Promise<{ error?: string }> {
  const t = await getT(messages);
  const parsed = makeIntakeSchema(now, t).intakeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t('reviewYourAnswers') };
  try {
    const client = await supabaseServer();
    const { data, error: authError } = await client.auth.getClaims();
    if (authError || !data?.claims.sub) return { error: t('signInFirst') };
    const { error } = await client.from('player_intake').upsert({
      ...parsed.data, player_id: data.claims.sub, completed_at: now.toISOString(),
    }, { onConflict: 'player_id' });
    if (error) return { error: t('couldntSendYourAnswersTryAgain') };
    return {};
  } catch {
    return { error: t('couldntSendYourAnswersTryAgain') };
  }
}

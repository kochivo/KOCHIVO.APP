import type { Locale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
export async function hasIntake(locale?: Locale): Promise<boolean> {
  const t = await getT(messages, locale);
  const client = await supabaseServer();
  const { data: auth, error: authError } = await client.auth.getClaims();
  if (authError) throw new Error(t('couldntVerifyYourAccountTryAgain'));
  if (!auth?.claims.sub) throw new Error(t('signInFirst'));
  const { data, error } = await client.from('player_intake').select('player_id')
    .eq('player_id', auth.claims.sub).maybeSingle();
  if (error) throw new Error(t('couldntLoadYourDetailsTryAgain'));
  return data !== null;
}

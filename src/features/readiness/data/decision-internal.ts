import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getPlayerTimezone } from '@/core/timezone/server';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { localDate } from '@/lib/dates';
import { fail, ok } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import type { Decision } from '../score';
import { messages } from '../messages';

export async function applyDecisionAt(playerId: string, decision: Decision, now: Date): Promise<ActionResult<Decision>> {
  const t = await getT(messages);
  try {
    if (!['keep', 'reduce', 'rest'].includes(decision)) return fail(t('saveError'));
    const client = await supabaseServer();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return fail(t('saveError'));
    const result = await client.from('readiness_decisions').upsert({
      id: uuidv7(), captain_id: data.user.id, player_id: playerId,
      decision_date: localDate(now, await getPlayerTimezone(playerId)), decision,
    }, { onConflict: 'player_id,decision_date' });
    return result.error ? fail(t('saveError')) : ok(decision);
  } catch (error) { unstable_rethrow(error); return fail(t('saveError')); }
}

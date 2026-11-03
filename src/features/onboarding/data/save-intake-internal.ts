import 'server-only';

import { supabaseServer } from '@/core/supabase/server';
import { makeIntakeSchema } from './intake-schema';

export async function saveIntakeAt(input: unknown, now: Date): Promise<{ error?: string }> {
  const parsed = makeIntakeSchema(now).intakeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'راجع إجاباتك' };
  try {
    const client = await supabaseServer();
    const { data, error: authError } = await client.auth.getClaims();
    if (authError || !data?.claims.sub) return { error: 'ادخل حسابك الأول' };
    const { error } = await client.from('player_intake').upsert({
      ...parsed.data, player_id: data.claims.sub, completed_at: now.toISOString(),
    }, { onConflict: 'player_id' });
    if (error) return { error: 'مش قادرين نبعت إجاباتك. جرّب تاني' };
    return {};
  } catch {
    return { error: 'مش قادرين نبعت إجاباتك. جرّب تاني' };
  }
}

'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { isValidTimezone } from '@/lib/timezone';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages } from '../messages';
import type { SettingsProfile } from '../schema';

const preferences = z.object({ timezone: z.string().refine(isValidTimezone).optional(), timezone_auto: z.boolean().optional(),
  units: z.enum(['metric', 'imperial']).optional() }).strict();
export async function saveCaptainPreferences(input: unknown): Promise<{ data?: SettingsProfile; error?: string }> {
  const t = await getT(messages);
  const parsed = preferences.safeParse(input);
  if (!captainWorkspaceEnabled() || !parsed.success) return { error: t('couldnTSaveChangesTryAgain') };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) return { error: t('couldnTSaveChangesTryAgain') };
    const result = await client.from('profiles').update(parsed.data).eq('id', auth.data.user.id).eq('role', 'captain').select('*').single();
    return result.error || !result.data ? { error: t('couldnTSaveChangesTryAgain') } : { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('couldnTSaveChangesTryAgain') }; }
}

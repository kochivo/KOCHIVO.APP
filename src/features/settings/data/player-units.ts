'use server';

import { supabaseServer } from '@/core/supabase/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function savePlayerUnits(units: string): Promise<void> {
  if (!captainWorkspaceEnabled() || (units !== 'metric' && units !== 'imperial')) throw new Error('Invalid units');
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Unauthenticated');
  const result = await client.from('profiles').update({ units }).eq('id', data.user.id).eq('role', 'player').select('units').single();
  if (result.error || result.data?.units !== units) throw new Error('Units save failed');
}

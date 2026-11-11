import 'server-only';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { supabaseServer } from '@/core/supabase/server';

export async function formsAccess() {
  if (!captainWorkspaceEnabled()) notFound();
  const client = await supabaseServer();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) notFound();
  const profile = await client.from('profiles').select('role,captain_status,suspended_at').eq('id', user.id).single();
  if (profile.error || profile.data.role !== 'captain' || profile.data.captain_status !== 'approved'
    || profile.data.suspended_at) notFound();
  return { client, captain: user.id };
}

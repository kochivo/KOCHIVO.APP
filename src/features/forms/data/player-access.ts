import 'server-only';
import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { supabaseServer } from '@/core/supabase/server';
export async function playerFormsAccess() {
  if (!captainWorkspaceEnabled()) notFound();
  const client = await supabaseServer();
  const { data:{user},error } = await client.auth.getUser();
  if (error || !user) notFound();
  const profile = await client.from('profiles').select('role,suspended_at').eq('id',user.id).single();
  if (profile.error || profile.data.role !== 'player' || profile.data.suspended_at) notFound();
  return { client,player:user.id };
}

'use server';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { publicPageSchema } from '../public-page-schema';

export async function savePublicPage(input: unknown): Promise<{ ok: boolean }> {
  if (!captainWorkspaceEnabled()) return { ok: false };
  const parsed = publicPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) return { ok: false };
    const id = auth.data.user.id;
    const profile = await client.from('profiles').select('role').eq('id', id).single();
    if (profile.error || profile.data?.role !== 'captain') return { ok: false };
    const saved = await client.from('profiles').update(parsed.data).eq('id', id).eq('role', 'captain').select('id').single();
    return { ok: !saved.error && !!saved.data };
  } catch (error) { unstable_rethrow(error); return { ok: false }; }
}

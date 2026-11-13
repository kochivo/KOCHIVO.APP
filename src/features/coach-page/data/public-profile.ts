import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@/core/supabase/server';
import { coachSlug } from '../slug';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export const loadPublicCoach = cache(async (slug: string) => {
  if (!coachSlug(slug)) return null;
  const client = await supabaseServer();
  const enabled = captainWorkspaceEnabled();
  const [profileResult, pageResult, statsResult] = await Promise.allSettled([
    client.rpc('coach_public_profile', { slug }),
    enabled ? client.rpc('coach_public_page', { slug }) : Promise.resolve(null),
    enabled ? client.rpc('coach_public_stats', { slug }) : Promise.resolve(null),
  ]);
  if (profileResult.status === 'rejected') throw profileResult.reason;
  const result = profileResult.value;
  if (result.error) throw result.error;
  const coach = result.data?.[0];
  if (!coach) return null;
  const avatar = coach.avatar_path && coach.avatar_path.startsWith(`${coach.id}/`)
    ? client.storage.from('captain-avatars').getPublicUrl(coach.avatar_path).data.publicUrl : null;
  const page = pageResult.status === 'fulfilled' && !pageResult.value?.error ? pageResult.value?.data?.[0] ?? null : null;
  const stats = page?.show_public_stats && statsResult.status === 'fulfilled' && !statsResult.value?.error
    ? statsResult.value?.data ?? null : null;
  return { ...coach, avatar, page, stats };
});

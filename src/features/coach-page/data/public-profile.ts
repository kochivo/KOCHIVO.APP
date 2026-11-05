import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@/core/supabase/server';
import { coachSlug } from '../slug';

export const loadPublicCoach = cache(async (slug: string) => {
  if (!coachSlug(slug)) return null;
  const client = await supabaseServer();
  const result = await client.rpc('coach_public_profile', { slug });
  if (result.error) throw result.error;
  const coach = result.data?.[0];
  if (!coach) return null;
  const avatar = coach.avatar_path && coach.avatar_path.startsWith(`${coach.id}/`)
    ? client.storage.from('captain-avatars').getPublicUrl(coach.avatar_path).data.publicUrl : null;
  return { ...coach, avatar };
});

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { uuidv7 } from '@/core/offline/ids';
import { coachSlug } from '@/lib/coach-slug';
import { profile } from './auth-client';
import { homeFor } from '../routing';

export async function completeCoachRequest(client: SupabaseClient<AppDatabase>, rawSlug: string) {
  const slug = coachSlug(rawSlug);
  if (!slug) throw new Error('invalid coach');
  const user = await profile(client);
  if (user?.admin) return homeFor(user);
  if (!user || (user.role === 'captain' && user.roleConfirmed)) throw new Error('player required');
  if (!user.roleConfirmed) {
    const result = await client.rpc('confirm_role', { p_role: 'player' });
    if (result.error) throw result.error;
  }
  const coach = await client.rpc('coach_public_profile', { slug });
  if (coach.error) throw coach.error;
  const captain = coach.data?.[0];
  if (!captain) throw new Error('coach unavailable');
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('unauthenticated');
  const request = await client.from('coach_join_requests').insert({ id: uuidv7(), captain_id: captain.id, player_id: auth.data.user.id });
  // Returning to the confirmation link is safe and must not create a second pending request.
  if (request.error && request.error.code !== '23505') throw request.error;
  return `/c/${slug}?requested=1`;
}

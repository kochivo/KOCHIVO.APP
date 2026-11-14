'use server';

import { unstable_rethrow } from 'next/navigation';
import { currentClaims } from '@/core/supabase/claims';
import { unreadCounts } from '@/features/chat/server';
import { rosterClient } from '../data/client';
import { fetchRoster } from '../data/roster';
import { fetchWaitingCount } from '../data/navigation-count';
import { frameCounts } from './captain-frame-model';

async function safe<T>(read: Promise<T>): Promise<T | null> {
  try { return await read; } catch (error) { unstable_rethrow(error); return null; }
}

export async function loadCaptainFrameCounts() {
  const client = await rosterClient();
  const auth = await currentClaims();
  const captain = auth.data?.claims.sub;
  if (auth.error || !captain) throw new Error('Unauthenticated');
  const [waiting, chats, joins] = await Promise.all([
    fetchWaitingCount(), safe(unreadCounts(client, captain)),
    client.rpc('pending_coach_join_requests'),
  ]);
  const joinCount = joins.error ? null : joins.data.length;
  return frameCounts({ tasks: waiting === null || joinCount === null ? null : Math.max(0, waiting - joinCount), chats, joins: joinCount });
}

export async function loadCaptainFrame() {
  const client = await rosterClient();
  const auth = await currentClaims();
  const captain = auth.data?.claims.sub;
  if (auth.error || !captain) throw new Error('Unauthenticated');
  const [roster, counts, profile] = await Promise.all([
    fetchRoster(), loadCaptainFrameCounts(),
    client.from('profiles').select('full_name,avatar_path').eq('id', captain).single(),
  ]);
  return {
    counts,
    players: roster.players?.map(player => ({ id: player.playerId, name: player.fullName })) ?? null,
    captain: profile.error ? null : { name: profile.data.full_name, avatar: profile.data.avatar_path
      ? client.storage.from('captain-avatars').getPublicUrl(profile.data.avatar_path).data.publicUrl : null },
  };
}
export type CaptainFrameData = Awaited<ReturnType<typeof loadCaptainFrame>>;

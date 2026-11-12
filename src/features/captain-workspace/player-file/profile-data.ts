'use server';
import { fetchPlayerProfile } from '@/features/player-profile';
import { cache } from 'react';

const cachedProfile = cache(fetchPlayerProfile);

// Share the existing authorized read between the shell and its training content.
export async function readPlayerProfile(playerId: string) {
  return cachedProfile(playerId);
}

'use server';

import { archivePlayerAt } from './archive-player-internal';

export async function archivePlayer(playerId: unknown): Promise<{ success: true } | { error: string }> {
  return archivePlayerAt(playerId, new Date());
}

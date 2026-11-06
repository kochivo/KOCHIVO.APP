'use server';
import { createPlayerInviteAt } from './create-player-invite-internal';

export async function createPlayerInvite(input: unknown): Promise<{ code: string } | { error: string }> {
  return createPlayerInviteAt(input, new Date());
}

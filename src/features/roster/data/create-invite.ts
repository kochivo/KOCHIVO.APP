'use server';

import { createInviteAt } from './create-invite-internal';

export async function createInvite(days: unknown): Promise<{ code: string } | { error: string }> {
  return createInviteAt(days, new Date());
}

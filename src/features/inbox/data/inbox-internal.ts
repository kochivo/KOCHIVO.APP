import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import 'server-only';

import { z } from 'zod';
import { inboxClient } from './client';
import type { InboxItem, Result } from '../types';
const identity = z.object({ kind: z.enum(['form', 'checkin']), id: z.uuid() });
const tableFor = (kind: InboxItem['kind']) => kind === 'form' ? 'form_checks' as const : 'check_ins' as const;

export async function reviewItemAt(input: unknown, now: Date): Promise<Result<true>> {
  const t = await getT(messages);
  const parsed = identity.extend({ reply: z.string().trim().max(1000) }).safeParse(input);
  if (!parsed.success) return { error: t('replyLimit') };
  try {
    const client = await inboxClient();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) return { error: t('signIn') };
    const result = await client.from(tableFor(parsed.data.kind)).update({
      reviewed_at: now.toISOString(), captain_reply: parsed.data.reply || null,
    }).eq('id', parsed.data.id).eq('captain_id', auth.data.user.id).select('id');
    if (result.error || result.data?.length !== 1) throw new Error();
    return { data: true };
  } catch { return { error: t('sendFailed') }; }
}

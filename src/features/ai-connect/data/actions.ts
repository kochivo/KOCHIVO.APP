'use server';
import { redirect } from 'next/navigation';
import { profileTimezone } from '@/lib/timezone';
import { mcpOrigin } from '@/features/mcp/server';
import { connectAccount } from './access';
import { countWeeklyMcpCalls } from './usage';
import { oauthRedirectUrl } from './oauth-path';

export async function decideConsent(id: string, decision: 'approve' | 'deny') {
  if (!mcpOrigin() || typeof id !== 'string' || !id ||
      (decision !== 'approve' && decision !== 'deny')) return false;
  const url = await (async () => {
    const account = await connectAccount();
    if (!account || (decision === 'approve' && !account.eligible)) return null;
    const oauth = account.db.auth.oauth;
    const options = { skipBrowserRedirect: true };
    const result = decision === 'approve'
      ? await oauth.approveAuthorization(id, options) : await oauth.denyAuthorization(id, options);
    return result.error || !result.data?.redirect_url ? null : oauthRedirectUrl(result.data.redirect_url);
  })().catch(() => null);
  if (url) redirect(url);
  return false;
}

export async function loadConnectedTools(now: Date = new Date()) {
  const account = await connectAccount();
  if (!account?.eligible) throw new Error('Connected tools unavailable');
  const { db, id, profile } = account;
  const [grants, usage] = await Promise.all([
    db.auth.oauth.listGrants(), countWeeklyMcpCalls(db, id, now, profileTimezone(profile?.timezone)),
  ]);
  if (grants.error || usage.error) throw new Error('Could not load connected tools');
  return { grants: grants.data ?? [], count: usage.count ?? 0 };
}

export async function revokeConnectedTool(clientId: string) {
  if (typeof clientId !== 'string' || !clientId) return false;
  try {
    const account = await connectAccount();
    if (!account?.eligible) return false;
    const { error } = await account.db.auth.oauth.revokeGrant({ clientId });
    return !error;
  } catch {
    return false;
  }
}

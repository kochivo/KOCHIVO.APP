import 'server-only';
import { fetchRoster } from '@/features/roster/server';
import { currentClaims } from '@/core/supabase/claims';
import { WorkspaceInboxEntry } from './workspace-entry';
export async function WorkspaceInbox() {
  const [roster, claims] = await Promise.all([fetchRoster(), currentClaims()]);
  return <WorkspaceInboxEntry players={roster.players ?? []} captainId={claims.data?.claims.sub ?? ''}
    at={new Date().toISOString()} error={roster.error || (claims.error ? 'auth' : undefined)} />;
}

import 'server-only';
import { JoinRequestsList, loadJoinRequests } from '@/features/coach-page';
import { WorkspaceInboxEntry } from './workspace-entry';
export async function WorkspaceInbox() {
  const requests = await loadJoinRequests();
  const joinRequests = Object.fromEntries((requests.data ?? []).map(row => [row.id, <JoinRequestsList key={row.id} rows={[row]} />]));
  return <WorkspaceInboxEntry joinRequests={joinRequests} />;
}

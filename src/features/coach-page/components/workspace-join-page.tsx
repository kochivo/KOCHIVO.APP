import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { ensureCaptainSlug } from '../data/captain-slug';
import { loadJoinRequests } from '../data/join-requests';
import { WorkspaceJoinView } from './workspace-join-view';

export async function WorkspaceJoinPage() {
  const [requests, link] = await Promise.all([loadJoinRequests(), ensureCaptainSlug()]);
  async function retryLink() {
    'use server';
    return ensureCaptainSlug();
  }

  return <WorkspaceJoinView initialRequests={requests} initialLink={link} retryLinkAction={retryLink}
    phone={captainWorkspaceEnabled()} now={new Date().getTime()} />;
}

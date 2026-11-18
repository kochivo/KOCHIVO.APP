import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { loadCaptainSlug } from '../data/captain-slug';
import { loadJoinRequests } from '../data/join-requests';
import { WorkspaceJoinView } from './workspace-join-view';

export async function WorkspaceJoinPage() {
  const [requests, link] = await Promise.all([loadJoinRequests(), loadCaptainSlug()]);
  async function retryLink() {
    'use server';
    return loadCaptainSlug();
  }

  return <WorkspaceJoinView initialRequests={requests} initialLink={link} retryLinkAction={retryLink}
    phone={captainWorkspaceEnabled()} now={new Date().getTime()} />;
}

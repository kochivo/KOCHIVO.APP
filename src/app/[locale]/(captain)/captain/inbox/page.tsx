import { InboxScreen, messages } from '@/features/inbox';
import { createT, parseLocale } from '@/core/i18n';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  if (captainWorkspaceEnabled()) {
    const { workspaceTitle } = await import('@/features/inbox/server');
    return { title: await workspaceTitle() };
  }
  const { locale } = await params;
  return { title: createT(messages, parseLocale(locale))('inbox') };
}

export default async function InboxPage() {
  if (captainWorkspaceEnabled()) {
    const { WorkspaceInbox } = await import('@/features/inbox/server');
    return <WorkspaceInbox />;
  }
  return <InboxScreen />;
}

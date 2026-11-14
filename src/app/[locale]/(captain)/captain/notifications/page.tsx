import { notFound } from 'next/navigation';
import { CaptainNotificationsEntry } from '@/features/notifications';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default function NotificationsPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <CaptainNotificationsEntry />;
}

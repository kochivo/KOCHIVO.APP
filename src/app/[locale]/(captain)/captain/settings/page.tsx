import { CaptainSettings, SettingsScreen } from '@/features/settings';
import { SignOutButton } from '@/features/auth';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default function SettingsPage() {
  if (captainWorkspaceEnabled()) return <CaptainSettings signOut={<SignOutButton variant="danger" className="min-h-12 rounded-full border-line! bg-transparent! text-ink!" />} />;
  return <SettingsScreen signOut={<SignOutButton variant="danger" className="min-h-12 w-full" />} />;
}

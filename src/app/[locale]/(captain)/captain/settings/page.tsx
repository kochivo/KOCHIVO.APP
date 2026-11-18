import { CaptainSettings, SettingsScreen } from '@/features/settings';
import { SignOutButton } from '@/features/auth';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { connectedToolsSettings } from '@/features/ai-connect/server';

export default async function SettingsPage() {
  const connectedTools = await connectedToolsSettings();
  if (captainWorkspaceEnabled()) return <CaptainSettings connectedTools={connectedTools}
    signOut={<SignOutButton variant="danger" className="min-h-12 rounded-full border-line! bg-transparent! text-ink!" />} />;
  return <SettingsScreen connectedTools={connectedTools} signOut={<SignOutButton variant="danger" className="min-h-12 w-full" />} />;
}

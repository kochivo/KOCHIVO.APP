import { SettingsScreen } from '@/features/settings';
import { SignOutButton } from '@/features/auth';

export default function SettingsPage() {
  return <SettingsScreen signOut={<SignOutButton variant="danger" className="min-h-12 w-full" />} />;
}

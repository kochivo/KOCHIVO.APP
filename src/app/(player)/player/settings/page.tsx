import { SettingsScreen } from '@/features/settings';

export default function SettingsPage() {
  // The captain layout already provides <main>; the player shell does not.
  return <main className="px-5 pt-6 pb-32"><SettingsScreen /></main>;
}

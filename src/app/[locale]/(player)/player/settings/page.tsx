import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { playerHomeMessages } from '@/features/player-home';
import { SettingsScreen } from '@/features/settings';
import { SignOutButton } from '@/features/auth';

export default function SettingsPage() {
  // The captain layout already provides <main>; the player shell does not.
  return <main className="px-5 pt-6 pb-32"><SettingsScreen signOut={<SignOutButton variant="danger" className="min-h-12 w-full" />} /></main>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerHomeMessages, parseLocale((await params).locale));
  return { title: t('settingsTitle') };
}

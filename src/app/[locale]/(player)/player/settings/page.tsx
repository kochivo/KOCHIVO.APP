import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { playerHomeMessages } from '@/features/player-home/server';
import { SettingsScreen } from '@/features/settings';
import { SignOutButton } from '@/features/auth';

import { connectedToolsSettings } from '@/features/ai-connect/server';

export default async function SettingsPage() {
  const connectedTools = await connectedToolsSettings();
  // The captain layout already provides <main>; the player shell does not.
  return <main className="px-page-x pt-section pb-32"><SettingsScreen connectedTools={connectedTools} signOut={<SignOutButton variant="danger" className="min-h-12 w-full" />} /></main>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerHomeMessages, parseLocale((await params).locale));
  return { title: t('settingsTitle') };
}

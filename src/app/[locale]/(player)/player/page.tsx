import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { playerHomeMessages } from '@/features/player-home';
import { fetchPlayerIdentity, HomeScreen } from '@/features/player-home';

export default async function PlayerPage() {
  const { firstName, playerId } = await fetchPlayerIdentity();
  return <HomeScreen firstName={firstName} playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerHomeMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}

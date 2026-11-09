import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { RankScreen, ranksMessages } from '@/features/ranks';
import { fetchPlayerIdentity } from '@/features/player-home';

export default async function RankPage() {
  const { playerId } = await fetchPlayerIdentity();
  return <RankScreen playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(ranksMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}

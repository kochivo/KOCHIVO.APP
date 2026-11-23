import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { progressMessages } from '@/features/progress';
import { ProgressScreen } from '@/features/progress';
import { fetchPlayerIdentity } from '@/features/player-home/server';
import { AnalyticsLoader } from '@/features/muscle-analytics';

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ checkin?: string }> }) {
  const { playerId } = await fetchPlayerIdentity();
  const autoOpenCheckin = (await searchParams).checkin === '1';
  return <ProgressScreen autoOpenCheckin={autoOpenCheckin} analytics={playerId ? <AnalyticsLoader playerId={playerId} self /> : null} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(progressMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}

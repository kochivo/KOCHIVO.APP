import { HistoryScreen, workoutMessages } from '@/features/workout';
import { getT } from '@/core/i18n/server';
import { parseLocale } from '@/core/i18n/locale';
import { fetchWorkoutIdentity } from '@/features/workout';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  const playerId = await fetchWorkoutIdentity();
  const { exercise } = await searchParams;
  return <HistoryScreen playerId={playerId ?? ''} exerciseId={exercise} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(workoutMessages, parseLocale((await params).locale));
  return { title: t('historyTitle') };
}

import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { workoutMessages } from '@/features/workout';
import { fetchWorkoutIdentity, FocusScreen } from '@/features/workout';

export default async function WorkoutPage({ params }: { params: Promise<{ dayId: string; locale: string }> }) {
  const { dayId } = await params;
  const playerId = await fetchWorkoutIdentity();
  return <FocusScreen key={dayId} dayId={dayId} playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(workoutMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}

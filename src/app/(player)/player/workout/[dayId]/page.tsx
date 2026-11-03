import { fetchWorkoutIdentity, FocusScreen } from '@/features/workout';

export default async function WorkoutPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const playerId = await fetchWorkoutIdentity();
  return <FocusScreen key={dayId} dayId={dayId} playerId={playerId} />;
}

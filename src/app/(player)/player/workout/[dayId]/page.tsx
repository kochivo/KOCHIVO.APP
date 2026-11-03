import { FocusScreen } from '@/features/workout';
import { supabaseServer } from '@/core/supabase/server';

export default async function WorkoutPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  let playerId: string | undefined;
  try {
    const client = await supabaseServer();
    const { data } = await client.auth.getUser();
    playerId = data.user?.id;
  } catch {
    // Focus mode can resume from the cached snapshot without a network lookup.
  }
  return <FocusScreen key={dayId} dayId={dayId} playerId={playerId} />;
}

import { PlayerPlans } from '@/features/meal-plans';

export default async function Page({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  return <PlayerPlans playerId={playerId} />;
}

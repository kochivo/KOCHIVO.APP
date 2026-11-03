import { ProgramBuilder } from '@/features/programs';

export default async function PlayerProgramsPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  return <ProgramBuilder key={playerId} playerId={playerId} />;
}

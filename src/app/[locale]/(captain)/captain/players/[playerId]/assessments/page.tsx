import { notFound } from 'next/navigation';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function Page({ params }: { params: Promise<{ playerId: string }> }) {
  if (!captainWorkspaceEnabled()) notFound();
  const { playerId } = await params;
  const { PlayerFileEntry } = await import('@/features/captain-workspace/server');
  return <PlayerFileEntry playerId={playerId} tab="assessments" />;
}

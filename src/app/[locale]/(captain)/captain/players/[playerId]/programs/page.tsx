import { createT, parseLocale } from '@/core/i18n';
import { programMessages } from '@/features/programs';
import { ProgramBuilder } from '@/features/programs';
import { GenerateButton } from '@/features/program-generator';
import { fetchPlayerProfile } from '@/features/player-profile';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function PlayerProgramsPage({ params }: { params: Promise<{ playerId: string; locale: string }> }) {
  const { playerId } = await params;
  if (captainWorkspaceEnabled()) {
    const { WorkspaceEntry } = await import('@/features/captain-workspace');
    return <WorkspaceEntry playerId={playerId} />;
  }
  const profile = await fetchPlayerProfile(playerId);
  return <div className="space-y-6">
    <div className="mx-auto max-w-5xl"><GenerateButton key={`${playerId}-${!!profile.data}`} playerId={playerId} profileError={!profile.data}
      playerName={profile.data?.name} intake={profile.data?.intake} /></div>
    <ProgramBuilder key={playerId} playerId={playerId} />
  </div>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(programMessages, parseLocale(locale));
  return { title: t('programs') };
}

import { createT, parseLocale } from '@/core/i18n';
import { programMessages } from '@/features/programs';
import { ProgramBuilder } from '@/features/programs';
import { GenerateButton } from '@/features/program-generator';
import { fetchPlayerProfile } from '@/features/player-profile';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { redirect } from 'next/navigation';

export default async function PlayerProgramsPage({ params, searchParams }: { params: Promise<{ playerId: string; locale: string }>; searchParams?: Promise<{ view?: string | string[] }> }) {
  const { playerId } = await params;
  if (captainWorkspaceEnabled()) {
    if ((await searchParams)?.view === 'forms') redirect(`/captain/players/${playerId}/assessments`);
    const { TrainingEntry } = await import('@/features/captain-workspace/server');
    return <TrainingEntry playerId={playerId} />;
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

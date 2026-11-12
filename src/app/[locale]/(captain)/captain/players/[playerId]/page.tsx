import { getTimezone } from '@/core/timezone/server';
import { createT, parseLocale } from '@/core/i18n';
import { localDate } from '@/lib/dates';
import { fetchPlayerProfile, parseTab, playerProfileMessages, ProfileScreen } from '@/features/player-profile';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ playerId: string; locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const [{ playerId }, { tab }] = await Promise.all([params, searchParams]);
  if (captainWorkspaceEnabled()) {
    const legacyTab = parseTab(tab);
    if (tab) redirect(`/captain/players/${playerId}${legacyTab === 'plan' ? '/programs' : ['checkins', 'analysis', 'readiness'].includes(legacyTab) ? '/checkins' : ''}`);
    const { PlayerFileEntry } = await import('@/features/captain-workspace/server');
    return <PlayerFileEntry key={playerId} playerId={playerId} />;
  }
  return <ProfileScreen key={playerId} playerId={playerId} tab={parseTab(tab)} today={localDate(new Date(), await getTimezone())} data={fetchPlayerProfile(playerId)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: createT(playerProfileMessages, parseLocale(locale))('profile') };
}

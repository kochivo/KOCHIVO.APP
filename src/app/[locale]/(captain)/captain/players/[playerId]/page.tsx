import { createT, parseLocale } from '@/core/i18n';
import { localDate } from '@/lib/dates';
import { fetchPlayerProfile, parseTab, playerProfileMessages, ProfileScreen } from '@/features/player-profile';

interface Props {
  params: Promise<{ playerId: string; locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const [{ playerId }, { tab }] = await Promise.all([params, searchParams]);
  return <ProfileScreen key={playerId} playerId={playerId} tab={parseTab(tab)} today={localDate(new Date())} data={fetchPlayerProfile(playerId)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: createT(playerProfileMessages, parseLocale(locale))('profile') };
}

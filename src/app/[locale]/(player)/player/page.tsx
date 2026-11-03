import { SignOutButton } from '@/features/auth';
import { fetchPlayerIdentity, HomeScreen } from '@/features/player-home';

export default async function PlayerPage() {
  const { firstName, playerId } = await fetchPlayerIdentity();
  return <HomeScreen firstName={firstName} playerId={playerId} signOut={<SignOutButton />} />;
}

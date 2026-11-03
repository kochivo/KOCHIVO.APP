import { SignOutButton } from '@/features/auth';
import { HomeScreen } from '@/features/player-home';
import { supabaseServer } from '@/core/supabase/server';

export default async function PlayerPage() {
  let firstName: string | undefined;
  let playerId: string | undefined;
  try {
    const client = await supabaseServer();
    const { data } = await client.auth.getUser();
    if (data.user) {
      playerId = data.user.id;
      const profile = await client.from('profiles').select('full_name').eq('id', data.user.id)
        .maybeSingle<{ full_name: string }>();
      firstName = profile.data?.full_name.trim().split(/\s+/)[0] || undefined;
    }
  } catch {
    // The local program remains usable when the optional greeting lookup fails.
  }
  return <HomeScreen firstName={firstName} playerId={playerId} signOut={<SignOutButton />} />;
}

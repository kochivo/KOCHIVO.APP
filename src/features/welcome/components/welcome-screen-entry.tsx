import { redirect } from 'next/navigation';
import { currentClaims } from '@/core/supabase/claims';
import { supabaseServer } from '@/core/supabase/server';
import { decideRoute } from '@/features/auth';
import { WelcomeFlow } from './welcome-flow-entry';

export async function WelcomeScreen() {
  const { data, error } = await currentClaims();
  if (!error && data?.claims?.sub) {
    const db = await supabaseServer();
    const { data: profiles } = await db.rpc('my_approval_route_profile');
    const profile = profiles?.[0];
    if (profile && (profile.role === 'captain' || profile.role === 'player')) {
      const decision = decideRoute({ path: '/login', user: {
        role: profile.role, admin: profile.is_admin === true, roleConfirmed: profile.role_confirmed === true,
        suspended: profile.suspended_at != null, captainStatus: profile.captain_status,
      } });
      if (decision.redirect) redirect(decision.redirect);
    }
  }
  return <WelcomeFlow />;
}

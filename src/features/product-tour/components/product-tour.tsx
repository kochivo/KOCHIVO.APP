import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { TourLoader } from '@/ui/tour-loader';
import { markTourSeen } from '../data/seen';

async function loadTourState() {
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error('Tour session unavailable');
    const profile = await client.from('profiles').select('tour_seen_at, demo_expires_at').eq('id', data.user.id).single();
    if (profile.error) throw profile.error;
    return { userId: data.user.id, seenAt: profile.data.tour_seen_at,
      demo: !!data.user.is_anonymous || !!profile.data.demo_expires_at };
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Could not load tour state', error);
    return null;
  }
}

export async function ProductTour({ role }: { role: 'captain' | 'player' }) {
  const state = await loadTourState();
  return state ? <TourLoader {...state} role={role} onSeen={markTourSeen} /> : null;
}

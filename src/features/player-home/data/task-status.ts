'use server';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { hasIntake } from '@/features/onboarding';
import { saturdayWeek } from '@/lib/dates';

export async function fetchTaskStatus(today: string) {
  try {
    const client = await supabaseServer();
    const { data: auth, error } = await client.auth.getClaims();
    if (error || !auth?.claims.sub) throw new Error('Missing session');
    const [intakeDone, checkins, notes] = await Promise.all([
      hasIntake(),
      client.from('check_ins').select('week_start').eq('player_id', auth.claims.sub)
        .eq('week_start', saturdayWeek(today)[0] ?? today),
      client.from('voice_notes').select('id,created_at,listened_at').eq('player_id', auth.claims.sub)
        .is('listened_at', null).order('created_at').order('id').limit(1),
    ]);
    if (checkins.error) throw checkins.error;
    if (notes.error) throw notes.error;
    return { status: 'ready' as const, playerId: auth.claims.sub, intakeDone,
      checkInWeeks: (checkins.data ?? []).map(row => row.week_start),
      voiceNotes: (notes.data ?? []).map(row => ({ id: row.id, createdAt: row.created_at, listenedAt: row.listened_at })) };
  } catch (error) {
    unstable_rethrow(error);
    return { status: 'error' as const };
  }
}

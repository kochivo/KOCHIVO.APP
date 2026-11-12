'use server';

import { unstable_rethrow } from 'next/navigation';
import { rosterClient } from './client';

export async function fetchWaitingCount(): Promise<number | null> {
  try {
    const client = await rosterClient();
    const auth = await client.auth.getClaims();
    const captain = auth.data?.claims.sub;
    if (auth.error || !captain) return null;
    // Match the Follow-up inbox, including answered assessments and join requests.
    const [checks, videos, assessments, joins] = await Promise.all([
      client.from('check_ins').select('id', { count: 'exact', head: true }).eq('captain_id', captain).is('reviewed_at', null),
      client.from('form_checks').select('id', { count: 'exact', head: true }).eq('captain_id', captain).is('reviewed_at', null),
      client.from('form_requests').select('id', { count: 'exact', head: true }).eq('captain_id', captain)
        .not('answered_at', 'is', null).is('reviewed_at', null),
      client.rpc('pending_coach_join_requests'),
    ]);
    if (checks.error || videos.error || assessments.error || joins.error
      || checks.count === null || videos.count === null || assessments.count === null || !joins.data) return null;
    return checks.count + videos.count + assessments.count + joins.data.length;
  } catch (error) { unstable_rethrow(error); return null; }
}

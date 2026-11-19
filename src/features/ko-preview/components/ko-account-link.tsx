import 'server-only';
import { headers } from 'next/headers';
import { supabaseServer } from '@/core/supabase/server';
import { koPilotAvailable, koTeaserEnabled } from '@/features/ko-entry/server';
import { KoAccountWidget } from './ko-account-widget';
import { KoTeaser } from './ko-teaser';

export async function KoAccountLink({ player = false }: { player?: boolean }) {
  const pilot = await koPilotAvailable();
  if (!pilot && !koTeaserEnabled()) return null;
  if (player) {
    const path = (await headers()).get('x-kochivo-path') ?? '';
    if (/^\/player\/(?:workout|onboarding)(?:\/|$)/.test(path)) return null;
  }
  const role = player ? 'player' : 'captain';
  const db = await supabaseServer();
  const { data, error } = await db.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId || data.claims.is_anonymous === true) return null;
  if (pilot) return <KoAccountWidget role={role} userId={userId} />;
  const waitlist = await db.from('ko_waitlist').select('user_id').eq('user_id', userId).maybeSingle();
  return <KoTeaser role={role} userId={userId} joined={Boolean(waitlist.data)} readFailed={Boolean(waitlist.error)} />;
}

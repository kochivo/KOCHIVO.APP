'use server';
import { supabaseServer } from '@/core/supabase/server';
import { demoExpiry } from './demo-profile';

export async function loadDemoExpiry(): Promise<string | null> {
  return (await loadDemoProfile()).expiresAt;
}

export async function loadDemoProfile(): Promise<{ expiresAt: string | null; role: 'captain' | 'player' }> {
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error('Demo profile session unavailable');
  const profile = await client.from('profiles').select('*').eq('id', auth.data.claims.sub).single();
  if (profile.error || !profile.data) throw new Error('Demo profile unavailable');
  return { expiresAt: demoExpiry(profile.data), role: profile.data.role === 'captain' ? 'captain' : 'player' };
}

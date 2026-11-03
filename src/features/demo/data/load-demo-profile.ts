'use server';
import { supabaseServer } from '@/core/supabase/server';
import { demoExpiry } from './demo-profile';

export async function loadDemoExpiry(): Promise<string | null> {
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Demo profile session unavailable');
  const profile = await client.from('profiles').select('*').eq('id', auth.data.user.id).single();
  if (profile.error || !profile.data) throw new Error('Demo profile unavailable');
  return demoExpiry(profile.data);
}

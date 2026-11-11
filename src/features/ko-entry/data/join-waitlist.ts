import { supabaseBrowser } from '@/core/supabase/browser';
import type { KoRole } from '@/features/ko-core';

export async function joinWaitlist(userId: string, role: KoRole): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().from('ko_waitlist').insert({ user_id: userId, role });
    return !error || error.code === '23505';
  } catch {
    return false;
  }
}

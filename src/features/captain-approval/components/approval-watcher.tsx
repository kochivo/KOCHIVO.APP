'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

const INTERVAL = 30_000;

export async function approvedNow(): Promise<boolean> {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.rpc('my_approval_route_profile');
  return !error && data?.[0]?.captain_status === 'approved';
}

// The approval happens on another device, so the waiting screen checks when the app comes back and every 30s.
export function ApprovalWatcher() {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try { if (await approvedNow()) router.replace('/captain'); }
      catch { /* Offline or signed out: the next check retries. */ }
      finally { busy = false; }
    };
    const timer = setInterval(() => void check(), INTERVAL);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [router]);
  return null;
}

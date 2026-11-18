'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import { useRouter } from 'next/navigation';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

const INTERVAL = 30_000;

export async function approvedNow(): Promise<boolean> {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.rpc('my_approval_route_profile');
  if (error) throw error;
  return data?.[0]?.captain_status === 'approved';
}

// The approval happens on another device, so the waiting screen checks when the app comes back and every 30s.
export function ApprovalWatcher() {
  const router = useRouter();
  const t = useT(messages);
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const check = useCallback(async () => {
    if (busy.current || document.visibilityState !== 'visible') return;
    busy.current = true;
    setChecking(true);
    try {
      const approved = await approvedNow();
      setFailed(false);
      if (approved) router.replace('/captain');
    } catch { setFailed(true); }
    finally { busy.current = false; setChecking(false); }
  }, [router]);
  useEffect(() => {
    const timer = setInterval(() => void check(), INTERVAL);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [check]);
  return failed ? <div className="space-y-stack">
    <p role="alert" className="text-sm text-danger">{t('checkFailed')}</p>
    <Button variant="secondary" block={false} aria-disabled={checking} aria-busy={checking} onClick={() => void check()}>{t('retry')}</Button>
  </div> : null;
}

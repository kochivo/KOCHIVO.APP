'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { LanguageSwitch } from '@/ui/language-switch';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { clearDeviceCache, closeDeviceDb, finalDeviceSync } from '@/core/pwa/clear-device';
import { signOutDevice } from '@/core/pwa/device-sign-out';

export function DemoBanner({ hours, role = 'captain' }: { hours: number; role?: 'captain' | 'player' }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <aside className="glass-strong mb-4 flex flex-wrap items-center justify-between gap-x-4 rounded-control px-4 text-sm" aria-label={t('demoMode')}>
    <LanguageSwitch />
    {role === 'player' && <p>{t('playerDemo')}</p>}
    <p>{t('demoExpiry', { n: hours, count: formatNumber(hours, locale) })}</p>
    <Link href="/login?tab=signup" aria-disabled={pending} className="flex min-h-12 items-center font-bold text-lime" onClick={async (event) => {
      event.preventDefault();
      if (pending) return;
      setPending(true); setError('');
      try {
        await signOutDevice({
          push: async signal => (await import('@/features/notifications')).unsubscribeDevicePush(signal),
          sync: finalDeviceSync,
          auth: async () => {
            const result = await (await loadSupabaseBrowser()).auth.signOut();
            if (result.error) throw result.error;
          },
          cache: clearDeviceCache, close: closeDeviceDb,
        });
        router.push('/login?tab=signup');
        router.refresh();
      } catch { setError(t('couldnTLeaveTheDemoTry')); setPending(false); }
    }}>{pending ? t('signingOut') : t('createYourAccount')}</Link>
    {error && <p role="alert" className="w-full pb-3 text-danger">{error}</p>}
  </aside>;
}

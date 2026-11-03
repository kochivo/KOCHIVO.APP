'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { LanguageSwitch } from '@/ui/language-switch';
import { intlLocale } from '@/core/i18n/locale';
import { messages } from '../messages';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/core/supabase/browser';

export function DemoBanner({ hours }: { hours: number }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <aside className="glass-strong mb-4 flex flex-wrap items-center justify-between gap-x-4 rounded-control px-4 text-sm" aria-label={t('demoMode')}>
    <LanguageSwitch />
    <p>{t('demoExpiry', { n: hours, count: new Intl.NumberFormat(intlLocale(locale)).format(hours) })}</p>
    <Link href="/login?tab=signup" aria-disabled={pending} className="flex min-h-12 items-center font-bold text-lime" onClick={async (event) => {
      event.preventDefault();
      if (pending) return;
      setPending(true); setError('');
      try {
        const result = await supabaseBrowser().auth.signOut();
        if (result.error) throw result.error;
        router.push('/login?tab=signup');
        router.refresh();
      } catch { setError(t('couldnTLeaveTheDemoTry')); setPending(false); }
    }}>{pending ? t('signingOut') : t('createYourAccount')}</Link>
    {error && <p role="alert" className="w-full pb-3 text-danger">{error}</p>}
  </aside>;
}

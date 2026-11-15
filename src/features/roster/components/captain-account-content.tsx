'use client';

import Link from 'next/link';
import { CreditCard, Settings } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { buttonClass } from '@/ui/button';
import { accountMessages } from './captain-account-messages';

export function CaptainAccountContent({ onNavigate }: { onNavigate: () => void }) {
  const t = useT(accountMessages);
  const linkClass = buttonClass({ variant: 'secondary', block: false });
  return <nav aria-label={t('accountMenu')} className="flex flex-col gap-inline">
    <Link href="/captain/settings" onClick={onNavigate} className={linkClass}>
      <Settings className="size-5 text-muted" aria-hidden="true" />{t('settings')}
    </Link>
    <Link href="/captain/billing" onClick={onNavigate} className={linkClass}>
      <CreditCard className="size-5 text-muted" aria-hidden="true" />{t('subscriptions')}
    </Link>
  </nav>;
}
